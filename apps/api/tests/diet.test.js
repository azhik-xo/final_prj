/**
 * GlucoGuard Diet Planner & Nutritional Telemetry Integration Tests (Module M5)
 *
 * Verifies the diet endpoints:
 * - GET /api/v1/diet/foods
 * - GET /api/v1/diet/recommendations
 * - POST /api/v1/diet/analyze
 * - POST /api/v1/diet/meals
 * - GET /api/v1/diet/meals
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

describe('Diet Planner Endpoints (Module M5)', () => {
  it('GET /api/v1/diet/foods returns reference diabetic-friendly foods library', async () => {
    const res = await request(app).get('/api/v1/diet/foods');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.source, 'simulation');
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 5);

    // Verify properties on first item
    const firstFood = res.body.data[0];
    assert.ok(firstFood.name);
    assert.ok(typeof firstFood.carbs === 'number');
    assert.ok(typeof firstFood.glycemicIndex === 'number');
    assert.ok(firstFood.category);
  });

  it('GET /api/v1/diet/recommendations returns low-GI food swaps and guidelines', async () => {
    const res = await request(app).get('/api/v1/diet/recommendations');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.source, 'simulation');
    assert.ok(res.body.data.swaps);
    assert.ok(Array.isArray(res.body.data.swaps));
    assert.ok(res.body.data.swaps.length >= 3);
    assert.ok(res.body.data.guidelines || res.body.data.generalGuidelines);
    assert.ok(res.body.disclaimer.includes('simulation'));
  });

  it('POST /api/v1/diet/analyze computes glycemic spike prediction without saving', async () => {
    const res = await request(app)
      .post('/api/v1/diet/analyze')
      .send({
        name: 'Steel Cut Oats with Chia Seeds',
        carbs: 30,
        protein: 7,
        fat: 4,
        fiber: 6,
        glycemicIndex: 48,
        currentGlucose: 110
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.source, 'simulation');
    assert.ok(typeof res.body.data.estimatedSpikeMgDl === 'number');
    assert.ok(res.body.data.estimatedSpikeMgDl >= 0 && res.body.data.estimatedSpikeMgDl <= 150);
    assert.ok(typeof res.body.data.timeToPeakMinutes === 'number');
    const traj = res.body.data.trajectory || res.body.data.projectedTrajectory;
    assert.ok(traj);
    assert.ok(Array.isArray(traj));
    assert.ok(traj.length > 5);
  });

  it('POST /api/v1/diet/meals validates meal name and carbs', async () => {
    // Missing name
    const resNoName = await request(app)
      .post('/api/v1/diet/meals')
      .send({
        carbs: 40
      });
    assert.equal(resNoName.status, 400);
    assert.equal(resNoName.body.success, false);
    assert.ok(resNoName.body.message.includes('name is required'));

    // Invalid carbs
    const resInvalidCarbs = await request(app)
      .post('/api/v1/diet/meals')
      .send({
        name: 'Salad',
        carbs: -5
      });
    assert.equal(resInvalidCarbs.status, 400);
    assert.equal(resInvalidCarbs.body.success, false);
    assert.ok(resInvalidCarbs.body.message.includes('non-negative'));
  });

  it('POST /api/v1/diet/meals successfully logs a meal with prediction', async () => {
    const mealPayload = {
      userId: 'usr_patient_test_01',
      name: 'Quinoa Veggie Bowl',
      mealType: 'lunch',
      carbs: 35,
      protein: 10,
      fat: 6,
      fiber: 7,
      glycemicIndex: 45,
      calories: 235
    };

    const res = await request(app)
      .post('/api/v1/diet/meals')
      .send(mealPayload);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.source, 'simulation');
    assert.ok(res.body.data.meal);
    assert.equal(res.body.data.meal.name, 'Quinoa Veggie Bowl');
    assert.equal(res.body.data.meal.carbs, 35);
    assert.ok(typeof res.body.data.meal.estimatedSpikeMgDl === 'number');
    assert.ok(res.body.data.prediction);
    assert.equal(res.body.data.meal.source, 'simulation');
  });

  it('GET /api/v1/diet/meals returns chronological list of meals', async () => {
    const res = await request(app)
      .get('/api/v1/diet/meals')
      .query({ userId: 'usr_patient_test_01' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.source, 'simulation');
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
    assert.equal(res.body.data[0].name, 'Quinoa Veggie Bowl');
  });
});
