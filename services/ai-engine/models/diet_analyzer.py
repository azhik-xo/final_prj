"""
GlucoGuard AI Diet Planner & Glycemic Impact Model (Module M5)
Author: Developer AI
Architectural References: ADR-007, ADR-009

Provides:
1. Reference diabetic-plate food database with macronutrients and Glycemic Index.
2. Pharmacokinetic-informed post-prandial glycemic excursion prediction:
   - Delta G peak excursion (mg/dL)
   - Estimated time to peak (minutes)
   - 2-hour projected trajectory curve
   - Risk categorization (safe, moderate, high_spike)
3. Diabetic-safe low-GI food substitutions and nutritional swaps.

SAFETY INVARIANT (ADR-007 / ADR-009):
Under NO circumstances will this model compute or advise insulin dosages,
insulin-to-carb ratios, or prescription medical therapies.
"""

from typing import Dict, List, Any, Optional
import math
from datetime import datetime, timezone


# Curated diabetic-plate reference food database
REFERENCE_FOODS: List[Dict[str, Any]] = [
    {
        "id": "oatmeal_almonds",
        "name": "Steel-Cut Oatmeal with Almonds & Berries",
        "category": "breakfast",
        "carbs": 32.0,
        "protein": 8.0,
        "fat": 7.0,
        "fiber": 6.0,
        "glycemicIndex": 42,
        "giCategory": "low",
        "calories": 220,
        "diabeticScore": 9.2,
        "description": "High-fiber whole grains with healthy monounsaturated fats that slow digestion."
    },
    {
        "id": "brown_rice_bowl",
        "name": "Brown Basmati Rice Veggie Bowl with Tofu",
        "category": "lunch",
        "carbs": 45.0,
        "protein": 14.0,
        "fat": 6.0,
        "fiber": 7.0,
        "glycemicIndex": 50,
        "giCategory": "low",
        "calories": 290,
        "diabeticScore": 8.5,
        "description": "Complex carbs balanced with high plant protein and high dietary fiber."
    },
    {
        "id": "grilled_chicken_salad",
        "name": "Mediterranean Grilled Chicken Salad",
        "category": "dinner",
        "carbs": 8.0,
        "protein": 28.0,
        "fat": 9.0,
        "fiber": 4.0,
        "glycemicIndex": 20,
        "giCategory": "low",
        "calories": 230,
        "diabeticScore": 9.8,
        "description": "Very low glycemic impact with lean protein and leafy greens dressed in extra virgin olive oil."
    },
    {
        "id": "dosa_sambar",
        "name": "Traditional Fermented Dosa with Mixed Veggie Sambar",
        "category": "breakfast",
        "carbs": 52.0,
        "protein": 9.0,
        "fat": 8.0,
        "fiber": 5.0,
        "glycemicIndex": 62,
        "giCategory": "medium",
        "calories": 320,
        "diabeticScore": 7.4,
        "description": "Fermented lentils and rice with spiced vegetable stew. Moderate glycemic release."
    },
    {
        "id": "lentil_dal_spinach",
        "name": "Spinach Dal (Lentil Stew) with 1 Multigrain Roti",
        "category": "lunch",
        "carbs": 34.0,
        "protein": 13.0,
        "fat": 5.0,
        "fiber": 9.0,
        "glycemicIndex": 38,
        "giCategory": "low",
        "calories": 240,
        "diabeticScore": 9.4,
        "description": "High soluble fiber from lentils and iron-rich spinach provides steady blood glucose control."
    },
    {
        "id": "quinoa_salad",
        "name": "Avocado & Chickpea Quinoa Salad",
        "category": "lunch",
        "carbs": 36.0,
        "protein": 11.0,
        "fat": 10.0,
        "fiber": 8.0,
        "glycemicIndex": 44,
        "giCategory": "low",
        "calories": 280,
        "diabeticScore": 9.1,
        "description": "Complete amino acid profile with slow-burning complex carbohydrates."
    },
    {
        "id": "white_bread_jam",
        "name": "White Toast with Fruit Jam & Butter",
        "category": "breakfast",
        "carbs": 50.0,
        "protein": 4.0,
        "fat": 4.0,
        "fiber": 1.0,
        "glycemicIndex": 78,
        "giCategory": "high",
        "calories": 250,
        "diabeticScore": 3.2,
        "description": "Refined wheat and concentrated sucrose cause rapid post-prandial glycemic spike."
    },
    {
        "id": "sweet_soda",
        "name": "Regular Carbonated Soda (330ml Can)",
        "category": "snack",
        "carbs": 39.0,
        "protein": 0.0,
        "fat": 0.0,
        "fiber": 0.0,
        "glycemicIndex": 85,
        "giCategory": "high",
        "calories": 150,
        "diabeticScore": 1.0,
        "description": "Pure high-fructose corn syrup liquid calories absorbed immediately into bloodstream."
    }
]


# Verified Diabetic Nutritional Swaps Library
DIABETIC_FOOD_SWAPS: List[Dict[str, Any]] = [
    {
        "originalFood": "White Bread / Toast",
        "originalGi": 78,
        "recommendedSwap": "100% Sprouted Whole Grain Bread or Sourdough",
        "recommendedGi": 48,
        "glycemicBenefit": "Reduces peak spike by ~22 mg/dL",
        "fiberIncreaseGrams": 4.5,
        "explanation": "Sprouted grains retain the bran and germ, slowing enzymatic carbohydrate breakdown in the small intestine."
    },
    {
        "originalFood": "Polished White Rice",
        "originalGi": 73,
        "recommendedSwap": "Brown Basmati Rice, Quinoa, or Cauliflower Rice",
        "recommendedGi": 45,
        "glycemicBenefit": "Reduces peak spike by ~28 mg/dL",
        "fiberIncreaseGrams": 5.0,
        "explanation": "Amylose-rich brown basmati digests significantly slower than polished amylopectin white grains."
    },
    {
        "originalFood": "Regular Sugary Soda or Packaged Juice",
        "originalGi": 85,
        "recommendedSwap": "Lemon-Mint Infused Sparkling Water or Iced Green Tea",
        "recommendedGi": 0,
        "glycemicBenefit": "Prevents steep +45-60 mg/dL rapid spike",
        "fiberIncreaseGrams": 0.0,
        "explanation": "Eliminating liquid free sucrose prevents rapid hepatic portal vein glucose overload."
    },
    {
        "originalFood": "Deep-Fried Potato Chips",
        "originalGi": 75,
        "recommendedSwap": "Roasted Spiced Chickpeas or Mixed Raw Walnuts & Almonds",
        "recommendedGi": 28,
        "glycemicBenefit": "Replaces fast starches with prebiotic fiber and omega-3s",
        "fiberIncreaseGrams": 6.0,
        "explanation": "Nuts and legumes provide sustained satiety without erratic glycemic velocity."
    },
    {
        "originalFood": "Sweetened Breakfast Cereals / Cornflakes",
        "originalGi": 82,
        "recommendedSwap": "Steel-Cut Rolled Oats with Chia Seeds and Cinnamon",
        "recommendedGi": 42,
        "glycemicBenefit": "Reduces peak spike by ~35 mg/dL",
        "fiberIncreaseGrams": 7.0,
        "explanation": "Beta-glucan soluble fiber in oats creates a viscous gel that blunts post-prandial absorption."
    }
]


class DietAnalyzer:
    """
    Mathematical and physiological diet impact analyzer for continuous glucose modeling.
    Predicts post-prandial glycemic excursions and provides low-GI meal recommendations.
    """

    def __init__(self):
        self.reference_foods = REFERENCE_FOODS
        self.food_swaps = DIABETIC_FOOD_SWAPS

    def get_reference_foods(self) -> List[Dict[str, Any]]:
        """Returns the library of reference foods."""
        return self.reference_foods

    def get_food_by_id(self, food_id: str) -> Optional[Dict[str, Any]]:
        """Look up reference food by ID."""
        for food in self.reference_foods:
            if food["id"] == food_id:
                return food
        return None

    def get_swaps(self) -> List[Dict[str, Any]]:
        """Returns verified low-GI nutritional swaps."""
        return self.food_swaps

    def estimate_glycemic_excursion(
        self,
        carbs: float,
        protein: float = 0.0,
        fat: float = 0.0,
        fiber: float = 0.0,
        glycemic_index: float = 55.0,
        current_glucose: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Estimates the post-prandial glycemic excursion (Delta G) based on macronutrient breakdown.

        Mathematical Formulation:
        1. Net Carbs = max(0, carbs - fiber)
        2. GI Factor = 0.5 + (GI / 100) * 1.3
        3. Buffering Delay = min(22.0, (fat * 0.28) + (protein * 0.16))
        4. Fiber Blunting = fiber * 0.75
        5. Delta G Peak = (Net Carbs * GI Factor) - Fiber Blunting - (Buffering * 0.35)
        Clamped to [0, 150] mg/dL.
        """
        c = max(0.0, float(carbs))
        p = max(0.0, float(protein))
        f = max(0.0, float(fat))
        fib = max(0.0, float(fiber))
        gi = max(10.0, min(100.0, float(glycemic_index)))

        base_glucose = float(current_glucose) if current_glucose is not None else 105.0
        base_glucose = max(40.0, min(400.0, base_glucose))

        net_carbs = max(0.0, c - fib)

        # GI Category
        if gi < 55:
            gi_category = "low"
            base_peak_time = 65.0
        elif gi < 70:
            gi_category = "medium"
            base_peak_time = 50.0
        else:
            gi_category = "high"
            base_peak_time = 35.0

        # GI Scaling multiplier
        gi_factor = 0.5 + (gi / 100.0) * 1.3

        # Gastric emptying delay from fat and protein
        buffering = min(22.0, (f * 0.28) + (p * 0.16))
        fiber_blunting = fib * 0.75

        if net_carbs <= 0.5:
            raw_spike = 0.0
        else:
            raw_spike = (net_carbs * gi_factor) - fiber_blunting - (buffering * 0.35)

        # Clamped between 0 and 150 mg/dL
        estimated_spike = max(0.0, min(150.0, round(raw_spike, 1)))

        # Time to peak in minutes (fat & protein delay gastric emptying by up to 20 mins)
        time_delay = min(20.0, (f * 0.4) + (p * 0.2))
        time_to_peak = int(max(30.0, min(80.0, round(base_peak_time + time_delay))))

        # Peak glucose level
        projected_peak_glucose = min(400.0, round(base_glucose + estimated_spike, 1))

        # Risk Classification
        if estimated_spike <= 30.0:
            risk_level = "safe"
            risk_label = "Minimal Glycemic Excursion"
            advice = "Diabetic-friendly meal profile. Expected to keep blood sugar stable and within the healthy target zone."
        elif estimated_spike <= 65.0:
            risk_level = "moderate"
            risk_label = "Moderate Excursion"
            advice = "Noticeable post-meal rise expected. Consider pairing with dietary fiber or drinking water to soften the peak."
        else:
            risk_level = "high_spike"
            risk_label = "Significant Glucose Spike Anticipated"
            advice = "High glycemic impact expected. We recommend exploring a low-GI food swap or reducing refined portion size."

        # Generate 2-Hour Trajectory curve (0 to 120 minutes at 10-minute intervals)
        trajectory: List[Dict[str, Any]] = []
        decay_tau = 45.0  # minutes decay constant

        for minute in range(0, 130, 10):
            if minute <= time_to_peak:
                # Rising curve using sinusoidal quarter-period
                fraction = minute / max(1.0, time_to_peak)
                rise = estimated_spike * math.sin((math.pi / 2.0) * fraction)
            else:
                # Exponential decay back towards baseline
                elapsed_past_peak = minute - time_to_peak
                rise = estimated_spike * math.exp(-elapsed_past_peak / decay_tau)

            glucose_at_t = max(40.0, min(400.0, round(base_glucose + rise, 1)))
            trajectory.append({
                "minute": minute,
                "projectedGlucose": glucose_at_t,
                "projected_glucose": glucose_at_t,
                "delta": round(rise, 1)
            })

        return {
            "name": "Meal Impact Analysis",
            "carbs": c,
            "protein": p,
            "fat": f,
            "fiber": fib,
            "netCarbs": round(net_carbs, 1),
            "glycemicIndex": gi,
            "giCategory": gi_category,
            "estimatedSpikeMgDl": estimated_spike,
            "estimated_spike_mg_dl": estimated_spike,
            "timeToPeakMinutes": time_to_peak,
            "time_to_peak_minutes": time_to_peak,
            "currentGlucose": base_glucose,
            "projectedPeakGlucose": projected_peak_glucose,
            "riskLevel": risk_level,
            "riskLabel": risk_label,
            "recommendation": advice,
            "trajectory": trajectory,
            "source": "simulation",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
