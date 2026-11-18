/**
 * GlucoGuard Diet Planner & Nutritional Telemetry Routes (Module M5)
 *
 * REST endpoints for meal logging, glycemic excursion analysis,
 * reference food library, and healthy low-GI dietary recommendations.
 *
 * @module routes/diet.routes
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Meal = require('../models/meal.model');
const aiService = require('../services/ai.service');

// Lazy-loaded simulator service to avoid circular dependency
let simulatorService = null;
function getSimulatorService() {
  if (!simulatorService) {
    simulatorService = require('../services/simulator.service');
  }
  return simulatorService;
}

// In-memory fallback cache for offline test execution when MongoDB is not connected
const inMemoryMeals = [];

/**
 * @route POST /api/v1/diet/meals
 * @desc Log a new meal, compute AI glycemic spike prediction, persist to database,
 *       and optionally trigger a simulation meal spike event.
 */
router.post('/meals', async (req, res) => {
  try {
    const {
      userId = 'usr_patient_03',
      name,
      mealType = 'lunch',
      carbs,
      protein = 0,
      fat = 0,
      fiber = 0,
      glycemicIndex = 55,
      calories = 0,
      injectSimulationEvent = false
    } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        status: 'error',
        message: 'Meal name is required',
        source: 'simulation'
      });
    }

    const numCarbs = Number(carbs);
    if (isNaN(numCarbs) || numCarbs < 0) {
      return res.status(400).json({
        success: false,
        status: 'error',
        message: 'Carbohydrates must be a non-negative number',
        source: 'simulation'
      });
    }

    const numProtein = Math.max(0, Number(protein || 0));
    const numFat = Math.max(0, Number(fat || 0));
    const numFiber = Math.max(0, Number(fiber || 0));
    const numGI = Math.max(10, Math.min(100, Number(glycemicIndex || 55)));
    const numCalories = Math.max(0, Number(calories || 0));

    // Compute AI Glycemic Impact Prediction via AI Service Bridge
    const prediction = await aiService.analyzeMealImpact({
      name: name.trim(),
      carbs: numCarbs,
      protein: numProtein,
      fat: numFat,
      fiber: numFiber,
      glycemicIndex: numGI
    });

    const mealDoc = {
      userId: userId.trim(),
      name: name.trim(),
      mealType: ['breakfast', 'lunch', 'dinner', 'snack'].includes(mealType) ? mealType : 'lunch',
      carbs: numCarbs,
      protein: numProtein,
      fat: numFat,
      fiber: numFiber,
      glycemicIndex: numGI,
      giCategory: prediction.giCategory || (numGI < 55 ? 'low' : numGI < 70 ? 'medium' : 'high'),
      calories: numCalories,
      estimatedSpikeMgDl: prediction.estimatedSpikeMgDl || 0,
      timeToPeakMinutes: prediction.timeToPeakMinutes || 45,
      riskLevel: prediction.riskLevel || 'safe',
      source: 'simulation',
      timestamp: new Date()
    };

    let savedMeal;
    if (mongoose.connection.readyState === 1) {
      savedMeal = await Meal.create(mealDoc);
    } else {
      // In-memory fallback
      savedMeal = {
        _id: 'mock_meal_' + Date.now(),
        ...mealDoc,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      inMemoryMeals.unshift(savedMeal);
    }

    // Bridge with Virtual CGM Simulator: inject meal spike event if requested
    if (injectSimulationEvent) {
      try {
        const sim = getSimulatorService();
        if (sim && typeof sim.injectEvent === 'function') {
          sim.injectEvent('meal_spike');
        }
      } catch (simErr) {
        console.warn('[Diet Route] Failed to trigger simulator meal spike:', simErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      status: 'ok',
      message: 'Meal logged and glycemic impact calculated successfully',
      data: {
        meal: savedMeal,
        prediction
      },
      source: 'simulation'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: `Failed to log meal: ${err.message}`,
      source: 'simulation'
    });
  }
});

/**
 * @route GET /api/v1/diet/meals
 * @desc Get chronological list of logged meals for a patient.
 */
router.get('/meals', async (req, res) => {
  try {
    const { userId = 'usr_patient_03', limit = 30 } = req.query;
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));

    let meals = [];
    if (mongoose.connection.readyState === 1) {
      meals = await Meal.find({ userId })
        .sort({ timestamp: -1 })
        .limit(parsedLimit)
        .lean();
    } else {
      meals = inMemoryMeals
        .filter((m) => m.userId === userId)
        .slice(0, parsedLimit);
    }

    return res.status(200).json({
      success: true,
      status: 'ok',
      count: meals.length,
      data: meals,
      source: 'simulation'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: `Failed to fetch meals: ${err.message}`,
      source: 'simulation'
    });
  }
});

/**
 * @route POST /api/v1/diet/analyze
 * @desc Evaluates meal macronutrients and calculates predicted glycemic excursion without saving.
 */
router.post('/analyze', async (req, res) => {
  try {
    const {
      name = 'Preview Meal',
      carbs = 0,
      protein = 0,
      fat = 0,
      fiber = 0,
      glycemicIndex = 55,
      currentGlucose = null
    } = req.body;

    const numCarbs = Math.max(0, Number(carbs || 0));
    const numProtein = Math.max(0, Number(protein || 0));
    const numFat = Math.max(0, Number(fat || 0));
    const numFiber = Math.max(0, Number(fiber || 0));
    const numGI = Math.max(10, Math.min(100, Number(glycemicIndex || 55)));

    const analysis = await aiService.analyzeMealImpact({
      name,
      carbs: numCarbs,
      protein: numProtein,
      fat: numFat,
      fiber: numFiber,
      glycemicIndex: numGI,
      currentGlucose
    });

    return res.status(200).json({
      success: true,
      status: 'ok',
      data: analysis,
      source: 'simulation',
      disclaimer: 'Educational simulation model only. Does not prescribe insulin dosages.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: `Failed to analyze meal: ${err.message}`,
      source: 'simulation'
    });
  }
});

/**
 * @route GET /api/v1/diet/foods
 * @desc Get library of reference diabetic-plate food items.
 */
router.get('/foods', async (req, res) => {
  try {
    const foods = await aiService.getReferenceFoods();
    return res.status(200).json({
      success: true,
      status: 'ok',
      count: foods.length,
      data: foods,
      source: 'simulation'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: `Failed to fetch reference foods: ${err.message}`,
      source: 'simulation'
    });
  }
});

/**
 * @route GET /api/v1/diet/recommendations
 * @desc Get verified low-GI nutritional swaps and diabetic meal guidance.
 */
router.get('/recommendations', async (req, res) => {
  try {
    const recommendations = await aiService.getDietRecommendations();
    return res.status(200).json({
      success: true,
      status: 'ok',
      data: recommendations,
      source: 'simulation',
      disclaimer: 'Nutritional recommendations are for educational simulation purposes only.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: `Failed to fetch dietary recommendations: ${err.message}`,
      source: 'simulation'
    });
  }
});

module.exports = router;
