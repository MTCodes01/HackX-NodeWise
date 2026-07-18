from typing import Dict, List, Any, Optional
from app.schemas.models import MachineTelemetry, EnergyTelemetry, VisionEvent, AnomalyEvidence, UnifiedIncident, OperatorRecommendation

class InMemoryDB:
    def __init__(self):
        self.machine_history: Dict[str, List[MachineTelemetry]] = {}
        self.energy_history: Dict[str, List[EnergyTelemetry]] = {}
        self.vision_history: List[VisionEvent] = []
        self.anomalies: List[AnomalyEvidence] = []
        self.incidents: List[UnifiedIncident] = []
        self.recommendations: Dict[str, OperatorRecommendation] = {}
        # Persistent UI State
        self.ui_machines: List[Dict[str, Any]] = []
        self.ui_created_work_orders: List[int] = []
        self.ui_completed_work_orders: List[str] = []

    def clear(self):
        """Reset all data in the database (useful for running clean demo scenarios)."""
        self.machine_history.clear()
        self.energy_history.clear()
        self.vision_history.clear()
        self.anomalies.clear()
        self.incidents.clear()
        self.recommendations.clear()
        self.ui_machines.clear()
        self.ui_created_work_orders.clear()
        self.ui_completed_work_orders.clear()

    def add_machine_telemetry(self, telemetry: MachineTelemetry):
        m_id = telemetry.machine_id
        if m_id not in self.machine_history:
            self.machine_history[m_id] = []
        self.machine_history[m_id].append(telemetry)

    def add_energy_telemetry(self, telemetry: EnergyTelemetry):
        m_id = telemetry.meter_id
        if m_id not in self.energy_history:
            self.energy_history[m_id] = []
        self.energy_history[m_id].append(telemetry)

    def add_vision_event(self, event: VisionEvent):
        self.vision_history.append(event)

    def get_machine_history(self, machine_id: str, limit: Optional[int] = None) -> List[MachineTelemetry]:
        history = self.machine_history.get(machine_id, [])
        if limit:
            return history[-limit:]
        return history

    def get_energy_history(self, meter_id: str, limit: Optional[int] = None) -> List[EnergyTelemetry]:
        history = self.energy_history.get(meter_id, [])
        if limit:
            return history[-limit:]
        return history

# Global database instance
db = InMemoryDB()
