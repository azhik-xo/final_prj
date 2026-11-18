"""
GlucoGuard AI Workout Planner & Exercise Glycemic Advisor (Module M6)

Deterministic clinical safety interlocks, physical activity MET kinetics,
and exercise-induced glucose drawdown forecasting per ADR-007 and ADR-010.

Clinical Reference: American Diabetes Association (ADA) Standards of Care
in Diabetes — Physical Activity & Hypoglycemia Risk Mitigation.
"""

import math
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional

# Reference physical activities with METs (Metabolic Equivalent of Task)
# 1 MET = ~1.0 kcal/kg/hour = resting metabolic rate
REFERENCE_ACTIVITIES: List[Dict[str, Any]] = [
  {
    "id": "brisk_walking",
    "name": "Brisk Walking (4.0 mph)",
    "category": "aerobic",
    "met": 3.8,
    "caloriesPerMinPer70Kg": 4.5,
    "intensity": "moderate",
    "drawdownRate": "moderate",
    "description": "Steady-state aerobic exertion. Promotes insulin-independent GLUT4 glucose uptake with minimal counter-regulatory stress."
  },
  {
    "id": "light_jogging",
    "name": "Light Jogging / Running (5.0 mph)",
    "category": "aerobic",
    "met": 8.3,
    "caloriesPerMinPer70Kg": 10.5,
    "intensity": "high",
    "drawdownRate": "high",
    "description": "Vigorous aerobic expenditure. Rapid glucose consumption from active skeletal muscle groups."
  },
  {
    "id": "cycling_moderate",
    "name": "Stationary or Outdoor Cycling (12-14 mph)",
    "category": "aerobic",
    "met": 6.8,
    "caloriesPerMinPer70Kg": 8.5,
    "intensity": "moderate",
    "drawdownRate": "moderate_high",
    "description": "Continuous lower-body aerobic workload. Predictable and steady rate of glycogen depletion."
  },
  {
    "id": "swimming_freestyle",
    "name": "Freestyle Lap Swimming",
    "category": "full_body",
    "met": 7.0,
    "caloriesPerMinPer70Kg": 9.0,
    "intensity": "high",
    "drawdownRate": "moderate_high",
    "description": "Full-body resistance and aerobic conditioning. High whole-body systemic glucose utilization."
  },
  {
    "id": "resistance_training",
    "name": "Resistance Training (Dumbbells / Circuit)",
    "category": "anaerobic",
    "met": 5.0,
    "caloriesPerMinPer70Kg": 6.2,
    "intensity": "moderate",
    "drawdownRate": "moderate",
    "description": "Hypertrophic muscular contraction. May cause transient catecholamine release followed by sustained post-workout drawdown."
  },
  {
    "id": "gentle_yoga",
    "name": "Hatha Yoga & Dynamic Stretching",
    "category": "flexibility",
    "met": 2.5,
    "caloriesPerMinPer70Kg": 3.1,
    "intensity": "low",
    "drawdownRate": "low",
    "description": "Gentle restorative movement. Enhances parasympathetic tone, reducing cortisol without severe glucose drops."
  }
]

INTENSITY_MULTIPLIERS = {
  "low": 0.70,
  "moderate": 1.00,
  "high": 1.35
}


class WorkoutAdvisor:
  """
  Clinical AI Workout Advisor enforcing strict glycemic safety interlocks
  and calculating post-exercise glucose drawdown trajectories.
  """

  def __init__(self):
    self.activities = REFERENCE_ACTIVITIES

  def get_activities(self) -> List[Dict[str, Any]]:
    """Returns catalog of calibrated physical activities."""
    return self.activities

  def get_activity_by_id(self, activity_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve activity by identifier."""
    for act in self.activities:
      if act["id"] == activity_id:
        return act
    return None

  def evaluate_safety_interlock(
    self,
    current_glucose: float,
    rate_of_change: float = 0.0,
    intensity: str = "moderate"
  ) -> Dict[str, Any]:
    """
    Evaluates clinical safety interlocks before exercise per ADR-010 and ADA guidelines.

    Interlock Rules:
    1. Hard Hypo Lockout:
       current_glucose < 90 mg/dL OR (current_glucose < 110 mg/dL AND rate_of_change < -1.5 mg/dL/min)
       -> status: "locked_hypo", exercise strictly contraindicated.
    2. Hyperglycemia / Ketosis Warning:
       current_glucose > 250 mg/dL
       -> If intensity is high: status: "locked_hyper", strenuous exercise locked out.
       -> If intensity is low/moderate: status: "caution_hyper", caution with hydration.
    3. Safe Window:
       90 <= current_glucose <= 250 mg/dL
       -> status: "safe", exercise permitted.
    """
    glucose = max(40.0, min(400.0, float(current_glucose)))
    roc = float(rate_of_change)

    # 1. Hypoglycemia Interlock (Hard Lockout)
    if glucose < 90.0 or (glucose < 110.0 and roc < -1.5):
      return {
        "safetyStatus": "locked_hypo",
        "isSafe": False,
        "title": "Exercise Locked: Low Glucose Level",
        "badgeColor": "rose",
        "currentGlucose": glucose,
        "rateOfChange": roc,
        "reason": f"Current glucose is {glucose} mg/dL (threshold: <90 mg/dL) with velocity {roc} mg/dL/min.",
        "actionProtocol": (
          "DO NOT EXERCISE. Physical activity accelerates muscle GLUT4 uptake and can precipitate severe hypoglycemia. "
          "Consume 15g of fast-acting simple carbohydrates (juice, 3-4 glucose tablets) immediately. "
          "Rest and recheck glucose in 15 minutes. Wait until blood glucose is steadily above 100 mg/dL before exercising."
        ),
        "snackGuidance": "15g fast-acting simple sugar (fruit juice or glucose tablets). Avoid fats/protein right now.",
        "source": "simulation"
      }

    # 2. Hyperglycemia / Ketosis Interlock
    if glucose > 250.0:
      if intensity == "high":
        return {
          "safetyStatus": "caution_hyper",
          "isSafe": False,
          "title": "Strenuous Exercise Locked: High Glucose Alert",
          "badgeColor": "amber",
          "currentGlucose": glucose,
          "rateOfChange": roc,
          "reason": f"Current glucose is {glucose} mg/dL (>250 mg/dL). High-intensity exercise increases counter-regulatory hormones and ketosis risk.",
          "actionProtocol": (
            "High-intensity exercise is locked out. Strenuous anaerobic exertion under insulin deficiency stimulates hepatic gluconeogenesis "
            "and increases the risk of diabetic ketoacidosis (DKA). Drink 500ml of water and switch to gentle walking or light stretching."
          ),
          "snackGuidance": "Zero carbohydrates. Drink plenty of fresh water or electrolytes.",
          "source": "simulation"
        }
      else:
        return {
          "safetyStatus": "caution_hyper",
          "isSafe": True,
          "title": "Exercise Caution: Elevated Blood Sugar",
          "badgeColor": "amber",
          "currentGlucose": glucose,
          "rateOfChange": roc,
          "reason": f"Current glucose is {glucose} mg/dL (>250 mg/dL). Restrict to low or moderate intensity only.",
          "actionProtocol": (
            "Gentle low-intensity exercise is permitted and can help lower glucose. Avoid sprinting or heavy lifting. "
            "Drink plenty of water before and during the session to assist renal clearance."
          ),
          "snackGuidance": "No carbs needed. Focus on hydration with water.",
          "source": "simulation"
        }

    # 3. Safe Exercise Window
    return {
      "safetyStatus": "safe",
      "isSafe": True,
      "title": "Safe to Exercise",
      "badgeColor": "emerald",
      "currentGlucose": glucose,
      "rateOfChange": roc,
      "reason": f"Glucose ({glucose} mg/dL) is within the recommended pre-exercise safety window (90–250 mg/dL).",
      "actionProtocol": "Target glycemic conditions optimal for physical training. Maintain consistent hydration.",
      "snackGuidance": (
        "If your session exceeds 45 minutes or your starting glucose is below 110 mg/dL, consider a 15g complex carbohydrate snack."
      ),
      "source": "simulation"
    }

  def estimate_workout_impact(
    self,
    activity_id: Optional[str] = None,
    activity_name: Optional[str] = None,
    duration_minutes: int = 30,
    intensity: str = "moderate",
    current_glucose: float = 120.0,
    rate_of_change: float = 0.0,
    body_weight_kg: float = 70.0
  ) -> Dict[str, Any]:
    """
    Computes expected glucose drawdown, post-workout nadir, calories burned,
    and a 2-hour kinetic trajectory (0 to 120 minutes).
    """
    duration = max(5, min(180, int(duration_minutes)))
    intensity = intensity.lower() if intensity.lower() in INTENSITY_MULTIPLIERS else "moderate"
    weight = max(40.0, min(150.0, float(body_weight_kg)))
    start_glucose = max(40.0, min(400.0, float(current_glucose)))
    roc = float(rate_of_change)

    # Resolve activity reference
    activity = self.get_activity_by_id(activity_id or "") if activity_id else None
    if not activity:
      # Fallback to brisk walking
      activity = self.activities[0]

    name = activity_name or activity["name"]
    met = float(activity.get("met", 3.8))
    intensity_factor = INTENSITY_MULTIPLIERS.get(intensity, 1.0)

    # Evaluate safety interlock first
    safety = self.evaluate_safety_interlock(start_glucose, roc, intensity)

    # Calculate Calories Burned: kcal = MET * weight_kg * (duration_min / 60)
    calories_burned = round(met * weight * (duration / 60.0), 1)

    # Calculate Drawdown Delta G:
    # Delta G = -1.0 * duration * intensity_factor * (MET / 3.5)
    # Bounded strictly between -120 and 0 mg/dL
    if not safety["isSafe"]:
      # If activity is strictly contraindicated, zero out drawdown
      estimated_drawdown = 0.0
      time_to_nadir = duration
    else:
      raw_drawdown = -1.0 * duration * intensity_factor * (met / 3.5)
      # Additional drawdown buffer if glucose is already dropping
      if roc < 0:
        raw_drawdown += (roc * 10.0)
      estimated_drawdown = max(-120.0, min(0.0, round(raw_drawdown, 1)))
      time_to_nadir = duration + 10  # Nadir typically reached right at or 10 min post workout

    projected_post_glucose = max(40.0, min(400.0, round(start_glucose + estimated_drawdown, 1)))

    # Post-workout nadir check for preemptive snack warning
    snack_recommendation = safety["snackGuidance"]
    needs_preemptive_snack = False
    if safety["isSafe"] and projected_post_glucose < 75.0:
      needs_preemptive_snack = True
      snack_recommendation = (
        f"PREEMPTIVE CARBS REQUIRED: Projected glucose drops to {projected_post_glucose} mg/dL (<75 mg/dL). "
        "Consume 15–20g of carbohydrates with protein (e.g., banana with peanut butter or whole grain toast) "
        "15 minutes before starting to buffer the expected drawdown."
      )

    # Generate 2-Hour Recovery Trajectory (0 to 120 mins at 10-min intervals)
    trajectory: List[Dict[str, Any]] = []
    recovery_tau = 40.0  # minutes recovery smoothing constant

    for minute in range(0, 130, 10):
      if minute <= time_to_nadir:
        # Active drawdown phase (sinusoidal drop)
        fraction = minute / max(1.0, float(time_to_nadir))
        drop = estimated_drawdown * math.sin((math.pi / 2.0) * fraction)
      else:
        # Post-exercise recovery / stabilization phase
        elapsed = minute - time_to_nadir
        # Gentle rebound of about 30% towards baseline as counter-regulatory glucagon balances out
        rebound = (-estimated_drawdown * 0.28) * (1.0 - math.exp(-elapsed / recovery_tau))
        drop = estimated_drawdown + rebound

      g_t = max(40.0, min(400.0, round(start_glucose + drop, 1)))
      trajectory.append({
        "minute": minute,
        "projectedGlucose": g_t,
        "projected_glucose": g_t,
        "delta": round(drop, 1)
      })

    return {
      "activityId": activity["id"],
      "activityName": name,
      "category": activity["category"],
      "durationMinutes": duration,
      "intensity": intensity,
      "met": met,
      "caloriesBurned": calories_burned,
      "startGlucose": start_glucose,
      "estimatedDrawdownMgDl": estimated_drawdown,
      "estimated_drawdown_mg_dl": estimated_drawdown,
      "timeToNadirMinutes": time_to_nadir,
      "projectedPostGlucose": projected_post_glucose,
      "projected_post_glucose": projected_post_glucose,
      "safetyStatus": safety["safetyStatus"],
      "isSafe": safety["isSafe"],
      "safetyTitle": safety["title"],
      "safetyReason": safety["reason"],
      "actionProtocol": safety["actionProtocol"],
      "snackGuidance": snack_recommendation,
      "needsPreemptiveSnack": needs_preemptive_snack,
      "trajectory": trajectory,
      "source": "simulation",
      "timestamp": datetime.now(timezone.utc).isoformat()
    }
