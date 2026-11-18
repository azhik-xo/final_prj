/**
 * GlucoGuard Clinical Alert & Emergency Controller (Module M7)
 *
 * REST endpoint handlers for active alerts, patient acknowledgment,
 * caregiver escalation, and simulated EMS SOS dispatch.
 *
 * @module controllers/alert.controller
 */

const mongoose = require('mongoose');
const Alert = require('../models/alert.model');
const { alertEngine } = require('../modules/alerts/alertEngine');
const {
  broadcastAlert,
  broadcastAlertAcknowledged,
  broadcastSosStatus
} = require('../sockets/cgmSocket');

/**
 * GET /api/v1/alerts/active
 * Retrieve current active unacknowledged alert for the patient.
 */
async function getActiveAlert(req, res) {
  try {
    const { userId = 'usr_patient_03' } = req.query;

    let activeAlert = alertEngine.getActiveAlert(userId);

    // If not in memory, query MongoDB
    if (!activeAlert && mongoose.connection.readyState === 1) {
      activeAlert = await Alert.findOne({
        userId,
        status: { $in: ['triggered', 'caregiver_escalated', 'sos_dispatched'] }
      })
        .sort({ timestamp: -1 })
        .lean();
    }

    return res.status(200).json({
      success: true,
      status: 'ok',
      hasActiveAlert: !!activeAlert,
      data: activeAlert || null,
      source: 'simulation'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: `Failed to fetch active alert: ${err.message}`,
      source: 'simulation'
    });
  }
}

/**
 * POST /api/v1/alerts/acknowledge
 * Patient or caregiver confirms alert, canceling emergency escalation.
 */
async function acknowledgeAlert(req, res) {
  try {
    const {
      alertId,
      acknowledgedBy = 'patient',
      actionTaken = 'fast_carbs'
    } = req.body;

    if (!alertId) {
      return res.status(400).json({
        success: false,
        status: 'error',
        message: 'alertId is required',
        source: 'simulation'
      });
    }

    const updatedAlert = alertEngine.acknowledgeAlert(alertId, acknowledgedBy, actionTaken);

    // Persist acknowledgment in MongoDB
    if (mongoose.connection.readyState === 1) {
      await Alert.findOneAndUpdate(
        { $or: [{ alertId }, { _id: mongoose.isValidObjectId(alertId) ? alertId : null }] },
        {
          $set: {
            status: 'acknowledged',
            acknowledgedBy,
            acknowledgedAt: new Date(),
            actionTaken
          }
        },
        { new: true }
      );
    }

    // Broadcast acknowledgment event over Socket.IO
    if (updatedAlert) {
      broadcastAlertAcknowledged(updatedAlert);
    }

    return res.status(200).json({
      success: true,
      status: 'ok',
      message: 'Alert successfully acknowledged. Escalation protocol disengaged.',
      data: updatedAlert || { alertId, status: 'acknowledged' },
      source: 'simulation'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: `Failed to acknowledge alert: ${err.message}`,
      source: 'simulation'
    });
  }
}

/**
 * POST /api/v1/alerts/escalate-caregiver
 * Advances unacknowledged alert to Stage 2 (Caregiver SMS/Push).
 */
async function escalateCaregiver(req, res) {
  try {
    const { alertId } = req.body;

    if (!alertId) {
      return res.status(400).json({
        success: false,
        status: 'error',
        message: 'alertId is required',
        source: 'simulation'
      });
    }

    const escalated = alertEngine.escalateToCaregiver(alertId);

    if (mongoose.connection.readyState === 1) {
      await Alert.findOneAndUpdate(
        { $or: [{ alertId }, { _id: mongoose.isValidObjectId(alertId) ? alertId : null }] },
        {
          $set: {
            stage: 2,
            status: 'caregiver_escalated',
            caregiverNotified: true,
            caregiverNotifiedAt: new Date()
          }
        }
      );
    }

    if (escalated) {
      broadcastSosStatus({
        alertId,
        stage: 2,
        status: 'caregiver_escalated',
        caregiverNotified: true
      });
    }

    return res.status(200).json({
      success: true,
      status: 'ok',
      message: 'Alert escalated to Stage 2: Caregiver emergency notification transmitted.',
      data: escalated || { alertId, stage: 2, status: 'caregiver_escalated' },
      source: 'simulation'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: `Failed to escalate to caregiver: ${err.message}`,
      source: 'simulation'
    });
  }
}

/**
 * POST /api/v1/alerts/dispatch-sos
 * Dispatches simulated Stage 3 EMS Ambulance dispatch.
 */
async function dispatchSos(req, res) {
  try {
    const { alertId, coords } = req.body;

    if (!alertId) {
      return res.status(400).json({
        success: false,
        status: 'error',
        message: 'alertId is required',
        source: 'simulation'
      });
    }

    const sosAlert = alertEngine.dispatchSimulatedSos(alertId, coords);

    const sosPayload = sosAlert?.simulatedSos || {
      dispatched: true,
      vehicleId: 'AMB-GLUCO-108',
      etaMinutes: 8,
      coords: coords || { lat: 13.0827, lng: 80.2707 },
      dispatchedAt: new Date()
    };

    if (mongoose.connection.readyState === 1) {
      await Alert.findOneAndUpdate(
        { $or: [{ alertId }, { _id: mongoose.isValidObjectId(alertId) ? alertId : null }] },
        {
          $set: {
            stage: 3,
            status: 'sos_dispatched',
            caregiverNotified: true,
            simulatedSos: sosPayload
          }
        }
      );
    }

    broadcastSosStatus({
      alertId,
      stage: 3,
      status: 'sos_dispatched',
      simulatedSos: sosPayload
    });

    return res.status(200).json({
      success: true,
      status: 'ok',
      message: 'Stage 3 Emergency SOS Dispatched: Simulated ambulance unit routed to location.',
      data: sosAlert || { alertId, stage: 3, simulatedSos: sosPayload },
      source: 'simulation',
      disclaimer: 'SIMULATION ONLY: No actual emergency services (911/112) are contacted.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: `Failed to dispatch simulated SOS: ${err.message}`,
      source: 'simulation'
    });
  }
}

/**
 * GET /api/v1/alerts/history
 * Chronological emergency audit log.
 */
async function getAlertHistory(req, res) {
  try {
    const { userId = 'usr_patient_03', limit = 50 } = req.query;
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    let history = [];
    if (mongoose.connection.readyState === 1) {
      history = await Alert.find({ userId })
        .sort({ timestamp: -1 })
        .limit(parsedLimit)
        .lean();
    } else {
      history = alertEngine.getHistory(userId, parsedLimit);
    }

    return res.status(200).json({
      success: true,
      status: 'ok',
      count: history.length,
      data: history,
      source: 'simulation'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: `Failed to fetch alert history: ${err.message}`,
      source: 'simulation'
    });
  }
}

/**
 * POST /api/v1/alerts/simulate
 * Manually inject a simulated emergency event for testing.
 */
async function simulateAlert(req, res) {
  try {
    const {
      userId = 'usr_patient_03',
      glucose = 48,
      rateOfChange = -2.8,
      deviceId = 'CGM-SENSOR-SIM'
    } = req.body;

    const reading = {
      userId,
      deviceId,
      glucose: Number(glucose),
      rateOfChange: Number(rateOfChange),
      timestamp: new Date()
    };

    const alert = alertEngine.evaluateReading(reading);

    if (alert) {
      broadcastAlert(alert);
      if (mongoose.connection.readyState === 1) {
        await Alert.create(alert);
      }
    }

    return res.status(201).json({
      success: true,
      status: 'ok',
      message: alert ? 'Emergency alert simulated successfully.' : 'Reading within safe limits; no alert generated.',
      data: alert,
      source: 'simulation'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: `Failed to simulate alert: ${err.message}`,
      source: 'simulation'
    });
  }
}

module.exports = {
  getActiveAlert,
  acknowledgeAlert,
  escalateCaregiver,
  dispatchSos,
  getAlertHistory,
  simulateAlert
};
