import json
import logging
import google.generativeai as genai
from typing import Dict, Any, List
from app.config import GEMINI_API_KEY
from app.schemas.models import UnifiedIncident, OperatorRecommendation, ProbableCause, RecommendedAction

logger = logging.getLogger("app.gemini")

# Configure genai if key is present
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def get_deterministic_fallback(incident: UnifiedIncident) -> OperatorRecommendation:
    """
    Returns a deterministic recommendation based on the incident's evidence
    if Gemini API is not configured or fails.
    """
    evidence_types = [ev.metric for ev in incident.verified_evidence]
    has_vibration = "vibration" in evidence_types
    has_temp = "temperature" in evidence_types
    has_power = "power_kw" in evidence_types
    
    # Check if there is vision evidence
    has_vision = any(ev.domain == "vision" for ev in incident.verified_evidence)
    vision_events = [ev.metric for ev in incident.verified_evidence if ev.domain == "vision"]
    if not vision_events:
        # Fallback check on metric name or method
        vision_events = [ev.method for ev in incident.verified_evidence if ev.domain == "vision"]

    # Scenario 2: Safety event correlated with machine
    if has_vision or "restricted_zone_proximity" in vision_events:
        return OperatorRecommendation(
            incident_id=incident.incident_id,
            summary=f"Safety proximity violation detected in restricted zone around {incident.asset}.",
            probable_causes=[
                ProbableCause(
                    cause="Unauthorized personnel entry into the machine's active safety perimeter.",
                    confidence="high",
                    basis=["vision_restricted_zone_proximity"]
                ),
                ProbableCause(
                    cause="Failure of operator to wear required Personal Protective Equipment (PPE).",
                    confidence="medium",
                    basis=["vision_ppe_check"]
                )
            ],
            recommended_actions=[
                RecommendedAction(
                    action="Trigger immediate warning alarm or automated spindle deceleration.",
                    timeline="Immediate (Automatic)"
                ),
                RecommendedAction(
                    action="Check CCTV feed and confirm operator clearance from the safety polygon.",
                    timeline="Within 5 minutes"
                ),
                RecommendedAction(
                    action="Review safety barrier gate interlocks.",
                    timeline="Within 8 hours"
                )
            ],
            operator_explanation="A person was detected by the safety camera entering the restricted ROI (Region of Interest) polygon surrounding the active CNC/milling station. This requires immediate operator visual confirmation.",
            estimated_impact="High risk of operator injury if machine remains at full operational RPM.",
            limitations="Recommendation is based on visual zone detection and lack of manual bypass signal."
        )

    # Scenario 1: Mechanical degradation (Vibration + Temp + Energy)
    if has_vibration or has_temp or has_power:
        basis_list = []
        if has_vibration: basis_list.append("vibration")
        if has_temp: basis_list.append("temperature")
        if has_power: basis_list.append("power_kw")

        return OperatorRecommendation(
            incident_id=incident.incident_id,
            summary=f"Mechanical degradation and excessive friction detected on {incident.asset}.",
            probable_causes=[
                ProbableCause(
                    cause="Spindle bearing friction or misalignment causing heat and vibration.",
                    confidence="high",
                    basis=basis_list
                ),
                ProbableCause(
                    cause="Lubrication failure in main mechanical drive shaft.",
                    confidence="medium",
                    basis=["temperature", "vibration"]
                ),
                ProbableCause(
                    cause="Motor electrical overload due to physical load impedance.",
                    confidence="medium",
                    basis=["power_kw"]
                )
            ],
            recommended_actions=[
                RecommendedAction(
                    action="Reduce spindle feed rate by 50% to mitigate heat build-up.",
                    timeline="Within 2 hours"
                ),
                RecommendedAction(
                    action="Perform visual inspection and verify spindle lubrication levels.",
                    timeline="Within 12 hours"
                ),
                RecommendedAction(
                    action="Schedule vibration analysis and bearing replacement.",
                    timeline="Within 24 hours"
                )
            ],
            operator_explanation="Consistent elevation of vibration levels followed by a sharp increase in motor temperature and power draw strongly indicates mechanical wear (bearing degradation).",
            estimated_impact="Potential spindle seizure and catastrophic failure if run at full load for another 48 hours.",
            limitations="Recommendation is based on statistical anomaly trends; physical diagnostic testing is recommended."
        )

    # Default low-priority incident
    return OperatorRecommendation(
        incident_id=incident.incident_id,
        summary="Unspecified factory floor anomaly detected.",
        probable_causes=[
            ProbableCause(
                cause="Transient sensor noise or temporary spike.",
                confidence="low",
                basis=["unknown"]
            )
        ],
        recommended_actions=[
            RecommendedAction(
                action="Observe sensor telemetry for recurrence.",
                timeline="Within 24 hours"
            )
        ],
        operator_explanation="An isolated anomaly was registered that does not correlate with known mechanical degradation or safety event patterns.",
        estimated_impact="Minimal; currently no production impact expected.",
        limitations="Recommendation is based on limited data."
    )

def generate_operator_recommendation(incident: UnifiedIncident) -> OperatorRecommendation:
    """
    Sends the verified Unified Incident to Gemini API to get a structured
    explainable AI recommendation. If API is unavailable or fails, falls back
    to deterministic scenarios.
    """
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set. Using deterministic fallback.")
        return get_deterministic_fallback(incident)

    try:
        # Define the system instructions and prompt
        system_instruction = (
            "You are the ForgeMind AI Root-Cause Analyst.\n"
            "You will receive a verified Unified Incident JSON object from the factory floor.\n"
            "The verified_evidence in the incident is immutable ground truth. Do not invent "
            "any sensor evidence or change the anomaly status.\n"
            "Explain likely operational meaning, suggest probable causes as hypotheses, "
            "recommend actions with a timeline, and estimate the potential impact.\n"
            "Return a JSON object that adheres strictly to the OperatorRecommendation schema."
        )

        prompt = f"Analyze the following Unified Incident:\n{json.dumps(incident.model_dump(), indent=2)}"

        # Instantiate Gemini model
        model = genai.GenerativeModel(
            model_name="gemini-3.5-flash",
            system_instruction=system_instruction
        )

        # We configure structured JSON output using the Pydantic model
        # Note: google-generativeai supports response_schema directly.
        # It takes either a Pydantic model or a dictionary representing the schema.
        response = model.generate_content(
            prompt,
            generation_config={
                "response_mime_type": "application/json",
                "response_schema": OperatorRecommendation
            }
        )

        # Parse output
        result_json = json.loads(response.text)
        return OperatorRecommendation(**result_json)

    except Exception as e:
        logger.error(f"Gemini API call failed: {e}. Falling back to deterministic recommendation.")
        return get_deterministic_fallback(incident)
