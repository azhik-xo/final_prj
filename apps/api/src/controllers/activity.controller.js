/**
 * GlucoGuard Physical Activity Controller (Module M6)
 *
 * Handles activity logging, clinical safety interlocks,
 * and simulation bridge integration.
 *
 * @module controllers/activity.controller
 */

const mongoose = require('mongoose');
const Activity = require('../models/activity.model');
const aiService = require('../services/ai.service');

// Lazy-loaded simulator service to avoid circular dependency
let simulatorService = null;
function getSimulatorService() {
  if (!simulatorService) {
    simulatorService = require('../services/simulator.service');
  }
  return simulatorService;
}

// In-memory fallback for offline test environments
const inMemoryActivities = [];

/**
 * Log a new workout session with AI safety interlock evaluation.
 */
async function logActivity(req, res) {
  try {
    const {
      userId = 'usr_patient_03',
      activityType = 'brisk_walking',
      name = 'Brisk Walking Session',
      intensity = 'moderate',
      durationMinutes = 30,
      startGlucose = 125,
      rateOfChange = 0.0,
      bodyWeightKg = 70,
      injectSimulationEvent = true
    } = req.body;

    const numDuration = Number(durationMinutes);
    if (isNaN(numDuration) || numDuration < 1) {
      return res.status(400).json({
        success: false,
        status: 'error',
        message: 'Duration must be at least 1 minute',
        source: 'simulation'
      });
    }

    const numGlucose = Math.max(40, Math.min(400, Number(startGlucose || 120)));
    const cleanName = (name && typeof name === 'string' && name.trim()) ? name.trim() : 'Physical Activity';

    // Evaluate workout plan via AI Engine bridge
    const advice = await aiService.evaluateWorkoutPlan({
      activityId: activityType,
      activityName: cleanName,
      durationMinutes: numDuration,
      intensity,
      currentGlucose: numGlucose,
      rateOfChange: Number(rateOfChange || 0),
      bodyWeightKg: Number(bodyWeightKg || 70)
    });

    const activityDoc = {
      userId: userId.trim(),
      activityType,
      name: cleanName,
      intensity: ['low', 'moderate', 'high'].includes(intensity) ? intensity : 'moderate',
      durationMinutes: numDuration,
      caloriesBurned: advice.caloriesBurned || 0,
      startGlucose: numGlucose,
      estimatedDrawdownMgDl: advice.estimatedDrawdownMgDl || 0,
      projectedPostGlucose: advice.projectedPostGlucose || numGlucose,
      safetyStatus: advice.safetyStatus || 'safe',
      source: 'simulation',
      timestamp: new Date()
    };

    let savedActivity;
    if (mongoose.connection.readyState === 1) {
      savedActivity = await Activity.create(activityDoc);
    } else {
      savedActivity = {
        _id: 'mock_act_' + Date.now(),
        ...activityDoc,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      inMemoryActivities.unshift(savedActivity);
    }

    // Bridge with Virtual CGM Simulator: if permitted and simulation is active, inject exercise event
    if (injectSimulationEvent && advice.isSafe) {
      try {
        const sim = getSimulatorService();
        if (sim && typeof sim.injectEvent === 'function') {
          sim.injectEvent('exercise');
        }
      } catch (simErr) {
        console.warn('[Activity Controller] Failed to trigger simulator exercise event:', simErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      status: 'ok',
      message: advice.isSafe
        ? 'Workout logged successfully. Glucose drawdown estimated.'
        : `Workout logged with clinical safety lockout: ${advice.safetyTitle}`,
      data: {
        activity: savedActivity,
        advice
      },
      source: 'simulation',
      disclaimer: 'Physical activity simulation model only. Consult physician before starting exercise regimen.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: `Failed to log activity: ${err.message}`,
      source: 'simulation'
    });
  }
}

/**
 * Retrieve patient's workout activity history.
 */
async function getActivities(req, res) {
  try {
    const { userId = 'usr_patient_03', limit = 30 } = req.query;
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));

    let activities = [];
    if (mongoose.connection.readyState === 1) {
      activities = await Activity.find({ userId })
        .sort({ timestamp: -1 })
        .limit(parsedLimit)
        .lean();
    } else {
      activities = inMemoryActivities
        .filter((a) => a.userId === userId)
        .slice(0, parsedLimit);
    }

    return res.status(200).json({
      success: true,
      status: 'ok',
      count: activities.length,
      data: activities,
      source: 'simulation'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: `Failed to fetch activities: ${err.message}`,
      source: 'simulation'
    });
  }
}

/**
 * Rapid safety interlock evaluation against given glucose and trend.
 */
async function getSafetyCheck(req, res) {
  try {
    const { currentGlucose = 120, rateOfChange = 0, intensity = 'moderate' } = req.query;
    const safety = await aiService.getWorkoutSafetyCheck(
      Number(currentGlucose),
      Number(rateOfChange),
      intensity
    );

    return res.status(200).json({
      success: true,
      status: 'ok',
      data: safety,
      source: 'simulation',
      disclaimer: 'Clinical safety interlocks based on ADA exercise guidelines.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: `Failed to perform safety check: ${err.message}`,
      source: 'simulation'
    });
  }
}

/**
 * Retrieve reference catalog of physical activities.
 */
async function getReferenceActivities(req, res) {
  try {
    const catalog = await aiService.getWorkoutActivities();
    return res.status(200).json({
      success: true,
      status: 'ok',
      count: catalog.length,
      data: catalog,
      source: 'simulation'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: `Failed to fetch reference activities: ${err.message}`,
      source: 'simulation'
    });
  }
}

/**
 * Return general activity recommendations and pre-workout snack guidance.
 */
async function getRecommendations(req, res) {
  try {
    return res.status(200).json({
      success: true,
      status: 'ok',
      data: {
        guidelines: [
          'Verify blood glucose before starting: 90–250 mg/dL is the target safe training zone.',
          'Always carry 15g of fast-acting simple carbohydrates (juice, glucose tabs) during workouts.',
          'For sessions longer than 45 minutes, consume a 15–20g complex carb + protein snack.',
          'Stay hydrated: drink 250ml water every 20 minutes of moderate-to-vigorous exercise.',
          'If blood sugar is >250 mg/dL, avoid high-intensity sprints to prevent counter-regulatory ketosis.'
        ],
        emergencyChecklist: [
          'Stop physical exertion immediately if feeling shaky, dizzy, lightheaded, or sweating abnormally.',
          'Check blood glucose promptly.',
          'Follow the Rule of 15: 15g fast carbs, wait 15 minutes, recheck until >100 mg/dL.'
        ]
      },
      source: 'simulation'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: `Failed to fetch workout recommendations: ${err.message}`,
      source: 'simulation'
    });
  }
}

module.exports = {
  logActivity,
  getActivities,
  getSafetyCheck,
  getReferenceActivities,
  getRecommendations
};
