const Meal = require('../models/meal.model');
const aiService = require('../services/ai.service');
const { broadcastEvent } = require('../sockets/cgmSocket');

/**
 * Controller for AI Diet Planner (Module M5).
 */
class DietController {
  /**
   * Logs a patient meal, queries the AI engine for predicted glycemic spike,
   * stores the meal in MongoDB, and triggers a live meal_spike simulation bridge.
   *
   * POST /api/v1/diet/meals
   */
  async logMeal(req, res) {
    try {
      const {
        name,
        mealType = 'lunch',
        carbs,
        protein = 0,
        fat = 0,
        fiber = 0,
        glycemicIndex = 55,
        calories = 0,
        userId = 'usr_patient_03',
        currentGlucose = null
      } = req.body;

      if (!name || carbs === undefined || carbs === null) {
        return res.status(400).json({
          status: 'error',
          error: 'Meal name and carbohydrates count are required'
        });
      }

      if (Number(carbs) < 0) {
        return res.status(400).json({
          status: 'error',
          error: 'Carbohydrates cannot be negative'
        });
      }

      // Query AI Engine for physiological excursion prediction
      const analysis = await aiService.analyzeMealImpact({
        name,
        carbs: Number(carbs),
        protein: Number(protein),
        fat: Number(fat),
        fiber: Number(fiber),
        glycemicIndex: Number(glycemicIndex),
        currentGlucose: currentGlucose ? Number(currentGlucose) : null
      });

      // Persist in MongoDB
      const meal = new Meal({
        userId,
        name: name.trim(),
        mealType,
        carbs: Number(carbs),
        protein: Number(protein),
        fat: Number(fat),
        fiber: Number(fiber),
        glycemicIndex: Number(glycemicIndex),
        giCategory: analysis.giCategory || 'medium',
        calories: Number(calories),
        estimatedSpikeMgDl: analysis.estimatedSpikeMgDl || 0,
        timeToPeakMinutes: analysis.timeToPeakMinutes || 45,
        riskLevel: analysis.riskLevel || 'safe',
        source: 'simulation',
        timestamp: new Date()
      });

      await meal.save();

      // Broadcast metabolic event to connected clients via Socket.IO
      if (typeof broadcastEvent === 'function') {
        broadcastEvent({
          activeEvent: 'meal_spike',
          mealName: meal.name,
          spikeMgDl: meal.estimatedSpikeMgDl,
          timeToPeak: meal.timeToPeakMinutes,
          source: 'simulation'
        });
      }

      // Bridge event to active SimulatorEngine instance if running
      try {
        const simulatorRoutes = require('../routes/simulator.routes');
        const simulatorEngine = simulatorRoutes.getSimulatorInstance
          ? simulatorRoutes.getSimulatorInstance()
          : null;

        if (simulatorEngine && simulatorEngine.isRunning) {
          simulatorEngine.injectEvent('meal_spike', {
            peakRise: meal.estimatedSpikeMgDl,
            peakTime: meal.timeToPeakMinutes
          });
        }
      } catch (bridgeErr) {
        // Non-fatal bridge warning
      }

      return res.status(201).json({
        status: 'success',
        data: {
          meal,
          prediction: analysis
        },
        source: 'simulation',
        disclaimer: 'Nutritional simulation model only. Does not prescribe insulin.'
      });
    } catch (err) {
      console.error('[DietController] Error logging meal:', err);
      return res.status(500).json({
        status: 'error',
        error: err.message || 'Failed to log meal'
      });
    }
  }

  /**
   * Retrieves logged meals for patient.
   *
   * GET /api/v1/diet/meals
   */
  async getMeals(req, res) {
    try {
      const { userId = 'usr_patient_03', limit = 20 } = req.query;

      const meals = await Meal.find({ userId })
        .sort({ timestamp: -1 })
        .limit(Math.min(100, Math.max(1, Number(limit))));

      return res.status(200).json({
        status: 'success',
        count: meals.length,
        data: meals,
        source: 'simulation'
      });
    } catch (err) {
      console.error('[DietController] Error fetching meals:', err);
      return res.status(500).json({
        status: 'error',
        error: err.message || 'Failed to fetch meals'
      });
    }
  }

  /**
   * Retrieves curated low-GI diabetic food substitutions.
   *
   * GET /api/v1/diet/recommendations
   */
  async getRecommendations(req, res) {
    try {
      const data = await aiService.getDietRecommendations();
      return res.status(200).json({
        status: 'success',
        data,
        source: 'simulation',
        disclaimer: 'Educational dietary recommendations only. Consult your physician or dietitian.'
      });
    } catch (err) {
      console.error('[DietController] Error fetching recommendations:', err);
      return res.status(500).json({
        status: 'error',
        error: err.message || 'Failed to fetch recommendations'
      });
    }
  }

  /**
   * Retrieves reference food database.
   *
   * GET /api/v1/diet/foods
   */
  async getReferenceFoods(req, res) {
    try {
      const foods = await aiService.getReferenceFoods();
      return res.status(200).json({
        status: 'success',
        count: Array.isArray(foods) ? foods.length : 0,
        data: foods,
        source: 'simulation'
      });
    } catch (err) {
      console.error('[DietController] Error fetching foods:', err);
      return res.status(500).json({
        status: 'error',
        error: err.message || 'Failed to fetch reference foods'
      });
    }
  }
}

module.exports = new DietController();
