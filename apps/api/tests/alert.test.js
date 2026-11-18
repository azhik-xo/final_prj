/**
 * GlucoGuard Clinical Alert & Emergency Engine Integration Tests (Module M7)
 *
 * Verifies:
 * - Alert rules evaluation (Hypo <54, Precipitous drop, Hyper >300)
 * - 15-minute smart cooldown suppression and severity override
 * - REST endpoints: /active, /acknowledge, /escalate-caregiver, /dispatch-sos, /history, /simulate
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { alertEngine, THRESHOLDS } = require('../src/modules/alerts/alertEngine');

describe('Clinical Alert & Emergency Engine (Module M7)', () => {
  beforeEach(() => {
    alertEngine.reset();
  });

  it('triggers CRITICAL_HYPO when glucose drops below 54 mg/dL', () => {
    const reading = {
      userId: 'usr_patient_test_m7',
      glucose: 48,
      rateOfChange: -0.5
    };
    const alert = alertEngine.evaluateReading(reading);
    assert.ok(alert);
    assert.equal(alert.alertType, 'CRITICAL_HYPO');
    assert.equal(alert.severity, 'CRITICAL');
    assert.equal(alert.stage, 1);
    assert.equal(alert.status, 'triggered');
    assert.equal(alert.countdownSeconds, 60);
    assert.equal(alert.source, 'simulation');
  });

  it('triggers CRITICAL_HYPO when glucose <70 mg/dL with precipitous drop velocity (< -2.5 mg/dL/min)', () => {
    const reading = {
      userId: 'usr_patient_test_m7',
      glucose: 66,
      rateOfChange: -3.2
    };
    const alert = alertEngine.evaluateReading(reading);
    assert.ok(alert);
    assert.equal(alert.alertType, 'CRITICAL_HYPO');
    assert.equal(alert.severity, 'CRITICAL');
  });

  it('triggers WARNING_HYPO when glucose is between 54 and 69 mg/dL with normal velocity', () => {
    const reading = {
      userId: 'usr_patient_test_m7',
      glucose: 62,
      rateOfChange: -0.8
    };
    const alert = alertEngine.evaluateReading(reading);
    assert.ok(alert);
    assert.equal(alert.alertType, 'WARNING_HYPO');
    assert.equal(alert.severity, 'WARNING');
  });

  it('triggers CRITICAL_HYPER when glucose exceeds 300 mg/dL', () => {
    const reading = {
      userId: 'usr_patient_test_m7',
      glucose: 325,
      rateOfChange: 1.5
    };
    const alert = alertEngine.evaluateReading(reading);
    assert.ok(alert);
    assert.equal(alert.alertType, 'CRITICAL_HYPER');
    assert.equal(alert.severity, 'CRITICAL');
  });

  it('suppresses identical alerts within 15-minute cooldown window, but overrides on escalation', () => {
    // 1. Initial warning alert
    const r1 = { userId: 'usr_cooldown_test', glucose: 65, rateOfChange: 0 };
    const a1 = alertEngine.evaluateReading(r1);
    assert.ok(a1);
    assert.equal(a1.severity, 'WARNING');

    // 2. Second warning reading immediately after (should be suppressed by cooldown)
    const r2 = { userId: 'usr_cooldown_test', glucose: 64, rateOfChange: 0 };
    const a2 = alertEngine.evaluateReading(r2);
    assert.equal(a2, null);

    // 3. Glucose plunges into CRITICAL territory (escalation overrides cooldown!)
    const r3 = { userId: 'usr_cooldown_test', glucose: 48, rateOfChange: -1.0 };
    const a3 = alertEngine.evaluateReading(r3);
    assert.ok(a3);
    assert.equal(a3.severity, 'CRITICAL');
  });

  it('POST /api/v1/alerts/simulate generates active emergency alert', async () => {
    const res = await request(app)
      .post('/api/v1/alerts/simulate')
      .send({
        userId: 'usr_patient_test_m7',
        glucose: 45,
        rateOfChange: -3.0
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data);
    assert.equal(res.body.data.alertType, 'CRITICAL_HYPO');
  });

  it('GET /api/v1/alerts/active returns active alert', async () => {
    // Inject active alert
    alertEngine.evaluateReading({
      userId: 'usr_patient_test_m7',
      glucose: 50,
      rateOfChange: -1.5
    });

    const res = await request(app)
      .get('/api/v1/alerts/active')
      .query({ userId: 'usr_patient_test_m7' });

    assert.equal(res.status, 200);
    assert.equal(res.body.hasActiveAlert, true);
    assert.ok(res.body.data);
    assert.equal(res.body.data.status, 'triggered');
  });

  it('POST /api/v1/alerts/escalate-caregiver advances to Stage 2', async () => {
    const alert = alertEngine.evaluateReading({
      userId: 'usr_patient_test_m7',
      glucose: 49,
      rateOfChange: -2.0
    });

    const res = await request(app)
      .post('/api/v1/alerts/escalate-caregiver')
      .send({ alertId: alert.alertId });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.stage, 2);
    assert.equal(res.body.data.status, 'caregiver_escalated');
    assert.equal(res.body.data.caregiverNotified, true);
  });

  it('POST /api/v1/alerts/dispatch-sos simulates Stage 3 EMS Ambulance Dispatch', async () => {
    const alert = alertEngine.evaluateReading({
      userId: 'usr_patient_test_m7',
      glucose: 42,
      rateOfChange: -3.0
    });

    const res = await request(app)
      .post('/api/v1/alerts/dispatch-sos')
      .send({
        alertId: alert.alertId,
        coords: { lat: 13.0827, lng: 80.2707 }
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.stage, 3);
    assert.equal(res.body.data.status, 'sos_dispatched');
    assert.ok(res.body.data.simulatedSos.dispatched);
    assert.equal(res.body.data.simulatedSos.vehicleId, 'AMB-GLUCO-108');
    assert.ok(res.body.disclaimer.includes('SIMULATION ONLY'));
  });

  it('POST /api/v1/alerts/acknowledge cancels alert and clears active status', async () => {
    const alert = alertEngine.evaluateReading({
      userId: 'usr_patient_test_m7',
      glucose: 52,
      rateOfChange: -1.0
    });

    const res = await request(app)
      .post('/api/v1/alerts/acknowledge')
      .send({
        alertId: alert.alertId,
        acknowledgedBy: 'patient',
        actionTaken: 'consumed_15g_carbs'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.status, 'acknowledged');

    // Verification: active alert is now cleared
    const checkRes = await request(app)
      .get('/api/v1/alerts/active')
      .query({ userId: 'usr_patient_test_m7' });

    assert.equal(checkRes.status, 200);
    assert.equal(checkRes.body.hasActiveAlert, false);
  });

  it('GET /api/v1/alerts/history returns incident log', async () => {
    alertEngine.evaluateReading({
      userId: 'usr_patient_test_m7',
      glucose: 51,
      rateOfChange: -1.0
    });

    const res = await request(app)
      .get('/api/v1/alerts/history')
      .query({ userId: 'usr_patient_test_m7' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
  });
});
