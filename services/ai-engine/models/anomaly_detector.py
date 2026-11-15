"""
GlucoGuard AI Intelligence Engine — Anomaly Detection Submodule (M4)

Uses an unsupervised Isolation Forest model combined with physiological rules
to detect:
- Out-of-bounds telemetry artifacts
- Unphysiological rate-of-change jumps (> 4.0 mg/dL/min)
- Sudden compression lows and sensor dropout signatures
"""

from typing import List, Dict, Any, Union, Optional
import numpy as np
from sklearn.ensemble import IsolationForest


class AnomalyDetector:
    """
    Detects unphysiological glucose telemetry artifacts using
    Isolation Forest and physiological rule boundaries.
    """

    def __init__(self):
        self.model = IsolationForest(
            contamination=0.04,
            random_state=42,
            n_estimators=50
        )
        self.is_fitted = False
        self._train_baseline()

    def _train_baseline(self):
        """
        Fits Isolation Forest on typical physiological telemetry features:
        [glucose, rateOfChange, abs_acceleration, residual_from_mean]
        """
        np.random.seed(42)
        normal_samples = []

        for _ in range(500):
            g = np.random.normal(120, 25)
            roc = np.random.normal(0, 0.9)
            acc = abs(np.random.normal(0, 0.08))
            res = abs(g - 120)
            normal_samples.append([g, roc, acc, res])

        for _ in range(25):
            g = np.random.uniform(50, 280)
            roc = np.random.uniform(-2.5, 2.5)
            acc = np.random.uniform(0, 0.25)
            res = abs(g - 120)
            normal_samples.append([g, roc, acc, res])

        X = np.array(normal_samples)
        self.model.fit(X)
        self.is_fitted = True

    def detect(
        self,
        current_or_readings: Union[Dict[str, Any], List[Dict[str, Any]]],
        recent_readings: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Evaluates reading(s) for anomalous telemetry signatures.
        Supports both detect(readings_list) and detect(current_dict, recent_list).
        """
        if isinstance(current_or_readings, list):
            readings = current_or_readings
            if not readings:
                return {
                    "is_anomaly": False,
                    "isAnomaly": False,
                    "anomaly_score": 0.0,
                    "anomalyScore": 0.0,
                    "anomaly_type": "none",
                    "reason": None,
                    "explanation": "No telemetry data provided",
                    "source": "simulation"
                }
            latest = readings[-1]
            prior = readings[:-1] if len(readings) > 1 else None
        else:
            latest = current_or_readings
            prior = recent_readings
            readings = (prior or []) + [latest]

        glucose = float(latest.get("glucose", 100))
        roc = float(latest.get("rateOfChange", 0.0))

        # Check hard physiological bounds [40, 400]
        if glucose < 40 or glucose > 400:
            return {
                "is_anomaly": True,
                "isAnomaly": True,
                "anomaly_score": 1.0,
                "anomalyScore": 1.0,
                "anomaly_type": "sensor_limit_fault",
                "reason": f"Sensor limit violation: {glucose} mg/dL exceeds physiological limits [40, 400].",
                "explanation": f"Sensor limit violation: {glucose} mg/dL exceeds physiological limits [40, 400].",
                "source": "simulation"
            }

        # Check rate of change: > 4.0 mg/dL/min is clinically implausible
        if abs(roc) >= 4.0:
            return {
                "is_anomaly": True,
                "isAnomaly": True,
                "anomaly_score": 0.92,
                "anomalyScore": 0.92,
                "anomaly_type": "extreme_velocity_artifact",
                "reason": f"Unphysiological velocity spike: |dG/dt| = {abs(roc):.1f} mg/dL/min exceeds 4.0 mg/dL/min.",
                "explanation": f"Unphysiological velocity spike: |dG/dt| = {abs(roc):.1f} mg/dL/min exceeds 4.0 mg/dL/min.",
                "source": "simulation"
            }

        # Check for sudden compression low or step jump
        if prior and len(prior) >= 1:
            prev_glucose = float(prior[-1].get("glucose", glucose))
            delta = abs(glucose - prev_glucose)
            if delta > 25.0:
                return {
                    "is_anomaly": True,
                    "isAnomaly": True,
                    "anomaly_score": 0.86,
                    "anomalyScore": 0.86,
                    "anomaly_type": "step_artifact",
                    "reason": f"Erratic step delta: {delta:.1f} mg/dL step between consecutive readings indicates compression low or sensor fault.",
                    "explanation": f"Erratic step delta: {delta:.1f} mg/dL step between consecutive readings indicates compression low or sensor fault.",
                    "source": "simulation"
                }

        # Isolation Forest feature extraction
        mean_g = float(np.mean([float(r.get("glucose", 100)) for r in readings[-6:]]))
        features = np.array([[glucose, roc, 0.05, abs(glucose - mean_g)]])

        raw_score = -float(self.model.score_samples(features)[0])
        norm_score = float(round(np.clip((raw_score - 0.35) / 0.3, 0.0, 1.0), 3))
        pred = self.model.predict(features)[0]

        is_anomaly = bool(pred == -1 or norm_score > 0.75)
        reason = "Statistical anomaly detected by Isolation Forest telemetry filter." if is_anomaly else None

        return {
            "is_anomaly": is_anomaly,
            "isAnomaly": is_anomaly,
            "anomaly_score": norm_score,
            "anomalyScore": norm_score,
            "anomaly_type": "statistical_outlier" if is_anomaly else "none",
            "reason": reason,
            "explanation": reason or "Telemetry conforms to normal physiological interstitial dynamics.",
            "source": "simulation"
        }
