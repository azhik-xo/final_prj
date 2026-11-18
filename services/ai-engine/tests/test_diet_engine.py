"""
Unit and Integration Tests for GlucoGuard AI Diet Planner (Module M5)
Author: Developer AI
Architectural References: ADR-007, ADR-009
"""

import pytest
from fastapi.testclient import TestClient

from main import app
from models.diet_analyzer import DietAnalyzer, REFERENCE_FOODS, DIABETIC_FOOD_SWAPS

client = TestClient(app)


@pytest.fixture
def diet_analyzer():
    return DietAnalyzer()


def test_reference_foods_database_integrity(diet_analyzer):
    """Verifies reference food database contains all essential diabetic plate items."""
    foods = diet_analyzer.get_reference_foods()
    assert len(foods) >= 6

    for food in foods:
        assert "id" in food
        assert "name" in food
        assert food["carbs"] >= 0
        assert food["protein"] >= 0
        assert food["fat"] >= 0
        assert food["fiber"] >= 0
        assert 10 <= food["glycemicIndex"] <= 100
        assert food["giCategory"] in ["low", "medium", "high"]


def test_high_gi_causes_higher_spike_than_low_gi(diet_analyzer):
    """Verifies that for identical carbohydrate mass, high GI food produces higher excursion than low GI food."""
    carbs = 45.0

    low_gi_result = diet_analyzer.estimate_glycemic_excursion(
        carbs=carbs,
        protein=5.0,
        fat=3.0,
        fiber=5.0,
        glycemic_index=35.0,  # Low GI
        current_glucose=100.0
    )

    high_gi_result = diet_analyzer.estimate_glycemic_excursion(
        carbs=carbs,
        protein=5.0,
        fat=3.0,
        fiber=0.0,
        glycemic_index=85.0,  # High GI
        current_glucose=100.0
    )

    assert high_gi_result["estimatedSpikeMgDl"] > low_gi_result["estimatedSpikeMgDl"]
    assert low_gi_result["giCategory"] == "low"
    assert high_gi_result["giCategory"] == "high"


def test_fiber_and_fat_blunt_glycemic_spike(diet_analyzer):
    """Verifies that dietary fiber and fat delay absorption and reduce peak spike."""
    base_result = diet_analyzer.estimate_glycemic_excursion(
        carbs=50.0,
        protein=2.0,
        fat=1.0,
        fiber=1.0,
        glycemic_index=70.0,
        current_glucose=110.0
    )

    buffered_result = diet_analyzer.estimate_glycemic_excursion(
        carbs=50.0,
        protein=15.0,
        fat=12.0,
        fiber=8.0,
        glycemic_index=70.0,
        current_glucose=110.0
    )

    # Fiber and fat must blunt the magnitude of the peak
    assert buffered_result["estimatedSpikeMgDl"] < base_result["estimatedSpikeMgDl"]

    # Gastric emptying delay must extend the time to peak
    assert buffered_result["timeToPeakMinutes"] >= base_result["timeToPeakMinutes"]


def test_excursion_bounds_and_physiological_clamping(diet_analyzer):
    """Verifies estimated spike is clamped between 0 and 150 mg/dL, and trajectory within [40, 400] mg/dL."""
    # Test extreme carbohydrate intake
    extreme_result = diet_analyzer.estimate_glycemic_excursion(
        carbs=350.0,
        protein=0.0,
        fat=0.0,
        fiber=0.0,
        glycemic_index=100.0,
        current_glucose=250.0
    )

    assert extreme_result["estimatedSpikeMgDl"] <= 150.0
    assert extreme_result["projectedPeakGlucose"] <= 400.0

    # Test trajectory points
    trajectory = extreme_result["trajectory"]
    assert len(trajectory) == 13  # 0 to 120 by 10
    for point in trajectory:
        assert 40.0 <= point["projectedGlucose"] <= 400.0


def test_zero_carbs_produces_zero_spike(diet_analyzer):
    """Verifies pure protein/fat with zero carbs yields zero glycemic spike."""
    zero_carb = diet_analyzer.estimate_glycemic_excursion(
        carbs=0.0,
        protein=30.0,
        fat=15.0,
        fiber=0.0,
        glycemic_index=15.0,
        current_glucose=105.0
    )

    assert zero_carb["estimatedSpikeMgDl"] == 0.0
    assert zero_carb["riskLevel"] == "safe"


def test_diet_swaps_library_structure(diet_analyzer):
    """Verifies low-GI nutritional swaps library returns actionable alternatives."""
    swaps = diet_analyzer.get_swaps()
    assert len(swaps) >= 4

    for swap in swaps:
        assert "originalFood" in swap
        assert "recommendedSwap" in swap
        assert swap["recommendedGi"] < swap["originalGi"]
        assert "glycemicBenefit" in swap


def test_api_endpoint_diet_analyze():
    """Integration test for POST /api/v1/ai/diet/analyze."""
    payload = {
        "name": "Steel-Cut Oats Bowl",
        "carbs": 32.0,
        "protein": 8.0,
        "fat": 6.0,
        "fiber": 6.0,
        "glycemicIndex": 42.0,
        "currentGlucose": 115.0
    }

    response = client.post("/api/v1/ai/diet/analyze", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "success"
    assert data["source"] == "simulation"
    assert "data" in data

    res = data["data"]
    assert res["estimatedSpikeMgDl"] >= 0.0
    assert 30 <= res["timeToPeakMinutes"] <= 80
    assert len(res["trajectory"]) > 0


def test_api_endpoint_diet_foods():
    """Integration test for GET /api/v1/ai/diet/foods."""
    response = client.get("/api/v1/ai/diet/foods")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "success"
    assert data["count"] >= 6
    assert isinstance(data["data"], list)


def test_api_endpoint_diet_recommendations():
    """Integration test for GET /api/v1/ai/diet/recommendations."""
    response = client.get("/api/v1/ai/diet/recommendations")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "success"
    assert "swaps" in data["data"]
    assert "guidelines" in data["data"]
    assert data["source"] == "simulation"
