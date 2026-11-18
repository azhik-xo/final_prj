"""
GlucoGuard AI Diet Planner REST Routes (Module M5)
Author: Developer AI
Architectural References: ADR-007, ADR-009

Endpoints:
- POST /api/v1/ai/diet/analyze: Analyzes meal macronutrients and calculates predicted glycemic spike
- GET  /api/v1/ai/diet/foods: Returns curated reference food database
- GET  /api/v1/ai/diet/recommendations: Returns low-GI diabetic food substitutions
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field

from models.diet_analyzer import DietAnalyzer

router = APIRouter(tags=["AI Diet Planner"])
diet_analyzer = DietAnalyzer()


class MealAnalyzeRequest(BaseModel):
    name: Optional[str] = Field("Custom Meal", description="Name of the meal")
    carbs: float = Field(..., ge=0.0, le=500.0, description="Carbohydrates in grams")
    protein: float = Field(0.0, ge=0.0, le=500.0, description="Protein in grams")
    fat: float = Field(0.0, ge=0.0, le=500.0, description="Fat in grams")
    fiber: float = Field(0.0, ge=0.0, le=100.0, description="Dietary fiber in grams")
    glycemicIndex: float = Field(55.0, ge=10.0, le=100.0, description="Glycemic Index (10-100)")
    currentGlucose: Optional[float] = Field(None, ge=40.0, le=400.0, description="Current interstitial glucose in mg/dL")


@router.post("/analyze")
async def analyze_meal_glycemic_impact(payload: MealAnalyzeRequest):
    """
    Computes estimated post-prandial glycemic spike, time-to-peak, and projected trajectory.
    """
    try:
        result = diet_analyzer.estimate_glycemic_excursion(
            carbs=payload.carbs,
            protein=payload.protein,
            fat=payload.fat,
            fiber=payload.fiber,
            glycemic_index=payload.glycemicIndex,
            current_glucose=payload.currentGlucose
        )
        if payload.name:
            result["name"] = payload.name
        return {
            "status": "success",
            "data": result,
            "source": "simulation",
            "disclaimer": "Educational simulation model only. Does not compute or prescribe insulin dosages."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze meal impact: {str(e)}")


@router.get("/foods")
def get_reference_foods():
    """
    Returns curated reference diabetic-friendly food library with standardized macros.
    """
    foods = diet_analyzer.get_reference_foods()
    return {
        "status": "success",
        "count": len(foods),
        "data": foods,
        "source": "simulation"
    }


@router.get("/recommendations")
def get_dietary_recommendations():
    """
    Returns verified low-GI food substitutions and general glycemic guidance.
    """
    swaps = diet_analyzer.get_swaps()
    return {
        "status": "success",
        "data": {
            "swaps": swaps,
            "guidelines": [
                "Prioritize non-starchy vegetables (leafy greens, peppers, broccoli) on half your plate.",
                "Combine complex carbohydrates with quality protein and healthy fats to blunt absorption velocity.",
                "Substitute refined white starches with sprouted grains, legumes, or cauliflower alternatives.",
                "Maintain consistent hydration with water and herbal infusions rather than caloric beverages."
            ]
        },
        "source": "simulation",
        "disclaimer": "Nutritional recommendations are for educational simulation purposes. Consult a licensed healthcare provider."
    }
