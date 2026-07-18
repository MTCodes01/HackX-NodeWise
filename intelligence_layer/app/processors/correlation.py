import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.schemas.models import AnomalyEvidence, UnifiedIncident
from app.config import (
    CORRELATION_THRESHOLD,
    TIME_WINDOW_SECONDS,
    WEIGHT_ASSET_MATCH,
    WEIGHT_TIME_OVERLAP,
    WEIGHT_SEVERITY_MATCH,
    WEIGHT_CROSS_DOMAIN_BONUS
)

def parse_time(time_str: str) -> datetime:
    """Parses standard ISO format or HH:MM:SS format."""
    try:
        # Try ISO format
        return datetime.fromisoformat(time_str)
    except ValueError:
        # Try HH:MM:SS (assuming current date)
        try:
            parsed = datetime.strptime(time_str, "%H:%M:%S")
            now = datetime.now()
            return now.replace(hour=parsed.hour, minute=parsed.minute, second=parsed.second, microsecond=0)
        except ValueError:
            # Fallback to current time
            return datetime.now()

def calculate_pair_correlation(a1: AnomalyEvidence, a2: AnomalyEvidence) -> float:
    """Computes a correlation score [0, 1] between two anomalies."""
    score = 0.0

    # 1. Asset / Line Match
    if a1.machine_id and a2.machine_id and a1.machine_id == a2.machine_id:
        score += WEIGHT_ASSET_MATCH
    elif a1.line_id == a2.line_id:
        # Same line, different machine
        score += (WEIGHT_ASSET_MATCH * 0.5)

    # 2. Time Window Overlap
    t1 = parse_time(a1.timestamp)
    t2 = parse_time(a2.timestamp)
    time_diff = abs((t1 - t2).total_seconds())
    if time_diff <= TIME_WINDOW_SECONDS:
        # Linear scale: closer in time = higher score
        time_score_factor = 1.0 - (time_diff / TIME_WINDOW_SECONDS)
        score += WEIGHT_TIME_OVERLAP * time_score_factor

    # 3. Severity Match
    if a1.severity == a2.severity:
        score += WEIGHT_SEVERITY_MATCH
    else:
        score += (WEIGHT_SEVERITY_MATCH * 0.5)

    # 4. Cross-domain Bonus
    if a1.domain != a2.domain:
        score += WEIGHT_CROSS_DOMAIN_BONUS

    return min(score, 1.0)

def correlate_anomalies(
    new_anomalies: List[AnomalyEvidence],
    existing_incidents: List[UnifiedIncident],
    all_uncorrelated_anomalies: List[AnomalyEvidence]
) -> tuple[List[UnifiedIncident], List[AnomalyEvidence]]:
    """
    Correlates new anomalies with existing incidents or groups them with uncorrelated anomalies.
    Returns:
        updated_incidents: List of all active incidents (newly created or modified).
        remaining_uncorrelated: List of anomalies that remain uncorrelated.
    """
    updated_incidents = list(existing_incidents)
    uncorrelated = list(all_uncorrelated_anomalies)

    for new_anom in new_anomalies:
        correlated = False

        # 1. Try to correlate with existing incidents
        best_incident_idx = -1
        best_incident_score = 0.0

        for idx, inc in enumerate(updated_incidents):
            # Calculate average correlation score with existing evidence in the incident
            scores = []
            for ev in inc.verified_evidence:
                scores.append(calculate_pair_correlation(new_anom, ev))
            
            avg_score = sum(scores) / len(scores) if scores else 0.0
            
            # Cross-domain bonus if the new anomaly adds a new domain
            domains_in_inc = {ev.domain for ev in inc.verified_evidence}
            if new_anom.domain not in domains_in_inc:
                avg_score += WEIGHT_CROSS_DOMAIN_BONUS

            avg_score = min(avg_score, 1.0)

            if avg_score >= CORRELATION_THRESHOLD and avg_score > best_incident_score:
                best_incident_score = avg_score
                best_incident_idx = idx

        if best_incident_idx != -1:
            # Add to this incident
            inc = updated_incidents[best_incident_idx]
            inc.verified_evidence.append(new_anom)
            
            # Recalculate incident details
            inc.correlation_score = (inc.correlation_score + best_incident_score) / 2.0
            
            # Update priority if the new anomaly has higher severity
            severity_rank = {"low": 1, "medium": 2, "high": 3}
            max_severity = max(new_anom.severity, inc.priority.lower(), key=lambda s: severity_rank.get(s, 0))
            inc.priority = max_severity.upper()
            
            # Summarize the combined evidence
            domains = {ev.domain for ev in inc.verified_evidence}
            inc.detection_summary = f"Persistent {', '.join(domains)} anomalies correlated across line {inc.line}."
            correlated = True

        # 2. If not correlated with existing incidents, try to group with uncorrelated anomalies
        if not correlated:
            best_partner_idx = -1
            best_partner_score = 0.0
            
            for idx, unc_anom in enumerate(uncorrelated):
                score = calculate_pair_correlation(new_anom, unc_anom)
                if score >= CORRELATION_THRESHOLD and score > best_partner_score:
                    best_partner_score = score
                    best_partner_idx = idx

            if best_partner_idx != -1:
                # We have a correlation! Create a new incident
                partner = uncorrelated.pop(best_partner_idx)
                
                # Determine asset/machine id (prefer machine_id if available)
                asset_id = new_anom.machine_id or partner.machine_id or "LINE_WIDE"
                line_id = new_anom.line_id or partner.line_id
                
                severity_rank = {"low": 1, "medium": 2, "high": 3}
                max_severity = max(new_anom.severity, partner.severity, key=lambda s: severity_rank.get(s, 0))
                
                new_inc = UnifiedIncident(
                    incident_id=f"INC-{uuid.uuid4().hex[:6].upper()}",
                    asset=asset_id,
                    line=line_id,
                    start_time=new_anom.timestamp,
                    priority=max_severity.upper(),
                    correlation_score=best_partner_score,
                    verified_evidence=[partner, new_anom],
                    detection_summary=f"Correlated anomalies on {asset_id} across {new_anom.domain} and {partner.domain}."
                )
                updated_incidents.append(new_inc)
                correlated = True

        # 3. If still uncorrelated, we add it to the uncorrelated list
        # Note: If it's a high-severity standalone machine/vision anomaly, we might promote it to an incident immediately
        if not correlated:
            if new_anom.severity == "high" and new_anom.domain in ["machine", "vision"]:
                new_inc = UnifiedIncident(
                    incident_id=f"INC-{uuid.uuid4().hex[:6].upper()}",
                    asset=new_anom.machine_id or "LINE_WIDE",
                    line=new_anom.line_id,
                    start_time=new_anom.timestamp,
                    priority="HIGH",
                    correlation_score=0.5,  # Standalone
                    verified_evidence=[new_anom],
                    detection_summary=f"Standalone high-priority {new_anom.domain} anomaly on {new_anom.machine_id or 'line'}"
                )
                updated_incidents.append(new_inc)
            else:
                uncorrelated.append(new_anom)

    return updated_incidents, uncorrelated
