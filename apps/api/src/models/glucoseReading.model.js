const mongoose = require('mongoose');

/**
 * Mongoose Schema for Continuous Glucose Monitoring (CGM) Telemetry Readings.
 * Strictly enforces simulation metadata and non-device safety attributes.
 */
const glucoseReadingSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    userId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    persona: {
      type: String,
      trim: true
    },
    glucose: {
      type: Number,
      required: true,
      min: [40, 'Glucose reading cannot fall below physiological limit of 40 mg/dL'],
      max: [400, 'Glucose reading cannot exceed physiological limit of 400 mg/dL']
    },
    unit: {
      type: String,
      required: true,
      default: 'mg/dL'
    },
    trend: {
      type: String,
      enum: ['rising_rapidly', 'rising', 'stable', 'falling', 'falling_rapidly', 'double_rising', 'double_falling'],
      default: 'stable'
    },
    trendArrow: {
      type: String,
      default: '→'
    },
    rateOfChange: {
      type: Number,
      default: 0
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    activeEvent: {
      type: String,
      default: null
    },
    batteryLevel: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    source: {
      type: String,
      required: true,
      enum: ['simulation', 'device'],
      default: 'simulation' // Mandatory simulation identifier per ADR-007
    }
  },
  {
    timestamps: true,
    collection: 'GlucoseReadings'
  }
);

// Compound indexes for performant historical queries and time-series aggregation
glucoseReadingSchema.index({ deviceId: 1, timestamp: -1 });
glucoseReadingSchema.index({ userId: 1, timestamp: -1 });

glucoseReadingSchema.statics.getRecentHistory = async function (deviceId = null, limit = 50) {
  const query = deviceId ? { deviceId } : {};
  const readings = await this.find(query)
    .sort({ timestamp: -1 })
    .limit(Math.min(200, Math.max(1, limit)))
    .lean();

  return readings.reverse();
};

const GlucoseReading = mongoose.models.GlucoseReading || mongoose.model('GlucoseReading', glucoseReadingSchema, 'GlucoseReadings');

module.exports = GlucoseReading;
