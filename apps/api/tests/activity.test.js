/**
 * GlucoGuard Physical Activity & Safety Interlocks Integration Tests (Module M6)
 *
 * Verifies the activity endpoints:
 * - GET /api/v1/activity/activities
 * - GET /api/v1/activity/recommendations
 * - GET /api/v1/activity/safety-check
 * - POST /api/v1/activity/logs
 * - GET /api/v1/activity/logs
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

describe('Physical Activity & Safety Interlock Endpoints (Module M6)', () => {
  it('GET /api/v1/activity/activities returns reference activity catalog', async () => {
    const res = await request(app).get('/api/v1/activity/activities');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.source, 'simulation');
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 5);

    const first = res.body.data[0];
    assert.ok(first.name);
    assert.ok(typeof first.met === 'number');
    assert.ok(first.category);
  });

  it('GET /api/v1/activity/recommendations returns guidelines and emergency protocol', async () => {
    const res = await request(app).get('/api/v1/activity/recommendations');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.source, 'simulation');
    assert.ok(Array.isArray(res.body.data.guidelines));
    assert.ok(res.body.data.guidelines.length >= 3);
    assert.ok(Array.isArray(res.body.data.emergencyChecklist));
  });

  it('GET /api/v1/activity/safety-check evaluates clinical safety interlocks', async () => {
    // 1. Safe window (130 mg/dL)
    const resSafe = await request(app)
      .get('/api/v1/activity/safety-check')
      .query({ currentGlucose: 130, rateOfChange: 0 });
    assert.equal(resSafe.status, 200);
    assert.equal(resSafe.body.data.safetyStatus, 'safe');
    assert.equal(resSafe.body.data.isSafe, true);

    // 2. Hypo lockout (<90 mg/dL)
    const resHypo = await request(app)
      .get('/api/v1/activity/safety-check')
      .query({ currentGlucose: 78 });
    assert.equal(resHypo.status, 200);
    assert.equal(resHypo.body.data.safetyStatus, 'locked_hypo');
    assert.equal(resHypo.body.data.isSafe, false);
    assert.ok(resHypo.body.data.actionProtocol.includes('DO NOT EXERCISE'));

    // 3. Hyper caution (>250 mg/dL)
    const resHyper = await request(app)
      .get('/api/v1/activity/safety-check')
      .query({ currentGlucose: 280, intensity: 'high' });
    assert.equal(resHyper.status, 200);
    assert.equal(resHyper.body.data.safetyStatus, 'caution_hyper');
    assert.equal(resHyper.body.data.isSafe, false);
  });

  it('POST /api/v1/activity/logs validates duration', async () => {
    const resInvalid = await request(app)
      .post('/api/v1/activity/logs')
      .send({
        activityType: 'brisk_walking',
        durationMinutes: 0
      });
    assert.equal(resInvalid.status, 400);
    assert.equal(resInvalid.body.success, false);
    assert.ok(resInvalid.body.message.includes('at least 1 minute'));
  });

  it('POST /api/v1/activity/logs logs workout with drawdown prediction', async () => {
    const workoutPayload = {
      userId: 'usr_patient_test_02',
      activityType: 'cycling_moderate',
      name: 'Outdoor Trail Cycling',
      intensity: 'moderate',
      durationMinutes: 30,
      startGlucose: 140,
      rateOfChange: 0.0,
      bodyWeightKg: 70
    };

    const res = await request(app)
      .post('/api/v1/activity/logs')
      .send(workoutPayload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.source, 'simulation');
    assert.ok(res.body.data.activity);
    assert.equal(res.body.data.activity.name, 'Outdoor Trail Cycling');
    assert.ok(typeof res.body.data.activity.estimatedDrawdownMgDl === 'number');
    assert.ok(res.body.data.activity.estimatedDrawdownMgDl < 0);
    assert.ok(res.body.data.advice);
    assert.equal(res.body.data.advice.isSafe, true);
    assert.equal(res.body.data.activity.source, 'simulation');
  });

  it('GET /api/v1/activity/logs returns historical workout list', async () => {
    const res = await request(app)
      .get('/api/v1/activity/logs')
      .query({ userId: 'usr_patient_test_02' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.source, 'simulation');
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
    assert.equal(res.body.data[0].name, 'Outdoor Trail Cycling');
  });
});
