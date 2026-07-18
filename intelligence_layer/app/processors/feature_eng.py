import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional
from app.schemas.models import MachineTelemetry, EnergyTelemetry
from app.config import ROLLING_WINDOW

def engineer_machine_features(history: List[MachineTelemetry]) -> Optional[Dict[str, Any]]:
    """
    Given a list of MachineTelemetry, convert to a DataFrame, compute rolling statistics,
    and return a dictionary of engineered features for the LATEST data point.
    """
    if len(history) < 2:
        return None

    # Convert to DataFrame
    df = pd.DataFrame([h.model_dump() for h in history])
    
    # Sort by timestamp (if not already sorted)
    # Since simulated data arrives chronologically, we assume it is sorted.
    
    latest_idx = len(df) - 1
    features = {}

    # Define metrics we want to analyze
    metrics = ["vibration", "temperature", "rpm"]
    
    for metric in metrics:
        values = df[metric].astype(float)
        
        # Rolling calculations
        rolling = values.rolling(window=ROLLING_WINDOW, min_periods=2)
        rolling_mean = rolling.mean().iloc[latest_idx]
        rolling_std = rolling.std().iloc[latest_idx]
        
        current_val = values.iloc[latest_idx]
        
        # Z-score: handle division by zero or NaN std
        if pd.isna(rolling_std) or rolling_std < 1e-6:
            z_score = 0.0
            rolling_std = 0.0
        else:
            z_score = (current_val - rolling_mean) / rolling_std

        # Rate of Change (difference over last 3 samples)
        if len(values) >= 4:
            rate_of_change = (current_val - values.iloc[latest_idx - 3]) / 3.0
        else:
            rate_of_change = current_val - values.iloc[latest_idx - 1]

        features[f"{metric}_rolling_mean"] = float(rolling_mean) if not pd.isna(rolling_mean) else float(current_val)
        features[f"{metric}_rolling_std"] = float(rolling_std)
        features[f"{metric}_zscore"] = float(z_score)
        features[f"{metric}_rate_of_change"] = float(rate_of_change)

    return features

def engineer_energy_features(history: List[EnergyTelemetry]) -> Optional[Dict[str, Any]]:
    """
    Given a list of EnergyTelemetry, compute rolling statistics and deviation from baseline
    for the LATEST data point.
    """
    if len(history) < 2:
        return None

    df = pd.DataFrame([h.model_dump() for h in history])
    latest_idx = len(df) - 1
    features = {}

    power_values = df["power_kw"].astype(float)
    current_power = power_values.iloc[latest_idx]
    baseline_power = float(df["baseline_power"].iloc[latest_idx])

    # Rolling calculations for power
    rolling = power_values.rolling(window=ROLLING_WINDOW, min_periods=2)
    rolling_mean = rolling.mean().iloc[latest_idx]
    rolling_std = rolling.std().iloc[latest_idx]

    if pd.isna(rolling_std) or rolling_std < 1e-6:
        z_score = 0.0
        rolling_std = 0.0
    else:
        z_score = (current_power - rolling_mean) / rolling_std

    # Deviation from baseline percentage
    if baseline_power > 0:
        deviation_pct = ((current_power - baseline_power) / baseline_power) * 100.0
    else:
        deviation_pct = 0.0

    # Rate of change over last 3 samples
    if len(power_values) >= 4:
        rate_of_change = (current_power - power_values.iloc[latest_idx - 3]) / 3.0
    else:
        rate_of_change = current_power - power_values.iloc[latest_idx - 1]

    features["power_rolling_mean"] = float(rolling_mean) if not pd.isna(rolling_mean) else float(current_power)
    features["power_rolling_std"] = float(rolling_std)
    features["power_zscore"] = float(z_score)
    features["power_deviation_pct"] = float(deviation_pct)
    features["power_rate_of_change"] = float(rate_of_change)

    return features
