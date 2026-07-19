import time
from typing import Dict, Any, List, Optional
from app.database import db
from app.schemas.models import MachineTelemetry, EnergyTelemetry, VisionEvent
from app.processors.anomaly_det import detect_machine_anomalies, detect_energy_anomalies
from app.processors.correlation import correlate_anomalies
from app.services.gemini import generate_operator_recommendation

def simulate_tick(
    machine_data: Dict[str, Any],
    energy_data: Dict[str, Any],
    vision_event: Optional[Dict[str, Any]] = None
) -> tuple[List[Any], List[Any]]:
    """
    Simulates a single tick of data ingestion.
    Appends to database history, triggers anomaly detection,
    runs correlation engine, and generates/updates incidents.
    """
    # 1. Ingest Raw Telemetry
    m_tel = MachineTelemetry(**machine_data)
    e_tel = EnergyTelemetry(**energy_data)
    
    db.add_machine_telemetry(m_tel)
    db.add_energy_telemetry(e_tel)
    
    # 2. Run Feature Engineering & Anomaly Detection
    m_history = db.get_machine_history(m_tel.machine_id)
    e_history = db.get_energy_history(e_tel.meter_id)
    
    new_anomalies = []
    new_anomalies.extend(detect_machine_anomalies(m_history))
    new_anomalies.extend(detect_energy_anomalies(e_history))
    
    # 3. Ingest Vision Event if present
    if vision_event:
        v_event = VisionEvent(**vision_event)
        db.add_vision_event(v_event)
        
        # Vision events are treated as immediate anomalies
        from app.schemas.models import AnomalyEvidence
        import uuid
        vision_anom = AnomalyEvidence(
            anomaly_id=f"A-V-{uuid.uuid4().hex[:6].upper()}",
            domain="vision",
            machine_id=v_event.nearby_machine_id,
            line_id=v_event.line_id,
            metric=v_event.event_type,
            current_value=v_event.confidence,
            baseline=0.0,
            deviation_pct=v_event.confidence * 100.0,
            method="yolov11+opencv",
            severity=v_event.severity,
            timestamp=v_event.timestamp
        )
        new_anomalies.append(vision_anom)
        
    # Append detected anomalies to database
    db.add_anomalies(new_anomalies)
        
    # 4. Run Correlation Engine
    # Get currently uncorrelated anomalies from db (anomalies not in any incident evidence)
    current_incidents = db.get_incidents()
    current_anomalies = db.get_anomalies()
    correlated_ids = {ev.anomaly_id for inc in current_incidents for ev in inc.verified_evidence}
    uncorrelated_anomalies = [a for a in current_anomalies if a.anomaly_id not in correlated_ids]
    
    # Run correlation
    updated_incidents, uncorrelated_rem = correlate_anomalies(
        new_anomalies=new_anomalies,
        existing_incidents=current_incidents,
        all_uncorrelated_anomalies=uncorrelated_anomalies
    )
    
    # Update db incidents
    db.update_incidents(updated_incidents)
    
    return new_anomalies, updated_incidents

def _generate_recommendations_for_active_incidents():
    """Generates Gemini operator recommendations once at the end of simulation."""
    current_incidents = db.get_incidents()
    current_recs = db.get_recommendations()
    for inc in current_incidents:
        if inc.incident_id not in current_recs:
            rec = generate_operator_recommendation(inc)
            db.add_recommendation(inc.incident_id, rec)


def run_mechanical_scenario(machine_id: str = "CNC-04") -> Dict[str, Any]:
    """
    Scenario 1: Gradual mechanical wear.
    Vibration & temperature rise, power increases.
    """
    ticks = 15
    all_new_anomalies = []
    
    for i in range(ticks):
        # Time string proxy
        timestamp = f"14:{30+i:02d}:00"
        
        # Normal behavior for first 7 ticks
        if i < 7:
            vib = 1.8 + (i * 0.05)
            temp = 36.5 + (i * 0.2)
            power = 95.0 + (i * 0.5)
            curr = 12.0
            status = "OPERATIONAL"
        # Degradation starts
        elif i < 11:
            vib = 2.8 + (i - 7) * 0.4
            temp = 42.0 + (i - 7) * 2.0
            power = 105.0 + (i - 7) * 4.0
            curr = 14.5
            status = "WARNING"
        # Spindle wear peak / high anomalies
        else:
            vib = 6.2 + (i - 11) * 0.3
            temp = 58.5 + (i - 11) * 1.5
            power = 132.0 + (i - 11) * 2.0
            curr = 19.8
            status = "DEGRADED"
            
        machine_tick = {
            "timestamp": timestamp,
            "machine_id": machine_id,
            "line_id": "LINE-A",
            "vibration": float(vib),
            "temperature": float(temp),
            "rpm": 1200.0 if status != "DEGRADED" else 1050.0,
            "status": status
        }
        
        energy_tick = {
            "timestamp": timestamp,
            "meter_id": f"METER-{machine_id.upper()}",
            "line_id": "LINE-A",
            "power_kw": float(power),
            "energy_kwh": 4820.0 + (i * 0.8),
            "current": float(curr),
            "baseline_power": 95.0
        }
        
        anoms, _ = simulate_tick(machine_tick, energy_tick)
        all_new_anomalies.extend(anoms)
        
    _generate_recommendations_for_active_incidents()
    return {
        "status": "completed",
        "anomalies_detected": len(db.anomalies),
        "incidents_created": len(db.incidents),
        "incidents": [inc.model_dump() for inc in db.incidents],
        "recommendations": {k: v.model_dump() for k, v in db.recommendations.items()}
    }

def run_safety_scenario(machine_id: str = "CNC-04") -> Dict[str, Any]:
    """
    Scenario 2: Mechanical degradation coupled with restricted zone entry.
    """
    ticks = 15
    
    for i in range(ticks):
        timestamp = f"14:{30+i:02d}:00"
        
        # Mechanical degradation (same as Scenario 1)
        if i < 7:
            vib = 1.8 + (i * 0.05)
            temp = 36.5 + (i * 0.2)
            power = 95.0 + (i * 0.5)
            curr = 12.0
            status = "OPERATIONAL"
        elif i < 11:
            vib = 2.8 + (i - 7) * 0.4
            temp = 42.0 + (i - 7) * 2.0
            power = 105.0 + (i - 7) * 4.0
            curr = 14.5
            status = "WARNING"
        else:
            vib = 6.2 + (i - 11) * 0.3
            temp = 58.5 + (i - 11) * 1.5
            power = 132.0 + (i - 11) * 2.0
            curr = 19.8
            status = "DEGRADED"
            
        machine_tick = {
            "timestamp": timestamp,
            "machine_id": machine_id,
            "line_id": "LINE-A",
            "vibration": float(vib),
            "temperature": float(temp),
            "rpm": 1200.0 if status != "DEGRADED" else 1050.0,
            "status": status
        }
        
        energy_tick = {
            "timestamp": timestamp,
            "meter_id": f"METER-{machine_id.upper()}",
            "line_id": "LINE-A",
            "power_kw": float(power),
            "energy_kwh": 4820.0 + (i * 0.8),
            "current": float(curr),
            "baseline_power": 95.0
        }
        
        # At tick 12, a person is detected in the restricted zone on camera CAM-01
        vision_event = None
        if i == 12:
            vision_event = {
                "timestamp": timestamp,
                "camera_id": "CAM-01",
                "line_id": "LINE-A",
                "nearby_machine_id": machine_id,
                "event_type": "restricted_zone_proximity",
                "confidence": 0.92,
                "severity": "high"
            }
            
        simulate_tick(machine_tick, energy_tick, vision_event)
        
    _generate_recommendations_for_active_incidents()
    return {
        "status": "completed",
        "anomalies_detected": len(db.anomalies),
        "incidents_created": len(db.incidents),
        "incidents": [inc.model_dump() for inc in db.incidents],
        "recommendations": {k: v.model_dump() for k, v in db.recommendations.items()}
    }

def run_false_spike_scenario(machine_id: str = "CNC-04") -> Dict[str, Any]:
    """
    Scenario 3: Single vibration spike that does NOT persist.
    Should NOT generate a high-priority incident (proves filtering).
    """
    ticks = 10
    
    for i in range(ticks):
        timestamp = f"14:{30+i:02d}:00"
        
        # Baseline normal values
        vib = 1.8
        temp = 36.5
        power = 95.0
        curr = 12.0
        status = "OPERATIONAL"
        
        # Single spike at tick 4
        if i == 4:
            vib = 6.8  # Huge spike
            status = "WARNING"
            
        machine_tick = {
            "timestamp": timestamp,
            "machine_id": machine_id,
            "line_id": "LINE-A",
            "vibration": float(vib),
            "temperature": float(temp),
            "rpm": 1200.0,
            "status": status
        }
        
        energy_tick = {
            "timestamp": timestamp,
            "meter_id": f"METER-{machine_id.upper()}",
            "line_id": "LINE-A",
            "power_kw": float(power),
            "energy_kwh": 4820.0 + (i * 0.8),
            "current": float(curr),
            "baseline_power": 95.0
        }
        
        simulate_tick(machine_tick, energy_tick)
        
    _generate_recommendations_for_active_incidents()
    return {
        "status": "completed",
        "anomalies_detected": len(db.anomalies),
        "incidents_created": len(db.incidents),
        "incidents": [inc.model_dump() for inc in db.incidents],
        "recommendations": {k: v.model_dump() for k, v in db.recommendations.items()}
    }
