/**
 * GlucoGuard Virtual CGM Simulator Engine Automated Test Suite (Module M1)
 *
 * Validates:
 * 1. Persona configurations & baselines
 * 2. Physiological clamping [40, 400] mg/dL across all 6 personas
 * 3. Continuity without erratic jumps under normal baseline conditions
 * 4. Dynamic event injections (meal_spike, hypo_drop, exercise, rescue_carbs, reset)
 * 5. Mandatory simulation identifier ("source": "simulation") per ADR-007
 * 6. Controller lifecycle methods (start, pause, resume, stop, setSpeed, onReading)
 * 7. Rate of change (dG/dt) calculation and trend arrow mappings
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

const { PERSONAS, getPersona, getAllPersonas } = require('../personas');
const {
  GlucoseModel,
  PHYSIOLOGICAL_MIN,
  PHYSIOLOGICAL_MAX,
  classifyTrend
} = require('../glucoseModel');
const { EventInjector } = require('../eventInjector');
const { SimulatorEngine } = require('../simulatorEngine');

describe('Module M1: Virtual Patient Personas', () => {
  it('should define all 6 required clinical personas', () => {
    const all = getAllPersonas();
    assert.equal(all.length, 6);

    const expectedIds = ['VP-01', 'VP-02', 'VP-03', 'VP-04', 'VP-05', 'VP-06'];
    expectedIds.forEach((id) => {
      const persona = getPersona(id);
      assert.ok(persona, `Persona ${id} must exist`);
      assert.equal(persona.id, id);
      assert.ok(persona.name);
      assert.ok(persona.userId);
      assert.ok(persona.deviceId);
      assert.ok(persona.targetRange);
      assert.ok(persona.description);
    });
  });

  it('should adhere to clinical baseline boundaries for each persona', () => {
    const p1 = getPersona('VP-01'); // Healthy: 80-110
    assert.ok(p1.baseline >= 80 && p1.baseline <= 110, 'VP-01 within 80-110');

    const p2 = getPersona('VP-02'); // Well-Managed T1: 100-140
    assert.ok(p2.baseline >= 100 && p2.baseline <= 140, 'VP-02 within 100-140');

    const p3 = getPersona('VP-03'); // Brittle T1: 60-240
    assert.ok(p3.baseline >= 60 && p3.baseline <= 240, 'VP-03 within 60-240');

    const p4 = getPersona('VP-04'); // Type 2: 130-190
    assert.ok(p4.baseline >= 130 && p4.baseline <= 190, 'VP-04 within 130-190');

    const p5 = getPersona('VP-05'); // Pre-Diabetes: 100-150
    assert.ok(p5.baseline >= 100 && p5.baseline <= 150, 'VP-05 within 100-150');

    const p6 = getPersona('VP-06'); // Athlete: 75-120
    assert.ok(p6.baseline >= 75 && p6.baseline <= 120, 'VP-06 within 75-120');
  });

  it('should throw descriptive error on invalid persona ID', () => {
    assert.throws(
      () => getPersona('INVALID_ID'),
      /Unknown persona ID/
    );
  });
});

describe('Module M1: Glucose Model & Physiological Boundaries', () => {
  it('should strictly clamp all simulated readings to [40, 400] mg/dL', () => {
    const all = getAllPersonas();

    for (const persona of all) {
      const model = new GlucoseModel(persona);

      for (let i = 0; i < 50; i++) {
        const result = model.step(5);
        assert.ok(
          result.glucose >= PHYSIOLOGICAL_MIN,
          `Glucose ${result.glucose} below min ${PHYSIOLOGICAL_MIN} for ${persona.id}`
        );
        assert.ok(
          result.glucose <= PHYSIOLOGICAL_MAX,
          `Glucose ${result.glucose} above max ${PHYSIOLOGICAL_MAX} for ${persona.id}`
        );
        assert.ok(!Number.isNaN(result.glucose), 'Glucose must not be NaN');
        assert.ok(!Number.isNaN(result.rateOfChange), 'Rate of change must not be NaN');
      }
    }
  });

  it('should enforce bounds even under extreme external shocks', () => {
    const p3 = getPersona('VP-03');
    const model = new GlucoseModel(p3, { initialGlucose: 50 });

    // Try driving far below 40
    const severeDrop = model.step(5, -100);
    assert.equal(severeDrop.glucose, 40, 'Must clamp to floor 40 mg/dL');

    // Try driving far above 400
    const severeSpike = model.step(5, 500);
    assert.equal(severeSpike.glucose, 400, 'Must clamp to ceiling 400 mg/dL');
  });

  it('should maintain continuous trajectory without erratic jumps under baseline conditions', () => {
    const p1 = getPersona('VP-01');
    const model = new GlucoseModel(p1);

    let lastGlucose = p1.baseline;
    for (let i = 0; i < 30; i++) {
      const res = model.step(5); // 5 min interval
      const delta = Math.abs(res.glucose - lastGlucose);
      const ratePerMinute = delta / 5;
      // Under quiet baseline conditions, rate of change should be gentle (< 2.0 mg/dL/min)
      assert.ok(
        ratePerMinute <= 2.5,
        `Unexpected jump of ${delta} mg/dL over 5 min (rate: ${ratePerMinute} mg/dL/min)`
      );
      lastGlucose = res.glucose;
    }
  });

  it('should correctly classify trend arrows based on rate of change', () => {
    assert.deepEqual(classifyTrend(2.5), { trend: 'rising_rapidly', trendArrow: '↑↑' });
    assert.deepEqual(classifyTrend(1.4), { trend: 'rising', trendArrow: '↑' });
    assert.deepEqual(classifyTrend(0.2), { trend: 'stable', trendArrow: '→' });
    assert.deepEqual(classifyTrend(-0.5), { trend: 'stable', trendArrow: '→' });
    assert.deepEqual(classifyTrend(-1.6), { trend: 'falling', trendArrow: '↓' });
    assert.deepEqual(classifyTrend(-2.8), { trend: 'falling_rapidly', trendArrow: '↓↓' });
  });
});

describe('Module M1: Dynamic Event Injections', () => {
  let injector;

  beforeEach(() => {
    injector = new EventInjector();
  });

  it('should simulate meal_spike: rises significantly above baseline with decay', () => {
    const persona = getPersona('VP-02');
    injector.inject('meal_spike', { peakRise: 80, peakTime: 25 }, persona.baseline, persona);

    assert.equal(injector.getActiveEvent(), 'meal_spike');

    let totalOffset = 0;
    // Step forward 25 minutes (to peak)
    for (let min = 0; min < 25; min += 5) {
      const delta = injector.step(5, persona.baseline + totalOffset, persona.baseline, persona);
      totalOffset += delta;
      assert.ok(delta > 0, 'Delta during rise phase must be positive');
    }

    // At peak (25 min), total rise should be near +80 mg/dL
    assert.ok(
      totalOffset >= 70 && totalOffset <= 90,
      `Meal rise at peak (${totalOffset.toFixed(1)}) should be ~80 mg/dL`
    );

    // Step further forward past peak (clearing phase)
    let clearingDelta = 0;
    for (let min = 25; min < 60; min += 5) {
      const delta = injector.step(5, persona.baseline + totalOffset, persona.baseline, persona);
      clearingDelta += delta;
    }
    // Delta after peak should be negative (clearing excursion)
    assert.ok(clearingDelta < 0, 'Clearance phase should reduce excursion');
  });

  it('should simulate hypo_drop: steep decline <-2.5 mg/dL/min crossing 70 into 50-55 mg/dL', () => {
    const persona = getPersona('VP-03');
    const startGlucose = 120;
    injector.inject('hypo_drop', { dropRate: 2.8, targetNadir: 52 }, startGlucose, persona);

    assert.equal(injector.getActiveEvent(), 'hypo_drop');

    let current = startGlucose;
    const rates = [];

    // Advance 5-minute ticks until nadir
    for (let i = 0; i < 10; i++) {
      const delta = injector.step(5, current, persona.baseline, persona);
      const rate = delta / 5;
      // Record rate during active descent before hitting nadir floor
      if (current > 52 && current + delta > 52) {
        rates.push(rate);
      }
      current += delta;
    }

    // Must have dropped below 70 mg/dL
    assert.ok(current < 70, `Glucose (${current}) must cross below 70 mg/dL`);
    // Must reach 50-55 mg/dL nadir
    assert.ok(
      current >= 50 && current <= 55,
      `Glucose (${current}) must stabilize in 50-55 mg/dL target nadir`
    );
    // Rate while dropping must be < -2.5 mg/dL/min
    rates.forEach((r) => {
      assert.ok(r <= -2.5, `Drop rate (${r} mg/dL/min) must be steep (<= -2.5)`);
    });
  });

  it('should simulate exercise drawdown (-1.5 mg/dL/min)', () => {
    const persona = getPersona('VP-06');
    const startGlucose = 110;
    injector.inject('exercise', { drawdownRate: 1.5, floorGlucose: 75 }, startGlucose, persona);

    assert.equal(injector.getActiveEvent(), 'exercise');

    let current = startGlucose;
    // Step 10 minutes
    const delta = injector.step(10, current, persona.baseline, persona);
    assert.equal(delta, -15, '10 minutes at -1.5 mg/dL/min must equal -15 mg/dL');
  });

  it('should simulate rescue_carbs recovery back to baseline', () => {
    const persona = getPersona('VP-03');
    const hypoGlucose = 52;
    injector.inject('rescue_carbs', { riseRate: 3.0, targetRecovery: 110 }, hypoGlucose, persona);

    assert.equal(injector.getActiveEvent(), 'rescue_carbs');

    let current = hypoGlucose;
    for (let i = 0; i < 8; i++) {
      const delta = injector.step(5, current, persona.baseline, persona);
      current += delta;
    }

    assert.ok(current >= 100, `Recovered glucose (${current}) must reach normoglycemia`);
  });

  it('should simulate reset: smoothly returns to persona baseline', () => {
    const persona = getPersona('VP-01'); // baseline 95
    const elevatedGlucose = 180;
    injector.inject('reset', {}, elevatedGlucose, persona);

    assert.equal(injector.getActiveEvent(), 'reset');

    let current = elevatedGlucose;
    for (let i = 0; i < 20; i++) {
      const delta = injector.step(5, current, persona.baseline, persona);
      current += delta;
    }

    assert.ok(
      Math.abs(current - persona.baseline) <= 2.0,
      `Glucose (${current}) should return smoothly to baseline (${persona.baseline})`
    );
  });
});

describe('Module M1: SimulatorEngine Controller & Telemetry Contract', () => {
  let engine;

  beforeEach(() => {
    engine = new SimulatorEngine();
  });

  afterEach(() => {
    if (engine) {
      engine.stop();
    }
  });

  it('should initialize and start simulation with default options', () => {
    const firstReading = engine.start('VP-01', { intervalMs: 1000 });
    assert.ok(firstReading);
    assert.equal(engine.isRunning, true);
    assert.equal(engine.isPaused, false);
    assert.equal(firstReading.deviceId, 'VIRTUAL_CGM_VP01');
    assert.equal(firstReading.userId, 'usr_patient_01');
    assert.equal(firstReading.source, 'simulation');
  });

  it('should strictly contain all required telemetry schema fields including mandatory simulation label', () => {
    engine.start('VP-03', { intervalMs: 500 });
    const reading = engine.tick();

    const expectedKeys = [
      'deviceId',
      'userId',
      'persona',
      'glucose',
      'unit',
      'trend',
      'trendArrow',
      'rateOfChange',
      'timestamp',
      'activeEvent',
      'batteryLevel',
      'source'
    ];

    expectedKeys.forEach((key) => {
      assert.ok(key in reading, `Telemetry reading must include key: "${key}"`);
    });

    // Invariant checks
    assert.equal(reading.source, 'simulation', 'Mandatory "source": "simulation" must be present');
    assert.equal(reading.unit, 'mg/dL');
    assert.ok(['↑↑', '↑', '→', '↓', '↓↓'].includes(reading.trendArrow));
    assert.ok(!Number.isNaN(new Date(reading.timestamp).getTime()), 'Valid ISO timestamp');
    assert.ok(reading.batteryLevel >= 1 && reading.batteryLevel <= 100);
  });

  it('should stream readings through onReading() callback', async () => {
    const received = [];

    engine.onReading((reading) => {
      received.push(reading);
    });

    engine.start('VP-02', { intervalMs: 100 });

    // Wait for at least 3 intervals
    await new Promise((resolve) => setTimeout(resolve, 350));
    engine.stop();

    assert.ok(received.length >= 3, `Expected at least 3 readings, got ${received.length}`);
    received.forEach((r) => {
      assert.equal(r.source, 'simulation');
      assert.ok(r.glucose >= 40 && r.glucose <= 400);
    });
  });

  it('should pause, resume, setSpeed, and stop properly', async () => {
    engine.start('VP-01', { intervalMs: 100 });
    assert.equal(engine.isRunning, true);
    assert.equal(engine.isPaused, false);

    // Pause
    engine.pause();
    assert.equal(engine.isPaused, true);
    const countAtPause = engine.tickCount;

    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.equal(engine.tickCount, countAtPause, 'Ticks must not advance while paused');

    // Resume
    engine.resume();
    assert.equal(engine.isPaused, false);
    await new Promise((resolve) => setTimeout(resolve, 150));
    assert.ok(engine.tickCount > countAtPause, 'Ticks must resume after unpausing');

    // Change speed
    engine.setSpeed(50);
    assert.equal(engine.intervalMs, 50);

    // Stop
    engine.stop();
    assert.equal(engine.isRunning, false);
    assert.equal(engine.isPaused, false);
  });

  it('should support dynamic event injection on running simulation', () => {
    engine.start('VP-03', { intervalMs: 200 });

    const event = engine.injectEvent('hypo_drop', { dropRate: 3.0, targetNadir: 52 });
    assert.equal(event.activeEvent, 'hypo_drop');

    // Step several times to simulate rapid descent
    for (let i = 0; i < 15; i++) {
      engine.tick();
    }

    const latest = engine.getLatestReading();
    assert.equal(latest.activeEvent, 'hypo_drop');
    assert.ok(latest.glucose < 70, `Glucose (${latest.glucose}) must drop into hypo zone`);
    assert.equal(latest.source, 'simulation');
  });
});
