/**
 * GlucoGuard Clinical Alert & Emergency Incident Model (Module M7)
 *
 * Persists clinical emergency alerts, caregiver escalations,
 * and simulated SOS ambulance dispatches.
 *
 * @module models/alert.model
 */

const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    alertId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
      default: 'usr_patient_03'
    },
    deviceId: {
      type: String,
      required: true,
      trim: true,
      default: 'CGM-SENSOR-SIM'
    },
    glucose: {
      type: Number,
      required: true,
      min: [40, 'Glucose cannot fall below physiological floor of 40 mg/dL'],
      max: [400, 'Glucose cannot exceed physiological ceiling of 400 mg/dL']
    },
    rateOfChange: {
      type: Number,
      default: 0.0
    },
    alertType: {
      type: String,
      required: true,
      enum: ['CRITICAL_HYPO', 'WARNING_HYPO', 'CRITICAL_HYPER', 'WARNING_HYPER']
    },
    severity: {
      type: String,
      required: true,
      enum: ['CRITICAL', 'WARNING']
    },
    status: {
      type: String,
      required: true,
      enum: ['triggered', 'acknowledged', 'caregiver_escalated', 'sos_dispatched', 'resolved'],
      default: 'triggered'
    },
    stage: {
      type: Number,
      enum: [1, 2, 3],
      default: 1
    },
    countdownSeconds: {
      type: Number,
      default: 60
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    actionProtocol: {
      type: String,
      default: ''
    },
    actionTaken: {
      type: String,
      default: null
    },
    acknowledgedBy: {
      type: String,
      default: null
    },
    acknowledgedAt: {
      type: Date,
      default: null
    },
    caregiverNotified: {
      type: Boolean,
      default: false
    },
    caregiverNotifiedAt: {
      type: Date,
      default: null
    },
    simulatedSos: {
      dispatched: {
        type: Boolean,
        default: false
      },
      vehicleId: {
        type: String,
        default: null
      },
      etaMinutes: {
        type: Number,
        default: null
      },
      coords: {
        lat: { type: Number, default: 13.0827 },
        lng: { type: Number, default: 80.2707 }
      },
      dispatchedAt: {
        type: Date,
        default: null
      }
    },
    source: {
      type: String,
      required: true,
      default: 'simulation',
      enum: ['simulation']
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound index for chronological querying per user
alertSchema.index({ userId: 1, timestamp: -1 });

const Alert = mongoose.models.Alert || mongoose.model('Alert', alertSchema);

module.exports = Alert;
