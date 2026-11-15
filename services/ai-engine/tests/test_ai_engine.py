"""
Automated Test Suite for GlucoGuard AI Intelligence Engine (TASK-M4-FULL)

Validates:
1. Trend velocity, acceleration, and momentum classification
2. Multi-step forecasting at +15, +30, +45 min with physiological clamping
3. Early clinical threshold breach detector (<70 hypo, >180 hyper)
4. Unsupervised Isolation Forest anomaly detection
5. FastAPI endpoints (/api/v1/ai/predict, /api/v1/ai/anomaly, /api/v1/ai/models/info)
"""

import pytest
from fastapi.testclient import TestClient
from main import app
from models.trend_analyzer import TrendAnalyzer
from models.forecaster import GlucoseForecaster
from models.anomaly_detector import AnomalyDetector

client = TestClient(app)


# ==============================================================================
# 1. TrendAnalyzer Unit Tests
# ==============================================================================

def test_trend_analyzer_stable_sequence():
    readings = [
        {"glucose": 100, "timestamp": "2026-11-15T10:00:00Z"},
        {"glucose": 101, "timestamp": "2026-11-15T10:05:00Z"},
        {"glucose": 100, "timestamp": "2026-11-15T10:10:00Z"},
    ]
    result = TrendAnalyzer.analyze_sequence(readings)
    assert result["category"] == "stable"
    assert result["arrow"] == "→"
    assert abs(result["rateOfChange"]) < 1.0


def test_trend_analyzer_rapid_rise():
    readings = [
        {"glucose": 110, "timestamp": "2026-11-15T10:00:00Z"},
        {"glucose": 122, "timestamp": "2026-11-15T10:05:00Z"},
        {"glucose": 136, "timestamp": "2026-11-15T10:10:00Z"},
    ]
    result = TrendAnalyzer.analyze_sequence(readings)
    assert result["category"] in ["rising", "double_rising"]
    assert result["arrow"] in ["↑", "↑↑"]
    assert result["rateOfChange"] > 1.0


def test_trend_analyzer_steep_drop():
    readings = [
        {"glucose": 130, "timestamp": "2026-11-15T10:00:00Z"},
        {"glucose": 115, "timestamp": "2026-11-15T10:05:00Z"},
        {"glucose": 98, "timestamp": "2026-11-15T10:10:00Z"},
    ]
    result = TrendAnalyzer.analyze_sequence(readings)
    assert result["category"] in ["falling", "double_falling"]
    assert result["arrow"] in ["↓", "↓↓"]
    assert result["rateOfChange"] < -1.0


# ==============================================================================
# 2. GlucoseForecaster Unit Tests
# ==============================================================================

def test_forecaster_generates_valid_bounded_horizons():
    forecaster = GlucoseForecaster()
    readings = [
        {"glucose": 110, "timestamp": "2026-11-15T10:00:00Z"},
        {"glucose": 115, "timestamp": "2026-11-15T10:05:00Z"},
        {"glucose": 120, "timestamp": "2026-11-15T10:10:00Z"},
    ]
    result = forecaster.predict(readings)
    preds = result["predictions"]

    assert len(preds) == 3
    horizons = [p["minutesAhead"] for p in preds]
    assert horizons == [15, 30, 45]

    for p in preds:
        # Strict physiological boundary clamping [40, 400]
        assert 40.0 <= p["projectedGlucose"] <= 400.0
        assert p["lowerBound"] <= p["projectedGlucose"]
        assert p["projectedGlucose"] <= p["upperBound"]

    assert result["modelMetrics"]["zeroLeakageValidated"] is True
    assert result["modelMetrics"]["mae"] > 0
    assert result["modelMetrics"]["rmse"] > 0


def test_forecaster_hypo_breach_detection():
    forecaster = GlucoseForecaster()
    # Steep plummeting readings heading below 70 mg/dL
    readings = [
        {"glucose": 110, "timestamp": "2026-11-15T10:00:00Z"},
        {"glucose": 95, "timestamp": "2026-11-15T10:05:00Z"},
        {"glucose": 78, "timestamp": "2026-11-15T10:10:00Z"},
    ]
    result = forecaster.predict(readings)
    breach = result["breachWarning"]

    assert breach["breachPredicted"] is True
    assert breach["type"] == "hypoglycemia"
    assert breach["estimatedTimeToBreachMinutes"] is not None
    assert breach["estimatedTimeToBreachMinutes"] > 0
    assert breach["severity"] in ["warning", "critical"]


def test_forecaster_hyper_breach_detection():
    forecaster = GlucoseForecaster()
    # Rapidly escalating post-meal spike crossing 180 mg/dL
    readings = [
        {"glucose": 140, "timestamp": "2026-11-15T10:00:00Z"},
        {"glucose": 165, "timestamp": "2026-11-15T10:05:00Z"},
        {"glucose": 190, "timestamp": "2026-11-15T10:10:00Z"},
    ]
    result = forecaster.predict(readings)
    breach = result["breachWarning"]

    assert breach["breachPredicted"] is True
    assert breach["type"] == "hyperglycemia"
    assert breach["severity"] in ["warning", "critical"]


# ==============================================================================
# 3. AnomalyDetector Unit Tests
# ==============================================================================

def test_anomaly_detector_normal_readings():
    detector = AnomalyDetector()
    readings = [
        {"glucose": 110, "rateOfChange": 0.2},
        {"glucose": 112, "rateOfChange": 0.4},
        {"glucose": 115, "rateOfChange": 0.6},
    ]
    result = detector.detect(readings)
    assert result["is_anomaly"] is False
    assert result["anomaly_score"] < 0.75


def test_anomaly_detector_velocity_shock_anomaly():
    detector = AnomalyDetector()
    readings = [
        {"glucose": 100, "rateOfChange": 0.0},
        {"glucose": 145, "rateOfChange": 9.0},  # Impossibly high jump (+45 mg/dL in 5 min)
    ]
    result = detector.detect(readings)
    assert result["is_anomaly"] is True
    assert result["anomaly_score"] > 0.8
    assert "velocity" in result["reason"].lower()


# ==============================================================================
# 4. FastAPI Endpoints Integration Tests
# ==============================================================================

def test_api_predict_endpoint_success():
    payload = {
        "personaId": "VP-03",
        "readings": [
            {"glucose": 120, "timestamp": "2026-11-15T10:00:00Z", "rateOfChange": 0.2},
            {"glucose": 125, "timestamp": "2026-11-15T10:05:00Z", "rateOfChange": 1.0},
            {"glucose": 132, "timestamp": "2026-11-15T10:10:00Z", "rateOfChange": 1.4},
        ],
        "horizonMinutes": [15, 30, 45]
    }
    response = client.post("/api/v1/ai/predict", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "ok"
    assert data["source"] == "simulation"
    assert response.headers["x-simulation-mode"] == "true"
    assert data["currentGlucose"] == 132
    assert "trend" in data
    assert len(data["predictions"]) == 3
    assert "breachWarning" in data
    assert "modelMetrics" in data
    assert data["modelMetrics"]["zeroLeakageValidated"] is True


def test_api_anomaly_endpoint_success():
    payload = {
        "readings": [
            {"glucose": 110, "rateOfChange": 0.2},
            {"glucose": 115, "rateOfChange": 1.0},
        ]
    }
    response = client.post("/api/v1/ai/anomaly", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "is_anomaly" in data["data"]


def test_api_models_info():
    response = client.get("/api/v1/ai/models/info")
    assert response.status_code == 200
    data = response.json()
    assert "forecasting" in data["models"]
    assert "anomalyDetection" in data["models"]
    assert data["models"]["forecasting"]["mae"] > 0
