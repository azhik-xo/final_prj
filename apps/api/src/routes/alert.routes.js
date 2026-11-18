/**
 * GlucoGuard Clinical Alert & Emergency Routes (Module M7)
 *
 * REST API routes for emergency alerting, multi-stage escalation,
 * patient acknowledgment, and simulated SOS dispatch.
 *
 * @module routes/alert.routes
 */

const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alert.controller');

/**
 * @route GET /api/v1/alerts/active
 * @desc Retrieve the active unacknowledged alert.
 */
router.get('/active', alertController.getActiveAlert);

/**
 * @route POST /api/v1/alerts/acknowledge
 * @desc Confirm patient safety and disengage alert countdown.
 */
router.post('/acknowledge', alertController.acknowledgeAlert);

/**
 * @route POST /api/v1/alerts/escalate-caregiver
 * @desc Escalate alert to Stage 2 (Caregiver SMS/Push).
 */
router.post('/escalate-caregiver', alertController.escalateCaregiver);

/**
 * @route POST /api/v1/alerts/dispatch-sos
 * @desc Dispatch Stage 3 Simulated EMS Ambulance Unit.
 */
router.post('/dispatch-sos', alertController.dispatchSos);

/**
 * @route GET /api/v1/alerts/history
 * @desc Retrieve historical emergency incident records.
 */
router.get('/history', alertController.getAlertHistory);

/**
 * @route POST /api/v1/alerts/simulate
 * @desc Trigger a simulated emergency alert for testing.
 */
router.post('/simulate', alertController.simulateAlert);

module.exports = router;
