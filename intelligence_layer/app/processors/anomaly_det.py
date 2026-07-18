import uuid
from typing import List, Dict, Any, Optional
from sklearn.ensemble import IsolationForest
import numpy as np
import pandas as pd
from app.schemas.models import MachineTelemetry, EnergyTelemetry, AnomalyEvidence
from app.processors.feature_eng import engineer_machine_features, engineer_energy_features

# Global cache of Isolation Forest models per machine/meter to avoid re-instantiating constantly
IFOREST_MODELS: Dict[str, IsolationForest] = {}

def get_anomaly_severity(z_score: float, deviation_pct: float) -> str:
    """Helper to determine severity based on Z-score and percentage deviation."""
    abs_z = abs(z_score)
    if abs_z >= 3.0 or deviation_pct >= 40.0:
        return "high"
    elif abs_z >= 2.0 or deviation_pct >= 20.0:
        return "medium"
    else:
        return "low"

def detect_machine_anomalies(history: List[MachineTelemetry]) -> List[AnomalyEvidence]:
    """
    Analyzes machine history, calculates features, runs statistical checks
    and Isolation Forest, and returns a list of AnomalyEvidence for the LATEST sample.
    """
    if len(history) < 2:
        return []

    latest = history[-1]
    features = engineer_machine_features(history)
    if not features:
        return []

    anomalies = []
    timestamp = latest.timestamp
    machine_id = latest.machine_id
    line_id = latest.line_id

    # 1. Statistical Checks: Z-score & Rate of Change
    metrics_to_check = ["vibration", "temperature", "rpm"]
    
    for metric in metrics_to_check:
        z_score = features[f"{metric}_zscore"]
        rate_of_change = features[f"{metric}_rate_of_change"]
        current_val = getattr(latest, metric)
        rolling_mean = features[f"{metric}_rolling_mean"]
        
        # Calculate percentage deviation from rolling mean
        if rolling_mean != 0:
            deviation_pct = (abs(current_val - rolling_mean) / rolling_mean) * 100.0
        else:
            deviation_pct = 0.0

        # Check Z-score threshold
        is_z_anomaly = abs(z_score) >= 2.0
        
        # Check Rate of Change (Heuristic: rate of change > 30% of normal rolling std)
        rolling_std = features[f"{metric}_rolling_std"]
        is_roc_anomaly = False
        if rolling_std > 0 and abs(rate_of_change) > 2.5 * rolling_std:
            is_roc_anomaly = True

        # Check Persistence: Z-score > 2.0 for at least 5 of the last 6 samples
        is_persistent = False
        if len(history) >= 6:
            recent_samples = history[-6:]
            z_scores = []
            for i in range(1, 7):
                sub_hist = history[:-i] if i > 1 else history
                sub_feats = engineer_machine_features(sub_hist)
                if sub_feats:
                    z_scores.append(sub_feats[f"{metric}_zscore"])
            
            # Count how many had z-score >= 2.0
            high_z_count = sum(1 for z in z_scores if abs(z) >= 2.0)
            if high_z_count >= 5:
                is_persistent = True

        # Determine method string and severity
        methods = []
        if is_z_anomaly:
            methods.append("zscore")
        if is_roc_anomaly:
            methods.append("rate-of-change")
        if is_persistent:
            methods.append("persistence")

        if methods:
            severity = get_anomaly_severity(z_score, deviation_pct)
            if is_persistent:
                severity = "high"  # Persistence upgrades severity to high

            anomalies.append(AnomalyEvidence(
                anomaly_id=f"A-M-{uuid.uuid4().hex[:6].upper()}",
                domain="machine",
                machine_id=machine_id,
                line_id=line_id,
                metric=metric,
                current_value=float(current_val),
                baseline=float(rolling_mean),
                deviation_pct=float(deviation_pct),
                method="+".join(methods),
                severity=severity,
                timestamp=timestamp
            ))

    # 2. Multivariate Anomaly Detection: Isolation Forest
    # We fit Isolation Forest if we have enough samples (e.g., at least 10)
    if len(history) >= 10:
        df = pd.DataFrame([h.model_dump() for h in history])
        X = df[["vibration", "temperature", "rpm"]].values
        
        # Fit Isolation Forest on historical data
        clf = IsolationForest(contamination=0.1, random_state=42)
        clf.fit(X)
        
        # Predict on latest sample
        latest_val = np.array([[latest.vibration, latest.temperature, latest.rpm]])
        prediction = clf.predict(latest_val)[0]
        
        if prediction == -1:
            # Check if this anomaly wasn't already covered by statistical methods
            # If not, add a multivariate anomaly
            already_detected = any(a.metric in ["vibration", "temperature", "rpm"] for a in anomalies)
            
            # We calculate global deviation as a simple Euclidean distance deviation from mean
            mean_vals = X.mean(axis=0)
            std_vals = X.std(axis=0)
            # Avoid division by zero
            std_vals = np.where(std_vals < 1e-6, 1.0, std_vals)
            norm_latest = (latest_val[0] - mean_vals) / std_vals
            deviation_dist = float(np.linalg.norm(norm_latest))
            
            if not already_detected or deviation_dist > 3.0:
                anomalies.append(AnomalyEvidence(
                    anomaly_id=f"A-IF-{uuid.uuid4().hex[:6].upper()}",
                    domain="machine",
                    machine_id=machine_id,
                    line_id=line_id,
                    metric="multivariate_health",
                    current_value=float(np.mean(latest_val[0])),
                    baseline=float(np.mean(mean_vals)),
                    deviation_pct=float(deviation_dist * 10.0),  # Rough proxy
                    method="isolation-forest",
                    severity="high" if deviation_dist > 2.5 else "medium",
                    timestamp=timestamp
                ))

    return anomalies

def detect_energy_anomalies(history: List[EnergyTelemetry]) -> List[AnomalyEvidence]:
    """
    Analyzes energy history and returns a list of AnomalyEvidence for the LATEST sample.
    """
    if len(history) < 2:
        return []

    latest = history[-1]
    features = engineer_energy_features(history)
    if not features:
        return []

    anomalies = []
    timestamp = latest.timestamp
    meter_id = latest.meter_id
    line_id = latest.line_id

    # Check power_kw for Z-score and percentage deviation from baseline
    z_score = features["power_zscore"]
    deviation_pct = features["power_deviation_pct"]
    rate_of_change = features["power_rate_of_change"]
    
    is_z_anomaly = abs(z_score) >= 2.0
    is_baseline_anomaly = abs(deviation_pct) >= 15.0  # 15% deviation from baseline
    is_roc_anomaly = False
    
    rolling_std = features["power_rolling_std"]
    if rolling_std > 0 and abs(rate_of_change) > 2.5 * rolling_std:
        is_roc_anomaly = True

    methods = []
    if is_z_anomaly:
        methods.append("zscore")
    if is_baseline_anomaly:
        methods.append("baseline_deviation")
    if is_roc_anomaly:
        methods.append("rate-of-change")

    if methods:
        severity = get_anomaly_severity(z_score, deviation_pct)
        
        anomalies.append(AnomalyEvidence(
            anomaly_id=f"A-E-{uuid.uuid4().hex[:6].upper()}",
            domain="energy",
            machine_id=None,  # Energy is usually line-wide or meter-specific
            line_id=line_id,
            metric="power_kw",
            current_value=float(latest.power_kw),
            baseline=float(latest.baseline_power),
            deviation_pct=float(deviation_pct),
            method="+".join(methods),
            severity=severity,
            timestamp=timestamp
        ))

    return anomalies
