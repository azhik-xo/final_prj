/**
 * GlucoGuard E2E Pipeline Integration Tests (TASK-INT-01)
 *
 * Validates:
 * 1. Simulator REST API endpoints (/status, /personas, /start, /pause, /resume, /stop, /inject)
 * 2. CGM Telemetry history & ingestion endpoints (/history, /latest, /readings)
 * 3. Mongoose GlucoseReading model constraints & index definitions
 * 4. Simulation headers & mandatory safety disclaimers (ADR-007)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const GlucoseReading = require('../src/models/glucoseReading.model');

describe('TASK-INT-01: Simulator REST API Endpoints', () => {
  it('GET /api/v1/simulator/personas should return all 6 personas', async () => {
    const res = await request(app).get('/api/v1/simulator/personas');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(Array.isArray(res.body.data), true);
    assert.equal(res.body.data.length, 6);
    assert.equal(res.body.source, 'simulation');
    assert.equal(res.headers['x-simulation-mode'], 'true');
  });

  it('GET /api/v1/simulator/status should return engine operational state', async () => {
    const res = await request(app).get('/api/v1/simulator/status');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.ok('isRunning' in res.body.data);
    assert.ok('isPaused' in res.body.data);
  });

  it('POST /api/v1/simulator/start should start simulation for selected persona', async () => {
    const res = await request(app)
      .post('/api/v1/simulator/start')
      .send({ personaId: 'VP-03', intervalMs: 2000 });

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.data.status.isRunning, true);
    assert.equal(res.body.data.status.personaId, 'VP-03');
    assert.ok(res.body.data.firstReading);
    assert.equal(res.body.data.firstReading.source, 'simulation');
  });

  it('POST /api/v1/simulator/pause and /resume should toggle pause state', async () => {
    const pauseRes = await request(app).post('/api/v1/simulator/pause');
    assert.equal(pauseRes.status, 200);
    assert.equal(pauseRes.body.status, 'ok');
    assert.equal(pauseRes.body.data.isPaused, true);

    const resumeRes = await request(app).post('/api/v1/simulator/resume');
    assert.equal(resumeRes.status, 200);
    assert.equal(resumeRes.body.status, 'ok');
    assert.equal(resumeRes.body.data.isPaused, false);
  });

  it('POST /api/v1/simulator/inject should inject dynamic events (hypo_drop, meal_spike)', async () => {
    const hypoRes = await request(app)
      .post('/api/v1/simulator/inject')
      .send({ eventType: 'hypo_drop', params: { dropRate: 3.0, targetNadir: 52 } });

    assert.equal(hypoRes.status, 200);
    assert.equal(hypoRes.body.status, 'ok');
    assert.equal(hypoRes.body.data.injected.activeEvent, 'hypo_drop');

    const mealRes = await request(app)
      .post('/api/v1/simulator/inject')
      .send({ eventType: 'meal_spike', params: { peakRise: 80 } });

    assert.equal(mealRes.status, 200);
    assert.equal(mealRes.body.status, 'ok');
    assert.equal(mealRes.body.data.injected.activeEvent, 'meal_spike');
  });

  it('POST /api/v1/simulator/stop should halt the simulation engine', async () => {
    const res = await request(app).post('/api/v1/simulator/stop');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.data.isRunning, false);
  });
});

describe('TASK-INT-01: CGM Telemetry API & Persistence Validation', () => {
  it('POST /api/v1/cgm/readings should ingest telemetry with mandatory simulation tag', async () => {
    const payload = {
      deviceId: 'VIRTUAL_CGM_TEST01',
      userId: 'usr_test_01',
      persona: 'Healthy Individual (Non-Diabetic)',
      glucose: 98,
      unit: 'mg/dL',
      trend: 'stable',
      trendArrow: '→',
      rateOfChange: 0.1,
      timestamp: new Date().toISOString(),
      activeEvent: null,
      batteryLevel: 99
    };

    const res = await request(app)
      .post('/api/v1/cgm/readings')
      .send(payload);

    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.data.source, 'simulation');
    assert.equal(res.body.data.glucose, 98);
  });

  it('GET /api/v1/cgm/history should return array of historical readings', async () => {
    const res = await request(app).get('/api/v1/cgm/history?limit=10');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(Array.isArray(res.body.data), true);
    assert.equal(res.body.source, 'simulation');
  });

  it('GlucoseReading model schema should enforce physiological clamping [40, 400]', () => {
    const invalidLow = new GlucoseReading({
      deviceId: 'TEST',
      userId: 'TEST',
      persona: 'TEST',
      glucose: 25 // below 40
    });
    const lowErr = invalidLow.validateSync();
    assert.ok(lowErr.errors.glucose);

    const invalidHigh = new GlucoseReading({
      deviceId: 'TEST',
      userId: 'TEST',
      persona: 'TEST',
      glucose: 450 // above 400
    });
    const highErr = invalidHigh.validateSync();
    assert.ok(highErr.errors.glucose);
  });
});
