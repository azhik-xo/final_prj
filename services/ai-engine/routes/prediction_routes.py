"""
GlucoGuard AI Engine Prediction & Anomaly REST Routes (Module M4)

Endpoints:
- POST /api/v1/ai/predict: Generates trend analytics, multi-step trajectory forecast, and threshold breach warning
- POST /api/v1/ai/anomaly: Evaluates reading for atypical anomalies and telemetry artifacts
- GET /api/v1/ai/models/info: Metadata regarding active ML models, validation baselines, and metrics
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from models.trend_analyzer import TrendAnalyzer
from models.forecaster import GlucoseForecaster
from models.anomaly_detector import AnomalyDetector

router = APIRouter(tags=["AI Intelligence Engine"])

# Initialize model singletons
trend_analyzer = TrendAnalyzer()
forecaster = GlucoseForecaster()
anomaly_detector = AnomalyDetector()


@router.post("/predict")
async def predict_glucose_trajectory(request: Request):
    """
    Evaluates historical telemetry sequence and generates:
    1. Smoothed trend analytics and velocity acceleration
    2. Multi-step forecasts (+15, +30, +45 min) with prediction intervals
    3. Clinical safety breach prediction (hypo/hyper early warning)
    4. Anomaly screening on the latest reading
    """
    try:
        body = await request.json()
        readings = body.get("readings", [])
        if not readings:
            raise HTTPException(status_code=400, detail="Readings array cannot be empty")

        horizons = body.get("horizonMinutes") or body.get("horizon_minutes") or [15, 30, 45]
        persona = body.get("personaId") or body.get("persona") or "Standard Profile"

        # 1. Trend Analysis
        trend_analysis = trend_analyzer.analyze(readings)

        # 2. Multi-step Trajectory Forecasting
        forecast_result = forecaster.predict(
            readings=readings,
            horizons=horizons
        )

        # 3. Anomaly Evaluation
        anomaly_result = anomaly_detector.detect(readings)

        # Build response with both top-level and nested structure to satisfy all clients
        current_g = forecast_result.get("currentGlucose") or readings[-1].get("glucose", 100)

        return {
            "status": "ok",
            "source": "simulation",
            "currentGlucose": current_g,
            "trend": trend_analysis,
            "predictions": forecast_result.get("predictions", []),
            "forecast": forecast_result,
            "breachWarning": forecast_result.get("breachWarning"),
            "modelMetrics": forecast_result.get("modelMetrics"),
            "anomaly": anomaly_result,
            "data": {
                "trend": trend_analysis,
                "forecast": forecast_result,
                "anomaly": anomaly_result,
                "persona": persona
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Prediction Error: {str(e)}")


@router.post("/anomaly")
async def evaluate_anomaly(request: Request):
    """
    Screen readings against contextual window using Isolation Forest.
    """
    try:
        body = await request.json()
        if "readings" in body:
            readings = body["readings"]
            result = anomaly_detector.detect(readings)
        elif "current_reading" in body:
            current = body["current_reading"]
            recent = body.get("recent_readings")
            result = anomaly_detector.detect(current, recent)
        else:
            raise HTTPException(status_code=400, detail="Must provide 'readings' or 'current_reading'")

        return {
            "status": "ok",
            "source": "simulation",
            "data": result,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Anomaly Detection Error: {str(e)}")


@router.get("/models/info")
def get_models_info():
    """Returns active models information, zero-leakage metrics, and hyperparameters."""
    return {
        "status": "ok",
        "source": "simulation",
        "models": {
            "forecasting": {
                "name": "PolynomialRidge-RandomForest-Ensemble",
                "horizons": [15, 30, 45],
                "mae": forecaster.baseline_metrics.get("mae", 4.65),
                "rmse": forecaster.baseline_metrics.get("rmse", 6.32),
                "zeroLeakageValidated": True
            },
            "anomalyDetection": {
                "algorithm": "IsolationForest",
                "contamination": 0.04,
                "n_estimators": 50
            },
            "trendAnalytics": {
                "algorithm": "FiniteDifference-ExponentialSmoothing"
            }
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
