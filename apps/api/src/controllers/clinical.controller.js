/**
 * GlucoGuard Clinical & Caregiver Oversight Controller (Module M8)
 *
 * Implements endpoints for multi-patient caregiver monitoring, international
 * consensus Ambulatory Glucose Profile (AGP) report computation, physician
 * consultation notes, and remote caregiver alert acknowledgment.
 *
 * Standards: Battelino et al. (Diabetes Care 2019) / ADR-007, ADR-012
 *
 * @module controllers/clinical.controller
 */

const mongoose = require('mongoose');
const ClinicalNote = require('../models/clinicalNote.model');
const GlucoseReading = require('../models/glucoseReading.model');
const { getAllPersonas, getPersona } = require('../simulator/personas');
const simulatorService = require('../services/simulator.service');
const { alertEngine } = require('../modules/alerts/alertEngine');
const { broadcastAlertAcknowledged } = require('../sockets/cgmSocket');

// In-memory fallback for clinical notes when MongoDB is disconnected/testing
const inMemoryNotes = [];

// Seed consultation notes for realistic demonstration
const SEED_NOTES = {
  'VP-03': [
    {
      _id: 'seed_note_vp03_01',
      patientId: 'VP-03',
      doctorName: 'Dr. Evelyn Reed, MD (Endocrinology)',
      noteType: 'routine_review',
      assessment: 'Patient displays high glycemic variability (CV ~41%) and intermittent nocturnal hypoglycemia excursions. Time-in-Range is currently sub-optimal at ~58%. High risk of postprandial spikes following high-GI evening meals.',
      recommendations: 'Prioritize low-GI complex carbohydrate substitutions for dinner. Ensure a 15-minute pre-bolus buffer for rapid carbs. Maintain bedside fast-acting glucose tablets (15g Rule of 15). Daily 20-minute light walking post-lunch to assist glucose drawdown.',
      tirSummary: { inRangePercent: 58.2, cvPercent: 41.4, gmiPercent: 7.4 },
      source: 'simulation',
      disclaimer: 'Simulation Only: Educational prototype clinical note. NOT intended for direct medical diagnosis or prescription.',
      timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
    }
  ],
  'VP-02': [
    {
      _id: 'seed_note_vp02_01',
      patientId: 'VP-02',
      doctorName: 'Dr. Evelyn Reed, MD (Endocrinology)',
      noteType: 'routine_review',
      assessment: 'Excellent glycemic control observed with TIR at 76%. Glycemic variability is within target (CV 28.5%). Minor afternoon dip observed on workout days.',
      recommendations: 'Continue current nutritional and exercise regimen. Consider a 10g complex carb snack 30 minutes prior to vigorous aerobic activity.',
      tirSummary: { inRangePercent: 76.5, cvPercent: 28.5, gmiPercent: 6.7 },
      source: 'simulation',
      disclaimer: 'Simulation Only: Educational prototype clinical note. NOT intended for direct medical diagnosis or prescription.',
      timestamp: new Date(Date.now() - 72 * 3600 * 1000).toISOString()
    }
  ]
};

// Caregiver metadata mapping for the 6 Virtual Personas
const CAREGIVER_ROSTER = {
  'VP-01': {
    caregiverName: 'Sarah Miller (Self / Health Monitor)',
    relation: 'Self',
    phone: '+1 (555) 012-4411',
    riskTier: 'LOW',
    assignedDoctor: 'Dr. Evelyn Reed, MD'
  },
  'VP-02': {
    caregiverName: 'Marcus Vance',
    relation: 'Spouse',
    phone: '+1 (555) 018-7231',
    riskTier: 'MODERATE',
    assignedDoctor: 'Dr. Evelyn Reed, MD'
  },
  'VP-03': {
    caregiverName: 'Jane Doe',
    relation: 'Spouse / Primary Caregiver',
    phone: '+1 (555) 019-2834',
    riskTier: 'HIGH',
    assignedDoctor: 'Dr. Evelyn Reed, MD'
  },
  'VP-04': {
    caregiverName: 'Robert Chen',
    relation: 'Son',
    phone: '+1 (555) 014-9921',
    riskTier: 'MODERATE',
    assignedDoctor: 'Dr. Alan Morales, MD'
  },
  'VP-05': {
    caregiverName: 'Anita Patel',
    relation: 'Daughter',
    phone: '+1 (555) 016-3382',
    riskTier: 'LOW',
    assignedDoctor: 'Dr. Alan Morales, MD'
  },
  'VP-06': {
    caregiverName: 'Coach Dave Miller',
    relation: 'Athletic Trainer',
    phone: '+1 (555) 011-8854',
    riskTier: 'LOW',
    assignedDoctor: 'Dr. Evelyn Reed, MD'
  }
};

/**
 * Calculates a statistical percentile from a sorted array of numbers.
 * @param {Array<number>} sortedValues - Sorted array of numbers
 * @param {number} p - Percentile between 0 and 100
 * @returns {number}
 */
function calculatePercentile(sortedValues, p) {
  if (!sortedValues || sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];
  const index = (p / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return Math.round((sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight) * 10) / 10;
}

/**
 * Generates a realistic 24-hour physiological glucose series (288 points, 5-min intervals)
 * for a persona when insufficient database readings are available.
 * @param {object} persona
 * @returns {Array<object>}
 */
function generatePhysiological24hSeries(persona) {
  const points = [];
  const base = persona.baseline || 120;
  const vol = persona.volatility || 2.0;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  let currentG = base;
  for (let i = 0; i < 288; i++) {
    const timestamp = new Date(startOfDay.getTime() + i * 5 * 60 * 1000);
    const hour = timestamp.getHours() + timestamp.getMinutes() / 60;

    // Diurnal circadian fluctuation (dawn phenomenon peak at ~7-8 AM, evening peak ~8 PM)
    const dawnEffect = Math.sin(((hour - 3) / 24) * 2 * Math.PI) * (vol * 4.5);

    // Simulated meal spikes (Breakfast ~8:00, Lunch ~13:00, Dinner ~19:30)
    let mealSpike = 0;
    if (hour >= 8 && hour <= 10.5) {
      mealSpike = Math.sin(((hour - 8) / 2.5) * Math.PI) * (vol * 9.0);
    } else if (hour >= 13 && hour <= 15.5) {
      mealSpike = Math.sin(((hour - 13) / 2.5) * Math.PI) * (vol * 11.0);
    } else if (hour >= 19.5 && hour <= 22) {
      mealSpike = Math.sin(((hour - 19.5) / 2.5) * Math.PI) * (vol * 12.0);
    }

    // AR(1) autoregressive noise
    const noise = (Math.random() - 0.5) * (vol * 2.5);
    currentG = 0.85 * currentG + 0.15 * (base + dawnEffect + mealSpike) + noise;

    // Bound to physiological range
    const boundedG = Math.max(45, Math.min(380, Math.round(currentG)));

    points.push({
      glucose: boundedG,
      timestamp,
      hour: timestamp.getHours()
    });
  }

  return points;
}

/**
 * GET /api/v1/clinical/patients
 * Returns all monitored clinical personas with live simulated metrics,
 * risk tiers, trend arrows, and active emergency alert status.
 */
async function getPatients(req, res) {
  try {
    const personas = getAllPersonas();
    const activeEngineStatus = simulatorService.getStatus();
    const activePersonaId = activeEngineStatus.currentPersona?.id;

    const patientRoster = await Promise.all(
      personas.map(async (p) => {
        const caregiverInfo = CAREGIVER_ROSTER[p.id] || {
          caregiverName: 'Primary Contact',
          relation: 'Caregiver',
          phone: '+1 (555) 010-0000',
          riskTier: 'LOW',
          assignedDoctor: 'Dr. Evelyn Reed, MD'
        };

        // Determine current glucose
        let currentGlucose = p.baseline;
        let trend = 'stable';
        let trendArrow = '→';
        let rateOfChange = 0.0;
        let lastReadingTime = new Date().toISOString();

        // If this persona is actively running in the simulator engine, grab live reading
        if (p.id === activePersonaId && activeEngineStatus.currentReading) {
          currentGlucose = activeEngineStatus.currentReading.glucose;
          trend = activeEngineStatus.currentReading.trend || 'stable';
          trendArrow = activeEngineStatus.currentReading.trendArrow || '→';
          rateOfChange = activeEngineStatus.currentReading.rateOfChange || 0.0;
          lastReadingTime = activeEngineStatus.currentReading.timestamp;
        } else if (mongoose.connection.readyState === 1) {
          // Query latest from MongoDB
          try {
            const latest = await GlucoseReading.findOne({
              $or: [{ persona: p.id }, { userId: p.userId }]
            })
              .sort({ timestamp: -1 })
              .lean();

            if (latest) {
              currentGlucose = latest.glucose;
              trend = latest.trend || 'stable';
              trendArrow = latest.trendArrow || '→';
              rateOfChange = latest.rateOfChange || 0.0;
              lastReadingTime = latest.timestamp;
            }
          } catch (e) {
            // Ignore DB error and fallback to persona baseline
          }
        }

        // Check active emergency alert status
        const activeAlert = alertEngine.getActiveAlert(p.userId) || alertEngine.getActiveAlert(p.id) || null;

        // Classify current glycemic state
        let statusCategory = 'in_range';
        if (currentGlucose < 54) statusCategory = 'very_low';
        else if (currentGlucose < 70) statusCategory = 'low';
        else if (currentGlucose > 250) statusCategory = 'very_high';
        else if (currentGlucose > 180) statusCategory = 'high';

        return {
          id: p.id,
          name: p.name,
          userId: p.userId,
          deviceId: p.deviceId,
          baseline: p.baseline,
          targetRange: p.targetRange,
          volatility: p.volatility,
          description: p.description,
          currentGlucose,
          trend,
          trendArrow,
          rateOfChange,
          statusCategory,
          riskTier: caregiverInfo.riskTier,
          caregiver: caregiverInfo,
          activeAlert: activeAlert
            ? {
                alertId: activeAlert.alertId || activeAlert._id,
                severity: activeAlert.severity,
                alertType: activeAlert.alertType,
                title: activeAlert.title,
                message: activeAlert.message,
                stage: activeAlert.escalationStage || (activeAlert.simulatedSos?.dispatched ? 3 : activeAlert.caregiverNotified ? 2 : 1),
                triggeredAt: activeAlert.timestamp,
                caregiverNotified: activeAlert.caregiverNotified
              }
            : null,
          lastReadingTime,
          source: 'simulation'
        };
      })
    );

    return res.status(200).json({
      success: true,
      status: 'ok',
      count: patientRoster.length,
      data: patientRoster,
      source: 'simulation',
      disclaimer: 'Simulation Only: Virtual patient clinical roster for monitoring demonstration.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: `Failed to fetch clinical patient roster: ${err.message}`,
      source: 'simulation'
    });
  }
}

/**
 * GET /api/v1/clinical/agp/:patientId
 * Computes international consensus AGP metrics conforming to ADA / Battelino 2019:
 * 5-Tier Time-in-Range, Glycemic Variability CV, GMI (est. HbA1c),
 * and 24-Hour Percentile Curve (10th, 25th, 50th, 75th, 90th).
 */
async function getAgpReport(req, res) {
  try {
    const { patientId = 'VP-03' } = req.params;

    let persona;
    try {
      persona = getPersona(patientId);
    } catch (e) {
      persona = getPersona('VP-03');
    }

    let rawReadings = [];

    // Attempt to fetch real readings from MongoDB
    if (mongoose.connection.readyState === 1) {
      try {
        rawReadings = await GlucoseReading.find({
          $or: [{ persona: persona.id }, { userId: persona.userId }]
        })
          .sort({ timestamp: -1 })
          .limit(1000)
          .lean();
      } catch (dbErr) {
        // Fall back to synthetic series
      }
    }

    // If insufficient readings exist, generate physiological 24h series for statistical validity
    if (rawReadings.length < 24) {
      const generated = generatePhysiological24hSeries(persona);
      rawReadings = generated;
    } else {
      // Normalize timestamp & hour
      rawReadings = rawReadings.map((r) => ({
        glucose: r.glucose,
        timestamp: new Date(r.timestamp),
        hour: new Date(r.timestamp).getHours()
      }));
    }

    // 1. Time-in-Range (TIR) - 5 Tiers
    const totalCount = rawReadings.length;
    let countVeryLow = 0; // < 54
    let countLow = 0; // 54 - 69
    let countInRange = 0; // 70 - 180
    let countHigh = 0; // 181 - 250
    let countVeryHigh = 0; // > 250
    let sumGlucose = 0;

    const values = [];

    for (const r of rawReadings) {
      const g = r.glucose;
      values.push(g);
      sumGlucose += g;

      if (g < 54) countVeryLow++;
      else if (g < 70) countLow++;
      else if (g <= 180) countInRange++;
      else if (g <= 250) countHigh++;
      else countVeryHigh++;
    }

    const round1 = (val) => Math.round(val * 10) / 10;

    const tir = {
      veryLow: round1((countVeryLow / totalCount) * 100),
      low: round1((countLow / totalCount) * 100),
      inRange: round1((countInRange / totalCount) * 100),
      high: round1((countHigh / totalCount) * 100),
      veryHigh: round1((countVeryHigh / totalCount) * 100),
      targets: {
        inRange: '> 70%',
        high: '< 25%',
        veryHigh: '< 5%',
        low: '< 4%',
        veryLow: '< 1%'
      }
    };

    // 2. Summary Statistics: Mean, SD, CV, GMI
    const meanGlucose = round1(sumGlucose / totalCount);

    const variance = values.reduce((acc, val) => acc + Math.pow(val - meanGlucose, 2), 0) / totalCount;
    const stdDev = round1(Math.sqrt(variance));

    // CV = (SD / Mean) * 100
    const cvPercent = round1((stdDev / meanGlucose) * 100);

    // GMI (Glucose Management Indicator) = 3.31 + 0.02392 * Mean Glucose
    const gmi = round1(3.31 + 0.02392 * meanGlucose);

    // Min and Max
    const minGlucose = Math.min(...values);
    const maxGlucose = Math.max(...values);

    // 3. 24-Hour Ambulatory Glucose Profile Percentile Curve
    // Group readings by hour of day (0..23)
    const hourlyBuckets = Array.from({ length: 24 }, (_, i) => []);
    for (const r of rawReadings) {
      const h = r.hour !== undefined ? r.hour : new Date(r.timestamp).getHours();
      if (h >= 0 && h < 24) {
        hourlyBuckets[h].push(r.glucose);
      }
    }

    const percentileCurve = hourlyBuckets.map((bucket, hour) => {
      const timeLabel = `${String(hour).padStart(2, '0')}:00`;
      if (bucket.length === 0) {
        // Fallback to mean glucose with diurnal sine estimation
        const est = Math.round(persona.baseline + Math.sin(((hour - 6) / 24) * 2 * Math.PI) * (persona.volatility * 6));
        return {
          hour,
          timeLabel,
          p10: Math.max(45, est - 25),
          p25: Math.max(55, est - 12),
          p50: est,
          p75: Math.min(350, est + 15),
          p90: Math.min(380, est + 30),
          count: 0
        };
      }

      const sorted = [...bucket].sort((a, b) => a - b);
      return {
        hour,
        timeLabel,
        p10: calculatePercentile(sorted, 10),
        p25: calculatePercentile(sorted, 25),
        p50: calculatePercentile(sorted, 50),
        p75: calculatePercentile(sorted, 75),
        p90: calculatePercentile(sorted, 90),
        count: sorted.length
      };
    });

    // 4. Modal Day Heatmap Breakdown (hourly averages & status)
    const hourlyHeatmap = percentileCurve.map((pt) => {
      let status = 'in_range';
      if (pt.p50 < 54) status = 'very_low';
      else if (pt.p50 < 70) status = 'low';
      else if (pt.p50 > 250) status = 'very_high';
      else if (pt.p50 > 180) status = 'high';

      return {
        hour: pt.hour,
        timeLabel: pt.timeLabel,
        medianGlucose: pt.p50,
        status
      };
    });

    return res.status(200).json({
      success: true,
      status: 'ok',
      data: {
        patient: {
          id: persona.id,
          name: persona.name,
          userId: persona.userId,
          targetRange: persona.targetRange,
          baseline: persona.baseline,
          volatility: persona.volatility,
          caregiver: CAREGIVER_ROSTER[persona.id] || null
        },
        reportingPeriod: {
          readingsCount: totalCount,
          durationDays: 14,
          dataSufficiency: totalCount >= 288 ? 'Optimal (100% active CGM)' : 'Simulated Sample'
        },
        metrics: {
          meanGlucose,
          stdDev,
          cvPercent,
          cvStatus: cvPercent <= 36 ? 'Target Achieved (<= 36%)' : 'Elevated Glycemic Variability (> 36%)',
          gmi,
          minGlucose,
          maxGlucose
        },
        timeInRange: tir,
        percentileCurve,
        hourlyHeatmap
      },
      source: 'simulation',
      disclaimer: 'Simulation Only: Ambulatory Glucose Profile calculated for educational and simulation evaluation.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: `Failed to compute AGP report: ${err.message}`,
      source: 'simulation'
    });
  }
}

/**
 * POST /api/v1/clinical/notes
 * Creates and persists a physician consultation note.
 * Enforces non-prescriptive rules (no insulin titration per ADR-007).
 */
async function createNote(req, res) {
  try {
    const {
      patientId = 'VP-03',
      doctorName = 'Dr. Evelyn Reed, MD (Endocrinology)',
      noteType = 'routine_review',
      assessment,
      recommendations,
      tirSummary = null
    } = req.body;

    if (!assessment || !assessment.trim()) {
      return res.status(400).json({
        success: false,
        status: 'error',
        message: 'Clinical assessment text is required.',
        source: 'simulation'
      });
    }

    if (!recommendations || !recommendations.trim()) {
      return res.status(400).json({
        success: false,
        status: 'error',
        message: 'Clinical recommendations text is required.',
        source: 'simulation'
      });
    }

    // Safety check: Reject direct insulin titration advice per ADR-007
    const forbiddenPattern = /\b\d+\s*(units?|iu|u)\s*(of\s*)?(insulin|humalog|novolog|lantus|tresiba|basaglar)/i;
    if (forbiddenPattern.test(recommendations)) {
      return res.status(400).json({
        success: false,
        status: 'error',
        message: 'Safety Violation: Clinical notes must NOT prescribe specific insulin units or pharmaceutical titration plans per ADR-007.',
        source: 'simulation'
      });
    }

    let savedNote;

    if (mongoose.connection.readyState === 1) {
      savedNote = await ClinicalNote.create({
        patientId,
        doctorName,
        noteType,
        assessment: assessment.trim(),
        recommendations: recommendations.trim(),
        tirSummary,
        source: 'simulation'
      });
    } else {
      // In-memory fallback
      savedNote = {
        _id: 'note_' + Date.now(),
        patientId,
        doctorName,
        noteType,
        assessment: assessment.trim(),
        recommendations: recommendations.trim(),
        tirSummary,
        source: 'simulation',
        disclaimer: 'Simulation Only: Educational prototype clinical note. NOT intended for direct medical diagnosis or prescription.',
        timestamp: new Date().toISOString()
      };
      inMemoryNotes.unshift(savedNote);
    }

    return res.status(201).json({
      success: true,
      status: 'created',
      message: 'Physician consultation note saved successfully.',
      data: savedNote,
      source: 'simulation'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: `Failed to save clinical note: ${err.message}`,
      source: 'simulation'
    });
  }
}

/**
 * GET /api/v1/clinical/notes/:patientId
 * Retrieves consultation history for a given patient.
 */
async function getNotes(req, res) {
  try {
    const { patientId = 'VP-03' } = req.params;

    let notes = [];

    if (mongoose.connection.readyState === 1) {
      try {
        notes = await ClinicalNote.find({ patientId }).sort({ timestamp: -1 }).lean();
      } catch (e) {
        notes = [];
      }
    }

    // Merge in-memory notes if any
    const matchingInMemory = inMemoryNotes.filter((n) => n.patientId === patientId);
    notes = [...notes, ...matchingInMemory];

    // If still empty, provide the realistic seed notes
    if (notes.length === 0 && SEED_NOTES[patientId]) {
      notes = SEED_NOTES[patientId];
    }

    return res.status(200).json({
      success: true,
      status: 'ok',
      count: notes.length,
      data: notes,
      source: 'simulation'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: `Failed to fetch clinical notes: ${err.message}`,
      source: 'simulation'
    });
  }
}

/**
 * POST /api/v1/clinical/caregiver/acknowledge
 * Caregiver remote emergency acknowledgment for a dependent patient.
 * Stops escalation countdown and marks the alert as acknowledged by caregiver.
 */
async function caregiverAcknowledge(req, res) {
  try {
    const {
      alertId,
      patientId = 'VP-03',
      caregiverName = 'Jane Doe (Spouse)',
      actionTaken = 'contacted_patient_verbal_check'
    } = req.body;

    if (!alertId) {
      return res.status(400).json({
        success: false,
        status: 'error',
        message: 'alertId is required for remote caregiver acknowledgment.',
        source: 'simulation'
      });
    }

    const acknowledgedAlert = alertEngine.acknowledgeAlert(
      alertId,
      `caregiver: ${caregiverName}`,
      actionTaken
    );

    if (acknowledgedAlert) {
      try {
        broadcastAlertAcknowledged(acknowledgedAlert);
      } catch (e) {
        // Broadcast non-fatal
      }

      return res.status(200).json({
        success: true,
        status: 'ok',
        message: `Alert ${alertId} successfully acknowledged remotely by caregiver ${caregiverName}.`,
        data: acknowledgedAlert,
        source: 'simulation'
      });
    }

    return res.status(404).json({
      success: false,
      status: 'error',
      message: `Active alert with ID ${alertId} not found or already acknowledged.`,
      source: 'simulation'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      status: 'error',
      message: `Failed to acknowledge alert as caregiver: ${err.message}`,
      source: 'simulation'
    });
  }
}

module.exports = {
  getPatients,
  getAgpReport,
  createNote,
  getNotes,
  caregiverAcknowledge
};
