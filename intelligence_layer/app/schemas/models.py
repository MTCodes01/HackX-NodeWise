from pydantic import BaseModel, Field, ConfigDict
from pydantic.alias_generators import to_camel
from typing import List, Optional, Dict, Any

# Raw Ingestion Models
class MachineTelemetry(BaseModel):
    timestamp: str = Field(..., description="ISO 8601 or simple HH:MM:SS timestamp")
    machine_id: str
    line_id: str
    vibration: float
    temperature: float
    rpm: float
    status: str  # e.g., "OPERATIONAL", "IDLE", "DEGRADED"

class EnergyTelemetry(BaseModel):
    timestamp: str
    meter_id: str
    line_id: str
    power_kw: float
    energy_kwh: float
    current: float
    baseline_power: float

class VisionEvent(BaseModel):
    timestamp: str
    camera_id: str
    line_id: str
    nearby_machine_id: str
    event_type: str  # e.g., "restricted_zone_proximity", "no_ppe"
    confidence: float
    severity: str  # "low", "medium", "high"

# Core Models
class AnomalyEvidence(BaseModel):
    anomaly_id: str
    domain: str  # "machine", "energy", "vision"
    machine_id: Optional[str] = None
    line_id: str
    metric: str
    current_value: float
    baseline: float
    deviation_pct: float
    method: str
    severity: str
    timestamp: str

class UnifiedIncident(BaseModel):
    incident_id: str
    asset: str
    line: str
    start_time: str
    priority: str  # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    correlation_score: float
    verified_evidence: List[AnomalyEvidence]
    detection_summary: str

# Gemini / Explainable AI Models
class ProbableCause(BaseModel):
    cause: str
    confidence: str  # "low", "medium", "high"
    basis: List[str]

class RecommendedAction(BaseModel):
    action: str
    timeline: str

class OperatorRecommendation(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )
    incident_id: str
    summary: str
    probable_causes: List[ProbableCause]
    recommended_actions: List[RecommendedAction]
    operator_explanation: str
    estimated_impact: str
    limitations: str
