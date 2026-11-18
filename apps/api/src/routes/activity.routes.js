/**
 * GlucoGuard Physical Activity & Workout Routes (Module M6)
 *
 * REST endpoints for activity logging, safety interlock evaluations,
 * and exercise drawdown kinetics.
 *
 * @module routes/activity.routes
 */

const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');

/**
 * @route POST /api/v1/activity/logs
 * @desc Log an exercise session, evaluate safety, and compute drawdown.
 */
router.post('/logs', activityController.logActivity);

/**
 * @route GET /api/v1/activity/logs
 * @desc Retrieve historical exercise logs.
 */
router.get('/logs', activityController.getActivities);

/**
 * @route GET /api/v1/activity/safety-check
 * @desc Rapid safety check for current glucose level.
 */
router.get('/safety-check', activityController.getSafetyCheck);

/**
 * @route GET /api/v1/activity/activities
 * @desc Get catalog of reference physical activities.
 */
router.get('/activities', activityController.getReferenceActivities);

/**
 * @route GET /api/v1/activity/recommendations
 * @desc Get general exercise safety guidelines and snack rules.
 */
router.get('/recommendations', activityController.getRecommendations);

module.exports = router;
