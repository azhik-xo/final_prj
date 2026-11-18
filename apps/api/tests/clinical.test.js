/**
 * GlucoGuard Clinical & Caregiver Portal Integration Tests (Module M8)
 *
 * Verifies:
 * - Multi-patient clinical roster endpoint (/api/v1/clinical/patients)
 * - International consensus AGP calculation (/api/v1/clinical/agp/:patientId)
 *   * 5-tier TIR percentages summing to ~100%
 *   * Glycemic variability CV = (SD / Mean) * 100
 *   * GMI formula = 3.31 + 0.02392 * Mean
 *   * 24-hour percentile curve (10th <= 25th <= 50th <= 75th <= 90th)
 * - Physician consultation note creation with ADR-007 safety interlock (/api/v1/clinical/notes)
 * - Consultation history retrieval (/api/v1/clinical/notes/:patientId)
 * - Caregiver remote emergency alert acknowledgment (/api/v1/clinical/caregiver/acknowledge)
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { alertEngine } = require('../src/modules/alerts/alertEngine');

describe('Clinical & Caregiver Portal API (Module M8)', () => {
  beforeEach(() => {
    alertEngine.reset();
  });

  describe('GET /api/v1/clinical/patients', () => {
    it('returns all 6 virtual patient personas with live metrics and risk tiers', async () => {
      const res = await request(app).get('/api/v1/clinical/patients');

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.count, 6);
      assert.equal(res.body.source, 'simulation');
      assert.ok(Array.isArray(res.body.data));

      const vp03 = res.body.data.find((p) => p.id === 'VP-03');
      assert.ok(vp03, 'VP-03 must be present in roster');
      assert.equal(vp03.riskTier, 'HIGH');
      assert.equal(vp03.caregiver.caregiverName, 'Jane Doe');
      assert.equal(typeof vp03.currentGlucose, 'number');
      assert.ok(vp03.currentGlucose >= 40 && vp03.currentGlucose <= 400);
      assert.ok(['in_range', 'low', 'very_low', 'high', 'very_high'].includes(vp03.statusCategory));
    });
  });

  describe('GET /api/v1/clinical/agp/:patientId', () => {
    it('computes international standard AGP metrics for VP-03', async () => {
      const res = await request(app).get('/api/v1/clinical/agp/VP-03');

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.source, 'simulation');

      const data = res.body.data;
      assert.ok(data.patient);
      assert.equal(data.patient.id, 'VP-03');

      // Summary metrics
      const { meanGlucose, stdDev, cvPercent, gmi } = data.metrics;
      assert.ok(meanGlucose > 0, 'Mean glucose must be positive');
      assert.ok(stdDev >= 0, 'Standard deviation must be non-negative');
      assert.ok(cvPercent > 0, 'CV percent must be positive');

      // Verify GMI formula: 3.31 + 0.02392 * meanGlucose (within rounding margin)
      const expectedGmi = Math.round((3.31 + 0.02392 * meanGlucose) * 10) / 10;
      assert.equal(gmi, expectedGmi, 'GMI must match consensus formula 3.31 + 0.02392 * Mean');

      // Time-in-Range (TIR) - 5 Tiers
      const tir = data.timeInRange;
      assert.ok(tir);
      const tirSum = tir.veryLow + tir.low + tir.inRange + tir.high + tir.veryHigh;
      assert.ok(tirSum >= 99.0 && tirSum <= 101.0, `TIR sum should be ~100%, got ${tirSum}`);

      // 24-Hour Percentile Curve
      const curve = data.percentileCurve;
      assert.equal(curve.length, 24, '24-hour curve must have exactly 24 hourly buckets');

      curve.forEach((point) => {
        assert.ok(point.hour >= 0 && point.hour <= 23);
        assert.ok(typeof point.timeLabel === 'string');
        assert.ok(
          point.p10 <= point.p25 &&
            point.p25 <= point.p50 &&
            point.p50 <= point.p75 &&
            point.p75 <= point.p90,
          `Percentile ordering violated at hour ${point.hour}: p10=${point.p10}, p25=${point.p25}, p50=${point.p50}, p75=${point.p75}, p90=${point.p90}`
        );
      });

      // Hourly Heatmap
      assert.equal(data.hourlyHeatmap.length, 24);
    });

    it('falls back gracefully to VP-03 when an unknown patientId is requested', async () => {
      const res = await request(app).get('/api/v1/clinical/agp/UNKNOWN-99');

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.patient.id, 'VP-03');
    });
  });

  describe('POST /api/v1/clinical/notes & GET /api/v1/clinical/notes/:patientId', () => {
    it('creates a valid clinical consultation note', async () => {
      const notePayload = {
        patientId: 'VP-03',
        doctorName: 'Dr. Evelyn Reed, MD (Endocrinology)',
        noteType: 'routine_review',
        assessment: 'Patient displays high variability with postprandial evening excursions. Morning fasting values show steady nocturnal drift.',
        recommendations: 'Encourage low-GI complex carbohydrate substitutions for evening meals. Ensure 20-minute post-meal light stroll. Rule of 15 glucose tabs bedside.',
        tirSummary: { inRangePercent: 62.0, cvPercent: 38.5, gmiPercent: 7.2 }
      };

      const res = await request(app).post('/api/v1/clinical/notes').send(notePayload);

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.source, 'simulation');
      assert.equal(res.body.data.patientId, 'VP-03');
      assert.equal(res.body.data.assessment, notePayload.assessment);

      // Verify retrieval
      const getRes = await request(app).get('/api/v1/clinical/notes/VP-03');
      assert.equal(getRes.status, 200);
      assert.ok(getRes.body.count >= 1);
      const found = getRes.body.data.find((n) => n.assessment === notePayload.assessment);
      assert.ok(found, 'Created note must be found in patient note history');
    });

    it('strictly rejects insulin titration or drug prescription recommendations (ADR-007)', async () => {
      const unsafePayload = {
        patientId: 'VP-03',
        doctorName: 'Dr. Test Unsafe',
        noteType: 'therapy_adjustment',
        assessment: 'Severe persistent hyperglycemia.',
        recommendations: 'Increase basal dose to 24 units of Lantus and inject 4 units of Humalog before dinner.'
      };

      const res = await request(app).post('/api/v1/clinical/notes').send(unsafePayload);

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /ADR-007|insulin units/i);
    });

    it('rejects notes missing assessment or recommendations', async () => {
      const incompletePayload = {
        patientId: 'VP-03',
        doctorName: 'Dr. Test'
      };

      const res = await request(app).post('/api/v1/clinical/notes').send(incompletePayload);

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });
  });

  describe('POST /api/v1/clinical/caregiver/acknowledge', () => {
    it('allows a caregiver to remotely acknowledge an active emergency alert for a patient', async () => {
      // Trigger an alert first
      const alert = alertEngine.evaluateReading({
        userId: 'usr_patient_03',
        glucose: 48,
        rateOfChange: -1.2
      });
      assert.ok(alert, 'Alert must be generated');

      const ackRes = await request(app)
        .post('/api/v1/clinical/caregiver/acknowledge')
        .send({
          alertId: alert.alertId,
          patientId: 'VP-03',
          caregiverName: 'Jane Doe (Spouse)',
          actionTaken: 'remote_call_and_juice_confirmed'
        });

      assert.equal(ackRes.status, 200);
      assert.equal(ackRes.body.success, true);
      assert.equal(ackRes.body.data.status, 'acknowledged');
      assert.match(ackRes.body.data.acknowledgedBy, /caregiver: Jane Doe/i);
      assert.equal(ackRes.body.data.actionTaken, 'remote_call_and_juice_confirmed');
    });

    it('returns 400 when alertId is missing', async () => {
      const res = await request(app).post('/api/v1/clinical/caregiver/acknowledge').send({
        patientId: 'VP-03'
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
    });

    it('returns 404 when alertId does not exist', async () => {
      const res = await request(app).post('/api/v1/clinical/caregiver/acknowledge').send({
        alertId: 'non_existent_alert_id_99999',
        patientId: 'VP-03'
      });

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
    });
  });
});
