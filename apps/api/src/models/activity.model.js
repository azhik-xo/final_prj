/**
 * GlucoGuard Physical Activity & Workout Telemetry Model (Module M6)
 *
 * Persists logged workout sessions, glycemic safety assessments,
 * and estimated glucose drawdown kinetics.
 *
 * @module models/activity.model
 */

const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true,
      default: 'usr_patient_03'
    },
    activityType: {
      type: String,
      required: true,
      trim: true,
      default: 'brisk_walking'
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    intensity: {
      type: String,
      enum: ['low', 'moderate', 'high'],
      default: 'moderate'
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: [1, 'Workout duration must be at least 1 minute'],
      max: [300, 'Workout duration exceeds simulated maximum']
    },
    caloriesBurned: {
      type: Number,
      default: 0,
      min: 0
    },
    startGlucose: {
      type: Number,
      required: true,
      min: [40, 'Glucose cannot fall below physiological floor of 40 mg/dL'],
      max: [400, 'Glucose cannot exceed physiological ceiling of 400 mg/dL']
    },
    estimatedDrawdownMgDl: {
      type: Number,
      default: 0,
      max: 0,
      min: -150
    },
    projectedPostGlucose: {
      type: Number,
      min: [40, 'Projected glucose clamped to physiological minimum 40 mg/dL'],
      max: [400, 'Projected glucose clamped to physiological maximum 400 mg/dL']
    },
    safetyStatus: {
      type: String,
      enum: ['safe', 'locked_hypo', 'caution_hyper'],
      default: 'safe'
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

// Compound index for chronological querying per patient
activitySchema.index({ userId: 1, timestamp: -1 });

// Ensure strict physiological bounds before validation
activitySchema.pre('validate', function (next) {
  if (this.startGlucose !== undefined) {
    this.startGlucose = Math.max(40, Math.min(400, Math.round(this.startGlucose * 10) / 10));
  }
  if (this.projectedPostGlucose !== undefined) {
    this.projectedPostGlucose = Math.max(40, Math.min(400, Math.round(this.projectedPostGlucose * 10) / 10));
  }
  next();
});

const Activity = mongoose.models.Activity || mongoose.model('Activity', activitySchema);

module.exports = Activity;
