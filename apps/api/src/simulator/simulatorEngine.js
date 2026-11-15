/**
 * GlucoGuard Virtual CGM Simulator Engine (Module M1)
 *
 * Event-driven controller orchestrating:
 * - 6 Virtual Patient Personas
 * - Interstitial continuous glucose mathematical model
 * - Dynamic event injection (meal_spike, hypo_drop, exercise, rescue_carbs, reset)
 * - Configurable execution speeds (Demo: 1-3s vs Real-time: 5m)
 * - Strict telemetry payload generation adhering to non-device simulation rules
 *
 * @module simulator/simulatorEngine
 */

const { EventEmitter } = require('node:events');
const { getPersona, DEFAULT_PERSONA_ID } = require('./personas');
const { GlucoseModel } = require('./glucoseModel');
const { EventInjector } = require('./eventInjector');

class SimulatorEngine extends EventEmitter {
  constructor() {
    super();
    this.persona = null;
    this.glucoseModel = null;
    this.eventInjector = new EventInjector();

    this.isRunning = false;
    this.isPaused = false;
    this.timer = null;

    this.intervalMs = 3000; // default 3s per tick
    this.simulatedMinutesPerTick = 5; // default 5 min clinical progression per tick
    this.batteryLevel = 100;
    this.dischargeRate = 0.02; // battery depletion per tick

    this.latestReading = null;
    this.tickCount = 0;
  }

  /**
   * Starts the simulation engine for a given persona.
   *
   * @param {string} [personaId=DEFAULT_PERSONA_ID] - Persona identifier (e.g. 'VP-01' to 'VP-06')
   * @param {object} [options={}] - Simulation options
   * @param {number} [options.intervalMs=3000] - Timer interval in ms
   * @param {number} [options.simulatedMinutesPerTick=5] - Simulated minutes advanced per tick
   * @param {number} [options.initialGlucose=null] - Starting glucose override
   * @param {number} [options.batteryLevel=100] - Starting battery level
   * @param {Date|string} [options.startTime=null] - Simulation starting timestamp
   * @param {boolean} [options.emitImmediately=true] - Whether to fire initial tick right away
   * @returns {object} First reading payload
   */
  start(personaId = DEFAULT_PERSONA_ID, options = {}) {
    if (this.isRunning) {
      this.stop();
    }

    this.persona = getPersona(personaId);
    this.intervalMs = Math.max(100, Number(options.intervalMs) || 3000);
    this.simulatedMinutesPerTick = Math.max(
      0.1,
      Number(options.simulatedMinutesPerTick) || 5
    );
    this.batteryLevel = Math.min(
      100,
      Math.max(1, Number(options.batteryLevel) || 100)
    );
    this.dischargeRate = Number(options.dischargeRate) || 0.02;

    this.eventInjector.clear();
    this.glucoseModel = new GlucoseModel(this.persona, {
      initialGlucose: options.initialGlucose,
      startTime: options.startTime
    });

    this.isRunning = true;
    this.isPaused = false;
    this.tickCount = 0;

    this.emit('statusChange', {
      isRunning: true,
      isPaused: false,
      persona: this.persona.name,
      intervalMs: this.intervalMs
    });

    // Execute first tick
    const firstReading = this.tick();

    // Schedule periodic runner
    this._scheduleTimer();

    return firstReading;
  }

  /**
   * Advances the simulation by one discrete tick.
   * Computes event delta, homeostatic drift, AR(1) noise, and emits reading.
   *
   * @returns {object} Formatted telemetry reading
   */
  tick() {
    if (!this.isRunning || !this.glucoseModel || !this.persona) {
      return null;
    }

    this.tickCount += 1;

    // 1. Calculate event delta from active event injector
    const currentGlucose = this.glucoseModel.currentGlucose;
    const eventDelta = this.eventInjector.step(
      this.simulatedMinutesPerTick,
      currentGlucose,
      this.persona.baseline,
      this.persona
    );

    // 2. Step the continuous glucose mathematical model
    const modelOutput = this.glucoseModel.step(
      this.simulatedMinutesPerTick,
      eventDelta
    );

    // 3. Discharge battery slowly
    this.batteryLevel = Math.max(
      1,
      Math.round((this.batteryLevel - this.dischargeRate) * 10) / 10
    );

    // 4. Construct strictly compliant telemetry payload
    const reading = {
      deviceId: this.persona.deviceId,
      userId: this.persona.userId,
      persona: this.persona.name,
      glucose: modelOutput.glucose,
      unit: 'mg/dL',
      trend: modelOutput.trend,
      trendArrow: modelOutput.trendArrow,
      rateOfChange: modelOutput.rateOfChange,
      timestamp: modelOutput.timestamp,
      activeEvent: this.eventInjector.getActiveEvent(),
      batteryLevel: Math.round(this.batteryLevel),
      source: 'simulation' // Mandatory simulation identifier per ADR-007
    };

    this.latestReading = reading;
    this.emit('reading', reading);

    return reading;
  }

  /**
   * Pauses the simulation timer without clearing state.
   */
  pause() {
    if (!this.isRunning || this.isPaused) return;

    this._clearTimer();
    this.isPaused = true;

    this.emit('statusChange', {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      persona: this.persona ? this.persona.name : null
    });
  }

  /**
   * Resumes the paused simulation timer.
   */
  resume() {
    if (!this.isRunning || !this.isPaused) return;

    this.isPaused = false;
    this._scheduleTimer();

    this.emit('statusChange', {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      persona: this.persona ? this.persona.name : null
    });
  }

  /**
   * Stops simulation, clears timers and active events.
   */
  stop() {
    this._clearTimer();
    this.isRunning = false;
    this.isPaused = false;
    this.eventInjector.clear();

    this.emit('statusChange', {
      isRunning: false,
      isPaused: false,
      persona: this.persona ? this.persona.name : null
    });
  }

  /**
   * Injects a dynamic physiological event into the running simulation.
   *
   * @param {string} eventType - One of: meal_spike, hypo_drop, exercise, rescue_carbs, reset
   * @param {object} [params={}] - Optional event parameters
   * @returns {object} Injected event state
   */
  injectEvent(eventType, params = {}) {
    if (!this.isRunning) {
      throw new Error('Cannot inject event: simulator is not currently running.');
    }

    const currentGlucose = this.glucoseModel.currentGlucose;
    const injected = this.eventInjector.inject(
      eventType,
      params,
      currentGlucose,
      this.persona
    );

    this.emit('eventInjected', injected);
    return injected;
  }

  /**
   * Dynamically adjusts the tick interval speed.
   * @param {number} intervalMs - New interval in milliseconds
   */
  setSpeed(intervalMs) {
    const validInterval = Math.max(50, Number(intervalMs) || 3000);
    this.intervalMs = validInterval;

    if (this.isRunning && !this.isPaused) {
      this._clearTimer();
      this._scheduleTimer();
    }
  }

  /**
   * Registers a reading callback listener.
   * @param {Function} callback - Function receiving each reading payload
   * @returns {SimulatorEngine} this (for chaining)
   */
  onReading(callback) {
    this.on('reading', callback);
    return this;
  }

  /**
   * Returns the most recent telemetry reading generated.
   * @returns {object|null}
   */
  getLatestReading() {
    return this.latestReading ? { ...this.latestReading } : null;
  }

  /**
   * Returns current engine operational status.
   * @returns {object}
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      intervalMs: this.intervalMs,
      simulatedMinutesPerTick: this.simulatedMinutesPerTick,
      personaId: this.persona ? this.persona.id : null,
      personaName: this.persona ? this.persona.name : null,
      activeEvent: this.eventInjector.getActiveEvent(),
      batteryLevel: Math.round(this.batteryLevel),
      tickCount: this.tickCount
    };
  }

  _scheduleTimer() {
    this._clearTimer();
    this.timer = setInterval(() => {
      this.tick();
    }, this.intervalMs);
  }

  _clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

module.exports = {
  SimulatorEngine
};

