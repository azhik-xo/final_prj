const mongoose = require('mongoose');

/**
 * Mongoose Schema for Logged Meals & Nutritional Macronutrients (Module M5).
 * Captures meal composition, Glycemic Index, and predicted glycemic spike.
 */
const mealSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      default: 'usr_patient_03',
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Meal name is required'],
      trim: true
    },
    mealType: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
      default: 'lunch',
      required: true
    },
    carbs: {
      type: Number,
      required: [true, 'Carbohydrates count is required'],
      min: [0, 'Carbohydrates cannot be negative'],
      default: 0
    },
    protein: {
      type: Number,
      min: [0, 'Protein cannot be negative'],
      default: 0
    },
    fat: {
      type: Number,
      min: [0, 'Fat cannot be negative'],
      default: 0
    },
    fiber: {
      type: Number,
      min: [0, 'Fiber cannot be negative'],
      default: 0
    },
    glycemicIndex: {
      type: Number,
      min: [10, 'Minimum Glycemic Index is 10'],
      max: [100, 'Maximum Glycemic Index is 100'],
      default: 55
    },
    giCategory: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    calories: {
      type: Number,
      min: [0, 'Calories cannot be negative'],
      default: 0
    },
    estimatedSpikeMgDl: {
      type: Number,
      default: 0
    },
    timeToPeakMinutes: {
      type: Number,
      default: 45
    },
    riskLevel: {
      type: String,
      enum: ['safe', 'moderate', 'high_spike'],
      default: 'safe'
    },
    source: {
      type: String,
      required: true,
      default: 'simulation'
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

mealSchema.index({ userId: 1, timestamp: -1 });

const Meal = mongoose.models.Meal || mongoose.model('Meal', mealSchema);

module.exports = Meal;
