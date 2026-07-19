import json
import sqlite3
import os
from typing import Dict, List, Any, Optional
from pydantic import TypeAdapter
from app.schemas.models import MachineTelemetry, EnergyTelemetry, VisionEvent, AnomalyEvidence, UnifiedIncident, OperatorRecommendation

class SQLiteDB:
    def __init__(self, db_path="factory.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Key-Value store for simple UI state
            cursor.execute('''CREATE TABLE IF NOT EXISTS ui_state (
                key TEXT PRIMARY KEY,
                value TEXT
            )''')
            
            # Telemetry Tables
            cursor.execute('''CREATE TABLE IF NOT EXISTS machine_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                machine_id TEXT,
                timestamp TEXT,
                data_json TEXT
            )''')
            
            cursor.execute('''CREATE TABLE IF NOT EXISTS energy_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meter_id TEXT,
                timestamp TEXT,
                data_json TEXT
            )''')
            
            cursor.execute('''CREATE TABLE IF NOT EXISTS vision_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                camera_id TEXT,
                timestamp TEXT,
                data_json TEXT
            )''')
            
            # Incident & Anomaly Tables
            cursor.execute('''CREATE TABLE IF NOT EXISTS anomalies (
                anomaly_id TEXT PRIMARY KEY,
                domain TEXT,
                timestamp TEXT,
                data_json TEXT
            )''')
            
            cursor.execute('''CREATE TABLE IF NOT EXISTS incidents (
                incident_id TEXT PRIMARY KEY,
                timestamp TEXT,
                data_json TEXT
            )''')
            
            cursor.execute('''CREATE TABLE IF NOT EXISTS recommendations (
                incident_id TEXT PRIMARY KEY,
                data_json TEXT
            )''')
            
            conn.commit()
            
            # Seed initial UI values if not present
            if not self._get_ui_state("kpis"):
                self._set_ui_state("kpis", {
                    "oee": "87.4%", "active_machines_ratio": "0/0", "total_energy": "342.1 kW",
                    "safety_incidents": "1", "cost_savings": "$12,450", "carbon_footprint": "4.2 Tons"
                })
            if not self._get_ui_state("production_output"):
                self._set_ui_state("production_output", [
                    {"day": "Mon", "val": 40}, {"day": "Tue", "val": 55}, {"day": "Wed", "val": 48},
                    {"day": "Thu", "val": 65}, {"day": "Fri", "val": 75}, {"day": "Sat", "val": 70},
                    {"day": "Sun", "val": 85}
                ])
            if not self._get_ui_state("system_health"):
                self._set_ui_state("system_health", [
                    {"label": "Network Latency", "val": "24ms", "perc": 85, "color": "#10b981"},
                    {"label": "Storage Array", "val": "78%", "perc": 78, "color": "#3b82f6"},
                    {"label": "Edge CPU Load", "val": "42%", "perc": 42, "color": "#10b981"}
                ])
            if not self._get_ui_state("recent_activity"):
                self._set_ui_state("recent_activity", [
                    {"time": "10 min ago", "user": "System Auto", "action": "Detected critical vibration on CNC-04.", "icon": "AlertTriangle"},
                    {"time": "1 hour ago", "user": "Operator_02", "action": "Acknowledged temperature warning.", "icon": "CheckCircle"},
                    {"time": "Yesterday", "user": "Tech Team", "action": "Resolved maintenance ticket WO-8831.", "icon": "Wrench"}
                ])
            if not self._get_ui_state("machines"):
                self._set_ui_state("machines", [])
            if not self._get_ui_state("created_work_orders"):
                self._set_ui_state("created_work_orders", [])
            if not self._get_ui_state("completed_work_orders"):
                self._set_ui_state("completed_work_orders", [])

    def _get_ui_state(self, key: str) -> Optional[Any]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM ui_state WHERE key=?", (key,))
            row = cursor.fetchone()
            if row:
                return json.loads(row[0])
            return None

    def _set_ui_state(self, key: str, value: Any):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT OR REPLACE INTO ui_state (key, value) VALUES (?, ?)", (key, json.dumps(value)))
            conn.commit()

    def clear(self):
        """Reset all dynamic data in the database (useful for running clean demo scenarios)."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM machine_history")
            cursor.execute("DELETE FROM energy_history")
            cursor.execute("DELETE FROM vision_history")
            cursor.execute("DELETE FROM anomalies")
            cursor.execute("DELETE FROM incidents")
            cursor.execute("DELETE FROM recommendations")
            cursor.execute("DELETE FROM ui_state WHERE key IN ('machines', 'created_work_orders', 'completed_work_orders')")
            conn.commit()
            self._set_ui_state("machines", [])
            self._set_ui_state("created_work_orders", [])
            self._set_ui_state("completed_work_orders", [])

    def add_machine_telemetry(self, telemetry: MachineTelemetry):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO machine_history (machine_id, timestamp, data_json) VALUES (?, ?, ?)", 
                           (telemetry.machine_id, telemetry.timestamp, telemetry.model_dump_json()))
            conn.commit()

    def add_energy_telemetry(self, telemetry: EnergyTelemetry):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO energy_history (meter_id, timestamp, data_json) VALUES (?, ?, ?)", 
                           (telemetry.meter_id, telemetry.timestamp, telemetry.model_dump_json()))
            conn.commit()

    def add_vision_event(self, event: VisionEvent):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO vision_history (camera_id, timestamp, data_json) VALUES (?, ?, ?)", 
                           (event.camera_id, event.timestamp, event.model_dump_json()))
            conn.commit()

    def get_machine_history(self, machine_id: str = None, limit: Optional[int] = None) -> List[MachineTelemetry]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            query = "SELECT data_json FROM machine_history"
            params = []
            if machine_id:
                query += " WHERE machine_id=?"
                params.append(machine_id)
            query += " ORDER BY id ASC"
            cursor.execute(query, params)
            rows = cursor.fetchall()
            if limit:
                rows = rows[-limit:]
            return [MachineTelemetry.model_validate_json(r[0]) for r in rows]

    def get_latest_machine_telemetry(self) -> List[MachineTelemetry]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # SQLite window function to get the latest per machine_id
            cursor.execute('''
                SELECT data_json FROM (
                    SELECT data_json, ROW_NUMBER() OVER (PARTITION BY machine_id ORDER BY id DESC) as rn
                    FROM machine_history
                ) WHERE rn = 1
            ''')
            rows = cursor.fetchall()
            return [MachineTelemetry.model_validate_json(r[0]) for r in rows]

    def get_energy_history(self, meter_id: str = None, limit: Optional[int] = None) -> List[EnergyTelemetry]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            query = "SELECT data_json FROM energy_history"
            params = []
            if meter_id:
                query += " WHERE meter_id=?"
                params.append(meter_id)
            query += " ORDER BY id ASC"
            cursor.execute(query, params)
            rows = cursor.fetchall()
            if limit:
                rows = rows[-limit:]
            return [EnergyTelemetry.model_validate_json(r[0]) for r in rows]

    def get_latest_energy_telemetry(self) -> List[EnergyTelemetry]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT data_json FROM (
                    SELECT data_json, ROW_NUMBER() OVER (PARTITION BY meter_id ORDER BY id DESC) as rn
                    FROM energy_history
                ) WHERE rn = 1
            ''')
            rows = cursor.fetchall()
            return [EnergyTelemetry.model_validate_json(r[0]) for r in rows]

    @property
    def ui_machines(self) -> List[Dict[str, Any]]:
        return self._get_ui_state("machines") or []

    @property
    def ui_created_work_orders(self) -> List[int]:
        return self._get_ui_state("created_work_orders") or []

    @property
    def ui_completed_work_orders(self) -> List[str]:
        return self._get_ui_state("completed_work_orders") or []

    @property
    def ui_kpis(self):
        return self._get_ui_state("kpis")

    @property
    def ui_production_output(self):
        return self._get_ui_state("production_output")

    @property
    def ui_system_health(self):
        return self._get_ui_state("system_health")

    @property
    def ui_recent_activity(self):
        return self._get_ui_state("recent_activity")

    def add_ui_machine(self, machine: Dict[str, Any]):
        machines = self.ui_machines
        machines.append(machine)
        self._set_ui_state("machines", machines)

    def add_ui_created_work_order(self, data: int):
        wo = self.ui_created_work_orders
        wo.append(data)
        self._set_ui_state("created_work_orders", wo)

    def add_ui_completed_work_order(self, data: str):
        wo = self.ui_completed_work_orders
        wo.append(data)
        self._set_ui_state("completed_work_orders", wo)

    def add_anomalies(self, anomalies: List[AnomalyEvidence]):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            for anom in anomalies:
                cursor.execute("INSERT OR REPLACE INTO anomalies (anomaly_id, domain, timestamp, data_json) VALUES (?, ?, ?, ?)",
                               (anom.anomaly_id, anom.domain, anom.timestamp, anom.model_dump_json()))
            conn.commit()

    def get_anomalies(self) -> List[AnomalyEvidence]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT data_json FROM anomalies")
            rows = cursor.fetchall()
            return [AnomalyEvidence.model_validate_json(r[0]) for r in rows]

    def update_incidents(self, incidents: List[UnifiedIncident]):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Incidents fully replace or upsert
            for inc in incidents:
                cursor.execute("INSERT OR REPLACE INTO incidents (incident_id, timestamp, data_json) VALUES (?, ?, ?)",
                               (inc.incident_id, inc.start_time, inc.model_dump_json()))
            conn.commit()

    def get_incidents(self) -> List[UnifiedIncident]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT data_json FROM incidents")
            rows = cursor.fetchall()
            return [UnifiedIncident.model_validate_json(r[0]) for r in rows]

    def add_recommendation(self, incident_id: str, rec: OperatorRecommendation):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT OR REPLACE INTO recommendations (incident_id, data_json) VALUES (?, ?)",
                           (incident_id, rec.model_dump_json()))
            conn.commit()

    def get_recommendations(self) -> Dict[str, OperatorRecommendation]:
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT incident_id, data_json FROM recommendations")
            rows = cursor.fetchall()
            return {r[0]: OperatorRecommendation.model_validate_json(r[1]) for r in rows}

# Global database instance
db = SQLiteDB()
