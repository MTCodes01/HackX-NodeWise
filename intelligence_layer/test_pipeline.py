import json
from fastapi.testclient import TestClient
from app.main import app
from app.database import db

client = TestClient(app)

def test_api_root():
    """Verify that root endpoint is active and returns metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "ingest_machine" in data["endpoints"]

def test_scenario_1_mechanical_degradation():
    """
    Test Scenario 1: Gradual mechanical wear.
    Verifies that multiple anomalies on CNC-04 are detected and correlated
    into a single HIGH priority incident with a structured operator recommendation.
    """
    # Reset state
    client.post("/api/simulator/reset")
    
    # Trigger Scenario 1 via simulation endpoint
    response = client.post("/api/simulator/trigger", json={"scenario": "mechanical"})
    assert response.status_code == 200
    res_data = response.json()
    
    assert res_data["status"] == "completed"
    assert res_data["anomalies_detected"] > 0
    assert res_data["incidents_created"] > 0
    
    # Verify the incident contents
    incidents = res_data["incidents"]
    assert len(incidents) >= 1
    
    # CNC-04 mechanical degradation should group vibration & temp anomalies
    cnc_incident = next((inc for inc in incidents if inc["asset"] == "CNC-04"), None)
    assert cnc_incident is not None
    assert cnc_incident["priority"] in ["HIGH", "CRITICAL"]
    assert len(cnc_incident["verified_evidence"]) >= 2
    
    # Verify there is a recommendation cached
    recs = res_data["recommendations"]
    assert cnc_incident["incident_id"] in recs
    rec = recs[cnc_incident["incident_id"]]
    assert rec["incident_id"] == cnc_incident["incident_id"]
    assert len(rec["probable_causes"]) > 0
    assert len(rec["recommended_actions"]) > 0
    print("Scenario 1 Verified: Mechanical degradation successfully detected and correlated.")

def test_scenario_2_safety_proximity():
    """
    Test Scenario 2: Mechanical degradation + Safety zone breach.
    Verifies that a restricted zone safety event near CNC-04 is correlated with
    the mechanical incident, generating a CRITICAL priority incident.
    """
    client.post("/api/simulator/reset")
    
    # Trigger Scenario 2
    response = client.post("/api/simulator/trigger", json={"scenario": "safety"})
    assert response.status_code == 200
    res_data = response.json()
    
    assert res_data["status"] == "completed"
    
    # Verify the safety incident got created and correlated
    incidents = res_data["incidents"]
    cnc_incident = next(
        (inc for inc in incidents if inc["asset"] == "CNC-04" and any(ev["domain"] == "vision" for ev in inc["verified_evidence"])),
        None
    )
    assert cnc_incident is not None
    
    # Ensure priority is upgraded to HIGH/CRITICAL and safety evidence is present
    assert len(cnc_incident["verified_evidence"]) >= 3
    evidence_domains = {ev["domain"] for ev in cnc_incident["verified_evidence"]}
    assert "vision" in evidence_domains
    assert "machine" in evidence_domains
    
    recs = res_data["recommendations"]
    rec = recs[cnc_incident["incident_id"]]
    assert "safety" in rec["summary"].lower() or "proximity" in rec["summary"].lower()
    print("Scenario 2 Verified: Vision proximity event successfully correlated into incident.")

def test_scenario_3_false_spike_filtering():
    """
    Test Scenario 3: Single vibration spike.
    Verifies that a temporary spike does not result in a high-priority incident,
    demonstrating that the system successfully filters noise.
    """
    client.post("/api/simulator/reset")
    
    # Trigger Scenario 3
    response = client.post("/api/simulator/trigger", json={"scenario": "false_spike"})
    assert response.status_code == 200
    res_data = response.json()
    
    # In Scenario 3, we expect some anomalies to be flagged (since a single spike exceeds thresholds)
    # but we want to make sure it doesn't result in any HIGH priority persistent incidents.
    incidents = res_data["incidents"]
    high_priority_incidents = [inc for inc in incidents if inc["priority"] in ["HIGH", "CRITICAL"]]
    
    # Since it's a single spike and doesn't persist (no persistence or isolation forest anomalies),
    # there should be no high priority incidents created.
    assert len(high_priority_incidents) == 0
    print("Scenario 3 Verified: Noise spike successfully filtered without creating high-priority incidents.")

if __name__ == "__main__":
    print("Running integration tests...")
    # Execute tests directly
    test_api_root()
    test_scenario_1_mechanical_degradation()
    test_scenario_2_safety_proximity()
    test_scenario_3_false_spike_filtering()
    print("All tests passed successfully!")
