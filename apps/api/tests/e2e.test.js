/**
 * GlucoGuard Multi-Module End-to-End System Integration Test (TASK-E2E-01)
 *
 * Validates the complete clinical closed loop across all 8 modules (M1–M8):
 * 1. M1 + M2: Virtual CGM Simulator Engine initialization (VP-03), telemetry streaming, and ingestion.
 * 2. M4: AI Engine short-term forecasting (15m, 30m, 45m).
 * 3. M5: AI Diet Planner macronutrient logging and post-prandial glycemic spike estimation.
 * 4. M6: AI Workout Planner clinical safety checks (hypo lockout vs drawdown) and activity logging.
 * 5. M7: Emergency Response Engine critical threshold alerting (Stage 1 -> Stage 2 -> Stage 3 EMS dispatch).
 * 6. M8: Caregiver remote emergency acknowledgment & multi-patient roster oversight.
 * 7. M8: Doctor Ambulatory Glucose Profile (AGP) report, 5-tier TIR, GMI, CV, and consultation notes.
 *
 * Safety Standards: ADR-001 through ADR-012
 *
 * @module tests/e2e.test
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { alertEngine } = require('../src/modules/alerts/alertEngine');
const simulatorService = require('../src/services/simulator.service');

describe('TASK-E2E-01: Full Monorepo Multi-Module Integration Protocol', () => {
  before(() => {
    alertEngine.reset();
  });

  after(() => {
    simulatorService.stopSimulator();
    alertEngine.reset();
  });

  // STEP 1: M1 & M2 Virtual CGM Simulator & Telemetry Ingestion
  describe('Step 1: Virtual CGM Telemetry & Simulator Lifecycle (M1 + M2)', () => {
    it('initializes and starts VP-03 simulation stream', async () => {
      const startRes = await request(app)
        .post('/api/v1/simulator/start')
        .send({ personaId: 'VP-03', intervalMs: 1500 });

      assert.equal(startRes.status, 200);
      assert.equal(startRes.body.status, 'ok');
      assert.equal(startRes.body.source, 'simulation');
      assert.equal(startRes.body.data.status.isRunning, true);
      assert.equal(startRes.body.data.status.personaId, 'VP-03');
      assert.ok(startRes.body.data.firstReading);
      assert.equal(typeof startRes.body.data.firstReading.glucose, 'number');
    });

    it('ingests live telemetry payload and returns simulated confirmation', async () => {
      const sampleReading = {
        deviceId: 'VIRTUAL_CGM_VP03',
        userId: 'usr_patient_03',
        persona: 'VP-03',
        glucose: 145,
        trend: 'stable',
        trendArrow: '→',
        rateOfChange: 0.1,
        timestamp: new Date().toISOString()
      };

      const ingestRes = await request(app)
        .post('/api/v1/cgm/readings')
        .send(sampleReading);

      assert.equal(ingestRes.status, 201);
      assert.equal(ingestRes.body.status, 'ok');
      assert.equal(ingestRes.body.source, 'simulation');
      assert.equal(ingestRes.body.data.glucose, 145);
    });

    it('retrieves historical telemetry readings with mandatory simulation markers', async () => {
      const histRes = await request(app).get('/api/v1/cgm/history');
      assert.equal(histRes.status, 200);
      assert.equal(histRes.body.status, 'ok');
      assert.equal(histRes.body.source, 'simulation');
      assert.ok(Array.isArray(histRes.body.data));
    });
  });

  // STEP 2: M4 AI Intelligence Engine Forecasting
  describe('Step 2: AI Intelligence Engine Short-Term Forecasting (M4)', () => {
    it('fetches short-term predictions (15m, 30m, 45m) and breach warnings', async () => {
      const predRes = await request(app)
        .get('/api/v1/cgm/prediction')
        .query({ deviceId: 'VIRTUAL_CGM_VP03' });

      assert.equal(predRes.status, 200);
      assert.equal(predRes.body.success, true);
      assert.equal(predRes.body.source, 'simulation');
      assert.ok(predRes.body.data);
      assert.ok(Array.isArray(predRes.body.data.predictions));
      assert.ok('breachWarning' in predRes.body.data);
      assert.ok('modelMetrics' in predRes.body.data);
    });
  });

  // STEP 3: M5 AI Diet Planner
  describe('Step 3: AI Diet Planner Macronutrients & Glycemic Excursion (M5)', () => {
    it('analyzes pre-meal glycemic excursion for a high-carb lunch', async () => {
      const analyzeRes = await request(app)
        .post('/api/v1/diet/analyze')
        .send({
          carbs: 65,
          protein: 20,
          fat: 10,
          fiber: 4,
          glycemicIndex: 72,
          currentGlucose: 130
        });

      assert.equal(analyzeRes.status, 200);
      assert.equal(analyzeRes.body.success, true);
      assert.equal(analyzeRes.body.source, 'simulation');
      assert.ok(analyzeRes.body.data.estimatedSpikeMgDl > 0);
      assert.ok(analyzeRes.body.data.timeToPeakMinutes > 0);
      const traj = analyzeRes.body.data.trajectory || analyzeRes.body.data.projectedTrajectory;
      assert.ok(Array.isArray(traj));
    });

    it('logs a meal and confirms non-prescriptive nutritional recommendations', async () => {
      const mealRes = await request(app)
        .post('/api/v1/diet/meals')
        .send({
          userId: 'usr_patient_03',
          name: 'Brown Rice with Steamed Lentils & Spinach',
          mealType: 'lunch',
          carbs: 45,
          protein: 18,
          fat: 6,
          fiber: 8,
          glycemicIndex: 48,
          calories: 310
        });

      assert.equal(mealRes.status, 201);
      assert.equal(mealRes.body.success, true);
      assert.ok(mealRes.body.data.meal);
      assert.equal(mealRes.body.data.meal.name, 'Brown Rice with Steamed Lentils & Spinach');
      assert.equal(mealRes.body.data.meal.giCategory, 'low');
    });
  });

  // STEP 4: M6 AI Workout Planner & Safety Interlocks
  describe('Step 4: AI Workout Planner & Glycemic Safety Interlocks (M6)', () => {
    it('enforces hypoglycemia workout lockout when glucose is low (<90 mg/dL)', async () => {
      const checkRes = await request(app)
        .get('/api/v1/activity/safety-check')
        .query({ currentGlucose: 78, rateOfChange: -1.2 });

      assert.equal(checkRes.status, 200);
      assert.equal(checkRes.body.success, true);
      assert.equal(checkRes.body.data.safetyStatus, 'locked_hypo');
      assert.equal(checkRes.body.data.isSafe, false);
      assert.match(checkRes.body.data.actionProtocol, /Rule of 15|DO NOT EXERCISE/i);
    });

    it('approves safe exercise when in safe target (100–180 mg/dL) with drawdown prediction', async () => {
      const checkRes = await request(app)
        .get('/api/v1/activity/safety-check')
        .query({ currentGlucose: 155, rateOfChange: 0.1 });

      assert.equal(checkRes.status, 200);
      assert.equal(checkRes.body.data.safetyStatus, 'safe');
      assert.equal(checkRes.body.data.isSafe, true);

      // Log workout
      const logRes = await request(app)
        .post('/api/v1/activity/logs')
        .send({
          userId: 'usr_patient_03',
          activityType: 'brisk_walking',
          name: 'Evening Park Walk',
          durationMinutes: 30,
          intensity: 'moderate',
          startGlucose: 155
        });

      assert.equal(logRes.status, 201);
      assert.equal(logRes.body.success, true);
      assert.ok(logRes.body.data.activity);
      assert.equal(logRes.body.data.activity.name, 'Evening Park Walk');
      assert.ok(typeof logRes.body.data.activity.estimatedDrawdownMgDl === 'number');
    });
  });

  // STEP 5: M7 Emergency Response Engine & Multi-Stage Escalation
  describe('Step 5: Emergency Detection, Multi-Stage Escalation & Simulated SOS (M7)', () => {
    let triggeredAlertId = null;

    it('detects severe hypoglycemia (<54 mg/dL) and triggers Stage 1 Emergency Alert', async () => {
      const hypoReading = {
        deviceId: 'VIRTUAL_CGM_VP03',
        userId: 'usr_patient_03',
        glucose: 48,
        rateOfChange: -2.8,
        timestamp: new Date()
      };

      const generated = alertEngine.evaluateReading(hypoReading);
      assert.ok(generated, 'Critical hypo must generate an alert');
      assert.equal(generated.alertType, 'CRITICAL_HYPO');
      assert.equal(generated.severity, 'CRITICAL');
      assert.equal(generated.stage, 1);
      assert.equal(generated.countdownSeconds, 60);

      triggeredAlertId = generated.alertId;

      // Verify active alert endpoint reflects emergency
      const activeRes = await request(app)
        .get('/api/v1/alerts/active')
        .query({ userId: 'usr_patient_03' });

      assert.equal(activeRes.status, 200);
      assert.equal(activeRes.body.hasActiveAlert, true);
      assert.equal(activeRes.body.data.alertType, 'CRITICAL_HYPO');
    });

    it('escalates to Stage 2 Caregiver SMS/Push notification when unacknowledged', async () => {
      assert.ok(triggeredAlertId, 'Must have active alert from previous step');

      const escRes = await request(app)
        .post('/api/v1/alerts/escalate-caregiver')
        .send({ alertId: triggeredAlertId });

      assert.equal(escRes.status, 200);
      assert.equal(escRes.body.success, true);
      assert.equal(escRes.body.data.caregiverNotified, true);
      assert.equal(escRes.body.data.stage, 2);
    });

    it('dispatches Stage 3 Simulated EMS Ambulance Unit with telemetry bridge', async () => {
      const sosRes = await request(app)
        .post('/api/v1/alerts/dispatch-sos')
        .send({
          alertId: triggeredAlertId,
          patientName: 'Brittle Type 1 (VP-03)',
          location: 'Chennai, Tamil Nadu (Simulation GPS)'
        });

      assert.equal(sosRes.status, 200);
      assert.equal(sosRes.body.success, true);
      assert.equal(sosRes.body.data.simulatedSos.dispatched, true);
      assert.equal(sosRes.body.data.stage, 3);
      assert.ok(sosRes.body.data.simulatedSos.vehicleId);
      assert.ok(sosRes.body.data.simulatedSos.etaMinutes > 0);
    });
  });

  // STEP 6: M8 Caregiver Oversight & Remote Acknowledgment
  describe('Step 6: Caregiver Portal & Remote Emergency Acknowledgment (M8)', () => {
    it('reflects active emergency in the multi-patient caregiver roster', async () => {
      const rosterRes = await request(app).get('/api/v1/clinical/patients');
      assert.equal(rosterRes.status, 200);
      assert.equal(rosterRes.body.success, true);
      assert.equal(rosterRes.body.count, 6);

      const vp03 = rosterRes.body.data.find((p) => p.id === 'VP-03');
      assert.ok(vp03);
      assert.equal(vp03.riskTier, 'HIGH');
      assert.ok(vp03.activeAlert, 'VP-03 must show active alert in caregiver roster');
      assert.equal(vp03.caregiver.caregiverName, 'Jane Doe');
    });

    it('caregiver remotely acknowledges emergency alert, disengaging escalation', async () => {
      const activeAlert = alertEngine.getActiveAlert('usr_patient_03');
      assert.ok(activeAlert);

      const ackRes = await request(app)
        .post('/api/v1/clinical/caregiver/acknowledge')
        .send({
          alertId: activeAlert.alertId,
          patientId: 'VP-03',
          caregiverName: 'Jane Doe (Spouse)',
          actionTaken: 'remote_caregiver_administered_orange_juice'
        });

      assert.equal(ackRes.status, 200);
      assert.equal(ackRes.body.success, true);
      assert.equal(ackRes.body.data.status, 'acknowledged');
      assert.match(ackRes.body.data.acknowledgedBy, /caregiver/i);

      // Verify active alert cleared
      const activeCheck = alertEngine.getActiveAlert('usr_patient_03');
      assert.equal(activeCheck, null, 'Active alert must be resolved/cleared');
    });
  });

  // STEP 7: M8 Doctor AGP Clinical Profile & Consultation Notes
  describe('Step 7: Doctor Ambulatory Glucose Profile (AGP) & Consultation Notes (M8)', () => {
    it('generates international standard AGP report conforming to consensus formulas', async () => {
      const agpRes = await request(app).get('/api/v1/clinical/agp/VP-03');

      assert.equal(agpRes.status, 200);
      assert.equal(agpRes.body.success, true);
      assert.equal(agpRes.body.source, 'simulation');

      const data = agpRes.body.data;
      assert.ok(data.metrics);
      const { meanGlucose, cvPercent, gmi } = data.metrics;
      assert.ok(meanGlucose > 0);
      assert.ok(cvPercent > 0);

      // Verify GMI consensus formula: 3.31 + 0.02392 * Mean Glucose
      const expectedGmi = Math.round((3.31 + 0.02392 * meanGlucose) * 10) / 10;
      assert.equal(gmi, expectedGmi);

      // 5-Tier Time-in-Range (TIR)
      const tir = data.timeInRange;
      assert.ok(tir);
      const sumTir = tir.veryLow + tir.low + tir.inRange + tir.high + tir.veryHigh;
      assert.ok(sumTir >= 99.0 && sumTir <= 101.0, `TIR sum should be ~100%, got ${sumTir}`);

      // 24-hour percentile curve
      assert.equal(data.percentileCurve.length, 24);
      data.percentileCurve.forEach((pt) => {
        assert.ok(pt.p10 <= pt.p25 && pt.p25 <= pt.p50 && pt.p50 <= pt.p75 && pt.p75 <= pt.p90);
      });
    });

    it('authors a physician consultation note and strictly rejects insulin titration (ADR-007)', async () => {
      // 1. Author valid lifestyle note
      const validNote = {
        patientId: 'VP-03',
        doctorName: 'Dr. Evelyn Reed, MD (Endocrinology)',
        noteType: 'routine_review',
        assessment: 'End-to-End full system evaluation complete. Patient displays high glycemic volatility responsive to nutritional timing.',
        recommendations: 'Continue low-GI carbohydrate substitutions for lunch and maintain bedside glucose tablets. 20-minute post-meal stroll recommended.',
        tirSummary: { inRangePercent: 62.5, cvPercent: 38.2, gmiPercent: 7.1 }
      };

      const createRes = await request(app).post('/api/v1/clinical/notes').send(validNote);
      assert.equal(createRes.status, 201);
      assert.equal(createRes.body.success, true);
      assert.equal(createRes.body.data.patientId, 'VP-03');

      // 2. Reject unsafe insulin prescription
      const unsafeNote = {
        patientId: 'VP-03',
        doctorName: 'Dr. Unsafe Prescriber',
        noteType: 'therapy_adjustment',
        assessment: 'Severe persistent spikes.',
        recommendations: 'Prescribe 15 units of Lantus daily and 4 units of Humalog before lunch.'
      };

      const rejectRes = await request(app).post('/api/v1/clinical/notes').send(unsafeNote);
      assert.equal(rejectRes.status, 400);
      assert.equal(rejectRes.body.success, false);
      assert.match(rejectRes.body.message, /ADR-007|insulin units/i);

      // 3. Retrieve note history
      const getNotesRes = await request(app).get('/api/v1/clinical/notes/VP-03');
      assert.equal(getNotesRes.status, 200);
      assert.ok(getNotesRes.body.count >= 1);
    });
  });
});
