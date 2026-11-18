"""
FastAPI Routes for AI Workout Planner & Exercise Glycemic Advisor (Module M6)

Provides endpoints for exercise safety evaluation, activity MET library,
and glucose drawdown kinetic predictions.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional

from models.workout_advisor import WorkoutAdvisor

router = APIRouter()
workout_advisor = WorkoutAdvisor()


class WorkoutAdviseRequest(BaseModel):
  activityId: Optional[str] = Field(default="brisk_walking", description="Unique activity ID")
  activityName: Optional[str] = Field(default=None, description="Custom activity name")
  durationMinutes: int = Field(default=30, ge=5, le=180, description="Duration in minutes")
  intensity: str = Field(default="moderate", description="Intensity: low, moderate, high")
  currentGlucose: float = Field(default=120.0, ge=40.0, le=400.0, description="Starting blood glucose")
  rateOfChange: float = Field(default=0.0, description="Current glucose velocity in mg/dL/min")
  bodyWeightKg: float = Field(default=70.0, ge=40.0, le=150.0, description="Patient body weight in kg")


@router.post("/advise")
def advise_workout(payload: WorkoutAdviseRequest):
  """
  Evaluates workout safety interlocks and predicts exercise-induced glucose drawdown.
  """
  try:
    result = workout_advisor.estimate_workout_impact(
      activity_id=payload.activityId,
      activity_name=payload.activityName,
      duration_minutes=payload.durationMinutes,
      intensity=payload.intensity,
      current_glucose=payload.currentGlucose,
      rate_of_change=payload.rateOfChange,
      body_weight_kg=payload.bodyWeightKg
    )
    return {
      "status": "success",
      "data": result,
      "source": "simulation",
      "disclaimer": "Educational exercise simulation model only. Does not replace physician or clinical guidelines."
    }
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Failed to evaluate workout impact: {str(e)}")


@router.get("/activities")
def get_activities():
  """
  Returns catalog of calibrated physical activities with MET coefficients.
  """
  activities = workout_advisor.get_activities()
  return {
    "status": "success",
    "count": len(activities),
    "data": activities,
    "source": "simulation"
  }


@router.get("/safety-check")
def check_exercise_safety(
  currentGlucose: float = Query(default=120.0, ge=40.0, le=400.0),
  rateOfChange: float = Query(default=0.0),
  intensity: str = Query(default="moderate")
):
  """
  Rapid safety interlock evaluation for current glucose and velocity.
  """
  try:
    safety = workout_advisor.evaluate_safety_interlock(
      current_glucose=currentGlucose,
      rate_of_change=rateOfChange,
      intensity=intensity
    )
    return {
      "status": "success",
      "data": safety,
      "source": "simulation",
      "disclaimer": "Safety interlocks are simulation thresholds based on ADA clinical standards."
    }
  except Exception as e:
    raise HTTPException(status_code=500, detail=f"Failed to evaluate safety interlock: {str(e)}")
