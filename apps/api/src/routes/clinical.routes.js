/**
 * GlucoGuard Clinical & Caregiver Portal Routes (Module M8)
 *
 * REST API routes for multi-patient clinical oversight, Ambulatory
 * Glucose Profile (AGP) consensus metrics, physician consultation
 * notes, and remote caregiver emergency alert acknowledgment.
 *
 * Standards: Battelino et al. (Diabetes Care 2019) / ADR-007, ADR-012
 *
 * @module routes/clinical.routes
 */

const express = require('express');
const router = express.Router();
const clinicalController = require('../controllers/clinical.controller');

/**
 * @route GET /api/v1/clinical/patients
 * @desc Retrieve all monitored clinical personas with live telemetry,
 *       risk tiers, and active alert status.
 */
router.get('/patients', clinicalController.getPatients);

/**
 * @route GET /api/v1/clinical/agp/:patientId
 * @desc Compute consensus Ambulatory Glucose Profile (AGP) metrics:
 *       5-tier TIR, Glycemic Variability CV, GMI (est. HbA1c),
 *       and 24-hour percentile curve.
 */
router.get('/agp/:patientId', clinicalController.getAgpReport);

/**
 * @route POST /api/v1/clinical/notes
 * @desc Save physician consultation note with strictly non-prescriptive
 *       lifestyle recommendations (ADR-007).
 */
router.post('/notes', clinicalController.createNote);

/**
 * @route GET /api/v1/clinical/notes/:patientId
 * @desc Retrieve consultation history for a specific patient.
 */
router.get('/notes/:patientId', clinicalController.getNotes);

/**
 * @route POST /api/v1/clinical/caregiver/acknowledge
 * @desc Caregiver remote emergency acknowledgment for a dependent patient.
 */
router.post('/caregiver/acknowledge', clinicalController.caregiverAcknowledge);

module.exports = router;
