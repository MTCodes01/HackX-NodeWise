import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query, WebSocket, WebSocketDisconnect
import json
import asyncio
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional

from app.schemas.models import (
    MachineTelemetry, EnergyTelemetry, VisionEvent,
    AnomalyEvidence, UnifiedIncident, OperatorRecommendation
)
from app.database import db
from app.simulator import simulate_tick, run_mechanical_scenario, run_safety_scenario, run_false_spike_scenario
from app.services.vision import process_frame
from app.services.gemini import generate_operator_recommendation

app = FastAPI(
    title="ForgeMind OPTIMUS Intelligence Layer",
    description="Statistical, Unsupervised ML & Explainable GenAI Layer for Factory Telemetry",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "OPTIMUS Intelligence Layer",
        "endpoints": {
            "docs": "/docs",
            "ingest_machine": "/api/ingest/machine",
            "ingest_energy": "/api/ingest/energy",
            "ingest_vision": "/api/ingest/vision",
            "upload_frame": "/api/vision/process-frame",
            "anomalies": "/api/anomalies",
            "incidents": "/api/incidents",
            "recommendation": "/api/recommendations/{incident_id}",
            "trigger_simulator": "/api/simulator/trigger",
            "ws_telemetry": "/ws/telemetry"
        }
    }

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            payload_type = data.get("type")
            payload = data.get("payload")
            
            if payload_type == "machine":
                telemetry = MachineTelemetry(**payload)
                data_dict = telemetry.model_dump()
                latest_energy_list = [h[-1] for h in db.energy_history.values() if h]
                if latest_energy_list:
                    matching = [e for e in latest_energy_list if e.line_id == telemetry.line_id]
                    energy_data = (matching[0] if matching else latest_energy_list[0]).model_dump()
                else:
                    energy_data = {
                        "timestamp": telemetry.timestamp,
                        "meter_id": f"METER-{telemetry.machine_id}",
                        "line_id": telemetry.line_id,
                        "power_kw": 95.0,
                        "energy_kwh": 1000.0,
                        "current": 12.0,
                        "baseline_power": 95.0
                    }
                simulate_tick(data_dict, energy_data)
                
            elif payload_type == "energy":
                telemetry = EnergyTelemetry(**payload)
                data_dict = telemetry.model_dump()
                latest_machine_list = [h[-1] for h in db.machine_history.values() if h]
                if latest_machine_list:
                    matching = [m for m in latest_machine_list if m.line_id == telemetry.line_id]
                    machine_data = (matching[0] if matching else latest_machine_list[0]).model_dump()
                else:
                    machine_data = {
                        "timestamp": telemetry.timestamp,
                        "machine_id": "UNKNOWN",
                        "line_id": telemetry.line_id,
                        "vibration": 1.8,
                        "temperature": 36.5,
                        "rpm": 1200.0,
                        "status": "OPERATIONAL"
                    }
                simulate_tick(machine_data, data_dict)
            
            # Broadcast the full DB state back to the client
            # The dashboard expects anomalies and incidents
            await websocket.send_json({
                "type": "update",
                "anomalies": [a.model_dump() for a in db.anomalies],
                "incidents": [i.model_dump() for i in db.incidents]
            })
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WS Error: {e}")
        manager.disconnect(websocket)

@app.post("/api/ingest/machine", response_model=Dict[str, Any])
def ingest_machine(telemetry: MachineTelemetry):
    """
    Ingests raw machine telemetry. Computes rolling statistics, checks for
    anomalies, runs the correlation engine, and returns findings.
    """
    try:
        # Convert Pydantic model to dict
        data_dict = telemetry.model_dump()
        
        # We need energy data for simulate_tick, or we use a fallback if not ingested yet
        # Since we simulate tick-by-tick, we can fetch the latest energy reading from DB
        # or create a mock normal reading if none exists.
        latest_energy_list = []
        for meter_id, hist in db.energy_history.items():
            if hist:
                latest_energy_list.append(hist[-1])
                
        if latest_energy_list:
            # Match by line_id if possible
            matching = [e for e in latest_energy_list if e.line_id == telemetry.line_id]
            energy_data = (matching[0] if matching else latest_energy_list[0]).model_dump()
        else:
            # Create a normal baseline reading if none exists
            energy_data = {
                "timestamp": telemetry.timestamp,
                "meter_id": f"METER-{telemetry.machine_id}",
                "line_id": telemetry.line_id,
                "power_kw": 95.0,
                "energy_kwh": 1000.0,
                "current": 12.0,
                "baseline_power": 95.0
            }
            
        anoms, incidents = simulate_tick(data_dict, energy_data)
        
        return {
            "status": "success",
            "anomalies_detected": [a.model_dump() for a in anoms],
            "active_incidents": [inc.model_dump() for inc in incidents]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ingest/energy", response_model=Dict[str, Any])
def ingest_energy(telemetry: EnergyTelemetry):
    """
    Ingests raw energy telemetry. Checks for anomalies, runs correlation,
    and returns findings.
    """
    try:
        data_dict = telemetry.model_dump()
        
        # Match with latest machine reading
        latest_machine_list = []
        for machine_id, hist in db.machine_history.items():
            if hist:
                latest_machine_list.append(hist[-1])
                
        if latest_machine_list:
            matching = [m for m in latest_machine_list if m.line_id == telemetry.line_id]
            machine_data = (matching[0] if matching else latest_machine_list[0]).model_dump()
        else:
            machine_data = {
                "timestamp": telemetry.timestamp,
                "machine_id": "UNKNOWN",
                "line_id": telemetry.line_id,
                "vibration": 1.8,
                "temperature": 36.5,
                "rpm": 1200.0,
                "status": "OPERATIONAL"
            }
            
        anoms, incidents = simulate_tick(machine_data, data_dict)
        
        return {
            "status": "success",
            "anomalies_detected": [a.model_dump() for a in anoms],
            "active_incidents": [inc.model_dump() for inc in incidents]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ingest/vision", response_model=Dict[str, Any])
def ingest_vision(event: VisionEvent):
    """
    Ingests structured safety events (e.g. from an edge camera or pre-computed event generator).
    Feeds them into the correlation engine and returns updated incidents.
    """
    try:
        # Create normal telemetry to simulate a tick
        # Match with latest machine/energy readings
        latest_machine_list = []
        for machine_id, hist in db.machine_history.items():
            if hist:
                latest_machine_list.append(hist[-1])
                
        if latest_machine_list:
            matching = [m for m in latest_machine_list if m.machine_id == event.nearby_machine_id]
            machine_data = (matching[0] if matching else latest_machine_list[0]).model_dump()
        else:
            machine_data = {
                "timestamp": event.timestamp,
                "machine_id": event.nearby_machine_id,
                "line_id": event.line_id,
                "vibration": 1.8,
                "temperature": 36.5,
                "rpm": 1200.0,
                "status": "OPERATIONAL"
            }
            
        latest_energy_list = []
        for meter_id, hist in db.energy_history.items():
            if hist:
                latest_energy_list.append(hist[-1])
                
        if latest_energy_list:
            matching = [e for e in latest_energy_list if e.line_id == event.line_id]
            energy_data = (matching[0] if matching else latest_energy_list[0]).model_dump()
        else:
            energy_data = {
                "timestamp": event.timestamp,
                "meter_id": f"METER-{event.nearby_machine_id}",
                "line_id": event.line_id,
                "power_kw": 95.0,
                "energy_kwh": 1000.0,
                "current": 12.0,
                "baseline_power": 95.0
            }
            
        anoms, incidents = simulate_tick(machine_data, energy_data, event.model_dump())
        
        return {
            "status": "success",
            "anomalies_detected": [a.model_dump() for a in anoms],
            "active_incidents": [inc.model_dump() for inc in incidents]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/vision/process-frame", response_model=Dict[str, Any])
async def upload_frame(
    file: UploadFile = File(...),
    camera_id: str = Form("CAM-01"),
    line_id: str = Form("LINE-A"),
    nearby_machine_id: str = Form("CNC-04"),
    timestamp: str = Form("14:45:00")
):
    """
    Accepts an uploaded image/frame, decodes it, runs YOLOv11 person detection,
    and checks if the person is inside the OpenCV restricted polygon.
    If yes, creates a safety event and feeds it to the correlation engine.
    """
    try:
        # Read uploaded image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image file uploaded.")
            
        # Run vision frame processing
        event = process_frame(frame, camera_id, timestamp, line_id, nearby_machine_id)
        
        if event:
            # We found a violation! Run ingestion to trigger correlation
            # We fetch latest machine/energy data for context
            latest_m_list = [h[-1] for h in db.machine_history.values() if h]
            latest_e_list = [h[-1] for h in db.energy_history.values() if h]
            
            m_data = latest_m_list[0].model_dump() if latest_m_list else {
                "timestamp": timestamp, "machine_id": nearby_machine_id, "line_id": line_id,
                "vibration": 1.8, "temperature": 36.5, "rpm": 1200.0, "status": "OPERATIONAL"
            }
            e_data = latest_e_list[0].model_dump() if latest_e_list else {
                "timestamp": timestamp, "meter_id": f"METER-{nearby_machine_id}", "line_id": line_id,
                "power_kw": 95.0, "energy_kwh": 1000.0, "current": 12.0, "baseline_power": 95.0
            }
            
            anoms, incidents = simulate_tick(m_data, e_data, event.model_dump())
            
            return {
                "violation_detected": True,
                "event": event.model_dump(),
                "anomalies_detected": [a.model_dump() for a in anoms],
                "active_incidents": [inc.model_dump() for inc in incidents]
            }
            
        return {
            "violation_detected": False,
            "message": "No safety violation detected in the frame."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/anomalies", response_model=List[AnomalyEvidence])
def get_anomalies(domain: Optional[str] = None):
    """Returns all logged anomalies, optionally filtered by domain."""
    if domain:
        return [a for a in db.anomalies if a.domain == domain]
    return db.anomalies

@app.get("/api/incidents", response_model=List[UnifiedIncident])
def get_incidents():
    """Returns all generated incidents."""
    return db.incidents

@app.get("/api/incidents/machine/{machine_id}", response_model=List[UnifiedIncident])
def get_incidents_by_machine(machine_id: str):
    """
    Returns all incidents for a specific machine asset ID.
    Used by the frontend machine modal to show per-machine maintenance history
    and to pre-filter the Maintenance tab view.
    """
    matching = [inc for inc in db.incidents if inc.asset.lower() == machine_id.lower()]
    return matching

@app.get("/api/recommendations/{incident_id}", response_model=OperatorRecommendation)
def get_recommendation(incident_id: str):
    """
    Retrieves the operator recommendation for a specific incident.
    If cached, returns it; otherwise, requests it from Gemini.
    """
    # Find incident in DB
    matching = [inc for inc in db.incidents if inc.incident_id == incident_id]
    if not matching:
        raise HTTPException(status_code=404, detail="Incident not found.")
        
    incident = matching[0]
    
    # Check if recommendation is already cached
    if incident_id in db.recommendations:
        return db.recommendations[incident_id]
        
    # Generate new recommendation
    rec = generate_operator_recommendation(incident)
    db.recommendations[incident_id] = rec
    return rec

@app.post("/api/simulator/trigger", response_model=Dict[str, Any])
def trigger_simulator(payload: Dict[str, str]):
    """
    Triggers one of the three pre-defined simulation scenarios:
    1. mechanical
    2. safety
    3. false_spike
    Optionally pass a 'machine_id' (e.g. 'CNC-04') in the payload.
    """
    scenario = payload.get("scenario", "").lower()
    machine_id = payload.get("machine_id", "CNC-04")
    
    if scenario == "mechanical":
        return run_mechanical_scenario(machine_id)
    elif scenario == "safety":
        return run_safety_scenario(machine_id)
    elif scenario == "false_spike":
        return run_false_spike_scenario(machine_id)
    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid scenario. Choose 'mechanical', 'safety', or 'false_spike'."
        )

@app.post("/api/simulator/reset")
def reset_simulator():
    """Clears the in-memory database history, anomalies, and incidents."""
    db.clear()
    return {"status": "success", "message": "In-memory database reset successfully."}

@app.get("/api/system/state", response_model=Dict[str, Any])
def get_system_state():
    """Returns the persistent UI state."""
    return {
        "machines": db.ui_machines,
        "created_work_orders": db.ui_created_work_orders,
        "completed_work_orders": db.ui_completed_work_orders
    }

@app.post("/api/machines", response_model=Dict[str, Any])
def add_machine(machine: Dict[str, Any]):
    """Registers a new machine in the UI state."""
    db.ui_machines.append(machine)
    return {"status": "success", "machine": machine}

@app.post("/api/maintenance/work-order", response_model=Dict[str, Any])
def handle_work_order(payload: Dict[str, Any]):
    """Handles creating or completing a work order."""
    action = payload.get("action")
    data = payload.get("data")
    if action == "create":
        db.ui_created_work_orders.append(data)
    elif action == "complete":
        db.ui_completed_work_orders.append(data)
    return {"status": "success"}
