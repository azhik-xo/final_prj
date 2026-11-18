"""
Unit and Integration Tests for AI Workout Planner & Exercise Safety Engine (Module M6)
"""

import pytest
from fastapi.testclient import TestClient
from main import app
from models.workout_advisor import WorkoutAdvisor

client = TestClient(app)
advisor = WorkoutAdvisor()


def test_reference_activities_catalog():
  """Verifies reference activity catalog contains required calibrated activities."""
  activities = advisor.get_activities()
  assert len(activities) >= 6

  activity_ids = [a["id"] for a in activities]
  assert "brisk_walking" in activity_ids
  assert "light_jogging" in activity_ids
  assert "cycling_moderate" in activity_ids
  assert "swimming_freestyle" in activity_ids
  assert "resistance_training" in activity_ids
  assert "gentle_yoga" in activity_ids

  for act in activities:
    assert act["met"] > 0
    assert act["caloriesPerMinPer70Kg"] > 0
    assert act["intensity"] in ["low", "moderate", "high"]


def test_hypoglycemia_lockout_low_glucose():
  """Verifies absolute lockout when blood glucose is below 90 mg/dL."""
  # Glucose = 82 mg/dL (Hypo territory)
  safety = advisor.evaluate_safety_interlock(current_glucose=82.0)
  assert safety["safetyStatus"] == "locked_hypo"
  assert safety["isSafe"] is False
  assert "DO NOT EXERCISE" in safety["actionProtocol"]
  assert "15g" in safety["actionProtocol"]

  # Impact calculation should yield 0 drawdown and locked status
  impact = advisor.estimate_workout_impact(
    activity_id="brisk_walking",
    duration_minutes=30,
    current_glucose=82.0
  )
  assert impact["safetyStatus"] == "locked_hypo"
  assert impact["isSafe"] is False
  assert impact["estimatedDrawdownMgDl"] == 0.0


def test_hypoglycemia_lockout_steep_velocity():
  """Verifies lockout when glucose is 105 mg/dL but plunging at -2.0 mg/dL/min."""
  safety = advisor.evaluate_safety_interlock(current_glucose=105.0, rate_of_change=-2.0)
  assert safety["safetyStatus"] == "locked_hypo"
  assert safety["isSafe"] is False


def test_hyperglycemia_warning_high_intensity():
  """Verifies lockout of strenuous/high-intensity workouts when glucose > 250 mg/dL."""
  safety = advisor.evaluate_safety_interlock(current_glucose=270.0, intensity="high")
  assert safety["safetyStatus"] == "caution_hyper"
  assert safety["isSafe"] is False
  assert "High-intensity exercise is locked out" in safety["actionProtocol"]


def test_hyperglycemia_caution_gentle_exercise():
  """Verifies caution with permission for gentle low-intensity exercise when glucose > 250 mg/dL."""
  safety = advisor.evaluate_safety_interlock(current_glucose=265.0, intensity="low")
  assert safety["safetyStatus"] == "caution_hyper"
  assert safety["isSafe"] is True
  assert "Gentle low-intensity exercise is permitted" in safety["actionProtocol"]


def test_safe_workout_drawdown_bounds():
  """Verifies that in safe range (90-250), drawdown is negative and bounded between -120 and 0 mg/dL."""
  impact = advisor.estimate_workout_impact(
    activity_id="cycling_moderate",
    duration_minutes=45,
    intensity="moderate",
    current_glucose=140.0
  )
  assert impact["safetyStatus"] == "safe"
  assert impact["isSafe"] is True
  assert impact["estimatedDrawdownMgDl"] < 0
  assert -120.0 <= impact["estimatedDrawdownMgDl"] <= 0.0
  assert impact["caloriesBurned"] > 0
  assert 40.0 <= impact["projectedPostGlucose"] <= 400.0

  # Check 2-hour trajectory
  trajectory = impact["trajectory"]
  assert len(trajectory) == 13  # 0 to 120 at step 10
  for pt in trajectory:
    assert 40.0 <= pt["projectedGlucose"] <= 400.0


def test_preemptive_snack_alert_on_nadir_drop():
  """Verifies alert when projected post-workout nadir drops below 75 mg/dL."""
  # Starting at 95 mg/dL with intense 45 min jogging
  impact = advisor.estimate_workout_impact(
    activity_id="light_jogging",
    duration_minutes=45,
    intensity="high",
    current_glucose=95.0
  )
  assert impact["isSafe"] is True
  assert impact["projectedPostGlucose"] < 75.0
  assert impact["needsPreemptiveSnack"] is True
  assert "PREEMPTIVE CARBS REQUIRED" in impact["snackGuidance"]


def test_api_workout_activities_endpoint():
  """Tests GET /api/v1/ai/workout/activities endpoint."""
  response = client.get("/api/v1/ai/workout/activities")
  assert response.status_code == 200
  data = response.json()
  assert data["status"] == "success"
  assert data["source"] == "simulation"
  assert len(data["data"]) >= 6


def test_api_workout_safety_check_endpoint():
  """Tests GET /api/v1/ai/workout/safety-check endpoint."""
  # Safe check
  res_safe = client.get("/api/v1/ai/workout/safety-check?currentGlucose=135&rateOfChange=0.0")
  assert res_safe.status_code == 200
  assert res_safe.json()["data"]["safetyStatus"] == "safe"

  # Hypo check
  res_hypo = client.get("/api/v1/ai/workout/safety-check?currentGlucose=75")
  assert res_hypo.status_code == 200
  assert res_hypo.json()["data"]["safetyStatus"] == "locked_hypo"
  assert res_hypo.json()["data"]["isSafe"] is False


def test_api_workout_advise_endpoint():
  """Tests POST /api/v1/ai/workout/advise endpoint."""
  payload = {
    "activityId": "brisk_walking",
    "durationMinutes": 30,
    "intensity": "moderate",
    "currentGlucose": 130.0,
    "rateOfChange": 0.0,
    "bodyWeightKg": 70.0
  }
  response = client.post("/api/v1/ai/workout/advise", json=payload)
  assert response.status_code == 200
  res_json = response.json()
  assert res_json["status"] == "success"
  assert res_json["data"]["isSafe"] is True
  assert res_json["data"]["estimatedDrawdownMgDl"] < 0
  assert len(res_json["data"]["trajectory"]) == 13
