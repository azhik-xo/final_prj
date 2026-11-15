"""
GlucoGuard AI Intelligence Engine — Trend Analytics & Velocity Submodule (M4)

Calculates finite-difference rate of change (dG/dt), acceleration (d2G/dt2),
momentum categorization, and trend arrows for continuous interstitial glucose telemetry.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np


class TrendAnalyzer:
    """
    Analyzes short-term temporal sequence of glucose readings to compute
    rate of change, acceleration, momentum, and standard clinical trend indicators.
    """

    MOMENTUM_RISING_RAPIDLY = "rising_rapidly"
    MOMENTUM_RISING = "rising"
    MOMENTUM_STABLE = "stable"
    MOMENTUM_FALLING = "falling"
    MOMENTUM_FALLING_RAPIDLY = "falling_rapidly"

    @staticmethod
    def calculate_dt_minutes(t1: Any, t2: Any, default_dt: float = 5.0) -> float:
        """Calculates difference in minutes between two timestamps."""
        try:
            if isinstance(t1, str):
                dt1 = datetime.fromisoformat(t1.replace("Z", "+00:00"))
            elif isinstance(t1, datetime):
                dt1 = t1
            else:
                return default_dt

            if isinstance(t2, str):
                dt2 = datetime.fromisoformat(t2.replace("Z", "+00:00"))
            elif isinstance(t2, datetime):
                dt2 = t2
            else:
                return default_dt

            diff = abs((dt2 - dt1).total_seconds()) / 60.0
            return max(0.5, diff)
        except Exception:
            return default_dt

    @classmethod
    def classify_velocity(cls, roc: float):
        if roc > 2.0:
            return "rising_rapidly", "↑↑", "double_rising"
        elif roc > 1.0:
            return "rising", "↑", "single_rising"
        elif roc < -2.0:
            return "falling_rapidly", "↓↓", "double_falling"
        elif roc < -1.0:
            return "falling", "↓", "single_falling"
        else:
            return "stable", "→", "stable"

    @classmethod
    def analyze_sequence(cls, readings: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyzes a sequence of readings (oldest to newest).
        Expects each reading to contain at least 'glucose' and optionally 'timestamp'.
        """
        if not readings:
            return {
                "rateOfChange": 0.0,
                "rate_of_change": 0.0,
                "acceleration": 0.0,
                "category": "stable",
                "momentum": "stable",
                "arrow": "→",
                "trend_arrow": "→",
                "volatility_sd": 0.0,
                "sampleCount": 0,
                "window_size": 0
            }

        glucose_vals = [float(r.get("glucose", 100)) for r in readings]
        n = len(glucose_vals)

        if n == 1:
            roc = float(readings[-1].get("rateOfChange", 0.0))
            momentum, arrow, cat = cls.classify_velocity(roc)
            return {
                "rateOfChange": round(roc, 2),
                "rate_of_change": round(roc, 2),
                "acceleration": 0.0,
                "category": cat,
                "momentum": momentum,
                "arrow": arrow,
                "trend_arrow": arrow,
                "volatility_sd": 0.0,
                "sampleCount": 1,
                "window_size": 1
            }

        # Calculate dt between last two points
        dt = cls.calculate_dt_minutes(
            readings[-2].get("timestamp"),
            readings[-1].get("timestamp"),
            default_dt=5.0
        )

        # Primary rate of change (finite difference)
        raw_roc = (glucose_vals[-1] - glucose_vals[-2]) / dt

        # If we have 3 or more points, compute smoothed velocity and acceleration
        if n >= 3:
            dt_prev = cls.calculate_dt_minutes(
                readings[-3].get("timestamp"),
                readings[-2].get("timestamp"),
                default_dt=5.0
            )
            prev_roc = (glucose_vals[-2] - glucose_vals[-3]) / dt_prev

            # Smoothed velocity (weighted average prioritizing most recent)
            roc = round(0.7 * raw_roc + 0.3 * prev_roc, 2)
            # Acceleration = delta velocity / delta time
            acceleration = round((raw_roc - prev_roc) / dt, 3)
        else:
            roc = round(raw_roc, 2)
            acceleration = 0.0

        momentum, arrow, cat = cls.classify_velocity(roc)
        volatility_sd = float(round(np.std(glucose_vals), 2))

        return {
            "rateOfChange": roc,
            "rate_of_change": roc,
            "acceleration": acceleration,
            "category": cat,
            "momentum": momentum,
            "arrow": arrow,
            "trend_arrow": arrow,
            "volatility_sd": volatility_sd,
            "sampleCount": n,
            "window_size": n
        }

    # Alias for flexibility
    analyze = analyze_sequence
