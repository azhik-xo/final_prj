"""
GlucoGuard AI Intelligence Engine Test Suite (Module M4)

Validates:
1. TrendAnalyzer velocity & momentum classification
2. GlucoseForecaster multi-step prediction, confidence intervals, and breach warnings
3. AnomalyDetector isolation forest & artifact screening
4. FastAPI /api/v1/ai/predict and /api/v1/ai/anomaly endpoints
"""

import pytest
from fastapi.testclient import TestClient

from main import app
from models.trend_analyzer import TrendAnalyzer
from models.forecaster import GlucoseForecaster
from models.anomaly_detector import AnomalyDetector


@pytest.fixture
def client():
    return TestClient(app)


# ---------------------------------------------------------------------------
# 1. TrendAnalyzer Unit Tests
# ---------------------------------------------------------------------------
def test_trend_analyzer_stable_sequence():
    analyzer = TrendAnalyzer()
    readings = [
        {"glucose": 100, "timestamp": "2026-11-15T12:00:00Z"},
        {"glucose": 101, "timestamp": "2026-11-15T12:05:00Z"},
        {"glucose": 100, "timestamp": "2026-11-15T12:10:00Z"},
    ]
    result = analyzer.analyze(readings)
    assert result["momentum"] == "stable"
    assert result["trend_arrow"] == "→"
    assert abs(result["rate_of_change"]) <= 1.0


def test_trend_analyzer_rising_rapidly():
    analyzer = TrendAnalyzer()
    # Glucose climbing at > 2.5 mg/dL/min
    readings = [
        {"glucose": 100, "timestamp": "2026-11-15T12:00:00Z"},
        {"glucose": 115, "timestamp": "2026-11-15T12:05:00Z"},
        {"glucose": 130, "timestamp": "2026-11-15T12:10:00Z"},
    ]
    result = analyzer.analyze(readings)
    assert result["momentum"] == "rising_rapidly"
    assert result["trend_arrow"] == "↑↑"
    assert result["rate_of_change"] > 2.0


def test_trend_analyzer_falling_rapidly():
    analyzer = TrendAnalyzer()
    # Glucose dropping at > 2.5 mg/dL/min
    readings = [
        {"glucose": 140, "timestamp": "2026-11-15T12:00:00Z"},
        {"glucose": 125, "timestamp": "2026-11-15T12:05:00Z"},
        {"glucose": 110, "timestamp": "2026-11-15T12:10:00Z"},
    ]
    result = analyzer.analyze(readings)
    assert result["momentum"] == "falling_rapidly"
    assert result["trend_arrow"] == "↓↓"
    assert result["rate_of_change"] < -2.0


# ---------------------------------------------------------------------------
# 2. GlucoseForecaster Unit Tests
# ---------------------------------------------------------------------------
def test_forecaster_multi_step_prediction():
    forecaster = GlucoseForecaster()
    readings = [
        {"glucose": 120, "timestamp": "2026-11-15T12:00:00Z"},
        {"glucose": 125, "timestamp": "2026-11-15T12:05:00Z"},
        {"glucose": 131, "timestamp": "2026-11-15T12:10:00Z"},
        {"glucose": 138, "timestamp": "2026-11-15T12:15:00Z"},
    ]
    result = forecaster.predict_trajectory(readings)

    assert result["current_glucose"] == 138.0
    assert len(result["forecasts"]) == 3

    horizons = [f["horizon_minutes"] for f in result["forecasts"]]
    assert horizons == [15, 30, 45]

    for f in result["forecasts"]:
        assert 40.0 <= f["predicted_glucose"] <= 400.0
        assert f["lower_bound"] <= f["predicted_glucose"]
        assert f["upper_bound"] >= f["predicted_glucose"]

    assert result["model_info"]["mae"] > 0
    assert result["model_info"]["rmse"] > 0


def test_forecaster_physiological_clamping_limits():
    forecaster = GlucoseForecaster()
    # Severe drop sequence trying to drive negative
    plunging_readings = [
        {"glucose": 90, "timestamp": "2026-11-15T12:00:00Z"},
        {"glucose": 70, "timestamp": "2026-11-15T12:05:00Z"},
        {"glucose": 50, "timestamp": "2026-11-15T12:10:00Z"},
        {"glucose": 42, "timestamp": "2026-11-15T12:15:00Z"},
    ]
    result = forecaster.predict_trajectory(plunging_readings)
    for f in result["forecasts"]:
        assert f["predicted_glucose"] >= 40.0
        assert f["lower_bound"] >= 40.0


def test_forecaster_hypoglycemia_breach_detection():
    forecaster = GlucoseForecaster()
    # Rapid descent toward hypo zone
    readings = [
        {"glucose": 105, "timestamp": "2026-11-15T12:00:00Z"},
        {"glucose": 90, "timestamp": "2026-11-15T12:05:00Z"},
        {"glucose": 76, "timestamp": "2026-11-15T12:10:00Z"},
        {"glucose": 65, "timestamp": "2026-11-15T12:15:00Z"},
    ]
    result = forecaster.predict_trajectory(readings)
    breach = result["breach_warning"]
    assert breach is not None
    assert breach["level"] in ["high", "critical"]
    assert "hypoglycemia" in breach["type"]
    assert breach["estimated_minutes_to_breach"] is not None


# ---------------------------------------------------------------------------
# 3. AnomalyDetector Unit Tests
# ---------------------------------------------------------------------------
def test_anomaly_detector_normal_reading():
    detector = AnomalyDetector()
    normal_reading = {"glucose": 115, "rateOfChange": 0.4}
    recent = [{"glucose": 113, "rateOfChange": 0.2}]
    res = detector.detect(normal_reading, recent)
    assert res["is_anomaly"] is False
    assert res["source"] == "simulation"


def test_anomaly_detector_velocity_artifact():
    detector = AnomalyDetector()
    # Unphysiological velocity (+5.5 mg/dL/min)
    spike_reading = {"glucose": 150, "rateOfChange": 5.5}
    res = detector.detect(spike_reading)
    assert res["is_anomaly"] is True
    assert res["anomaly_type"] == "extreme_velocity_artifact"
    assert res["anomaly_score"] >= 0.8


# ---------------------------------------------------------------------------
# 4. REST API Endpoint Integration Tests
# ---------------------------------------------------------------------------
def test_post_predict_endpoint(client):
    payload = {
        "readings": [
            {"glucose": 130, "rateOfChange": 1.2, "timestamp": "2026-11-15T12:00:00Z"},
            {"glucose": 136, "rateOfChange": 1.4, "timestamp": "2026-11-15T12:05:00Z"},
            {"glucose": 143, "rateOfChange": 1.5, "timestamp": "2026-11-15T12:10:00Z"},
        ],
        "persona": "Brittle Type 1 (High Risk)"
    }
    response = client.post("/api/v1/ai/predict", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["source"] == "simulation"
    assert "trend" in body["data"]
    assert "forecast" in body["data"]
    assert "anomaly" in body["data"]
    assert len(body["data"]["forecast"]["forecasts"]) == 3
    assert response.headers["X-Simulation-Mode"] == "true"


def test_post_anomaly_endpoint(client):
    payload = {
        "current_reading": {"glucose": 52, "rateOfChange": -4.8},
        "recent_readings": [{"glucose": 110, "rateOfChange": -1.0}]
    }
    response = client.post("/api/v1/ai/anomaly", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["source"] == "simulation"
    assert body["data"]["is_anomaly"] is True

