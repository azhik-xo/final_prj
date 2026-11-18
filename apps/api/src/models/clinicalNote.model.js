/**
 * GlucoGuard Clinical Note Model (Module M8)
 *
 * Mongoose Schema for physician consultation notes, clinical impressions,
 * and educational lifestyle/dietary guidance.
 *
 * Safety Enforcement (ADR-007 / ADR-012):
 * - Strictly non-prescriptive: No drug or insulin titration guidance.
 * - Mandatory simulation metadata and non-device disclaimer.
 *
 * @module models/clinicalNote.model
 */

const mongoose = require('mongoose');

const clinicalNoteSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: [true, 'Patient ID is required'],
      default: 'VP-03',
      trim: true,
      index: true
    },
    doctorName: {
      type: String,
      required: [true, 'Doctor name is required'],
      default: 'Dr. Evelyn Reed, MD (Endocrinology)',
      trim: true
    },
    noteType: {
      type: String,
      enum: ['routine_review', 'urgent_consult', 'therapy_adjustment'],
      default: 'routine_review',
      required: true
    },
    assessment: {
      type: String,
      required: [true, 'Clinical assessment is required'],
      trim: true
    },
    recommendations: {
      type: String,
      required: [true, 'Clinical recommendations are required'],
      trim: true,
      validate: {
        validator: function (val) {
          // Strictly reject direct insulin titration or drug prescription language
          const forbiddenPattern = /\b\d+\s*(units?|iu|u)\s*(of\s*)?(insulin|humalog|novolog|lantus|tresiba|basaglar)/i;
          return !forbiddenPattern.test(val);
        },
        message: 'Clinical recommendations must NOT prescribe specific insulin units or drug titration plans per ADR-007.'
      }
    },
    tirSummary: {
      inRangePercent: { type: Number, default: null },
      cvPercent: { type: Number, default: null },
      gmiPercent: { type: Number, default: null }
    },
    source: {
      type: String,
      required: true,
      default: 'simulation',
      immutable: true
    },
    disclaimer: {
      type: String,
      default: 'Simulation Only: Educational prototype clinical note. NOT intended for direct medical diagnosis or prescription.'
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

// Compound index for chronological querying by patient
clinicalNoteSchema.index({ patientId: 1, timestamp: -1 });

const ClinicalNote = mongoose.models.ClinicalNote || mongoose.model('ClinicalNote', clinicalNoteSchema);

module.exports = ClinicalNote;
