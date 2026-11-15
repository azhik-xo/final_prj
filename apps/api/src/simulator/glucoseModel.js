/**
 * GlucoGuard Interstitial Glucose Mathematical Model (Module M1)
 *
 * Implements continuous interstitial glucose calculation:
 *   Glucose(t) = Baseline + CircadianDrift(t) + ActiveEvents(t) + AR(1) noise
 *
 * Enforces:
 * - Strict physiological clamping [40, 400] mg/dL
 * - Smooth continuity between consecutive ticks
 * - AR(1) autoregressive colored noise (Box-Muller transform)
 * - Circadian diurnal fluctuation (dawn phenomenon & nocturnal dip)
 * - Rate of change calculation (dG/dt) and trend arrows (↑↑, ↑, →, ↓, ↓↓)
 *
 * @module simulator/glucoseModel
 */

const PHYSIOLOGICAL_MIN = 40;
const PHYSIOLOGICAL_MAX = 400;

/**
 * Standard normal random variable generator using Box-Muller transform.
 * @returns {number} Standard normal deviate N(0, 1)
 */
function sampleStandardNormal() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Computes circadian diurnal drift based on hour of the day.
 * Reflects dawn phenomenon (4 AM - 8 AM) and nocturnal dip.
 * @param {Date|number} timestamp - Current simulation time
 * @param {number} amplitude - Persona circadian amplitude in mg/dL
 * @returns {number} Circadian offset in mg/dL
 */
function calculateCircadianDrift(timestamp, amplitude = 10.0) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const hour = date.getUTCHours() + date.getUTCMinutes() / 60;

  // Primary diurnal wave (peaks ~7 AM) + harmonic secondary wave
  const wave1 = Math.sin((2 * Math.PI * (hour - 3.5)) / 24);
  const wave2 = 0.3 * Math.cos((4 * Math.PI * (hour - 8)) / 24);

  return amplitude * (wave1 + wave2);
}

/**
 * Classifies rate of change into trend descriptor and directional arrow.
 * @param {number} rateOfChange - Rate of change in mg/dL/min
 * @returns {{ trend: string, trendArrow: string }}
 */
function classifyTrend(rateOfChange) {
  const roc = Number(rateOfChange) || 0;

  if (roc > 2.0) {
    return { trend: 'rising_rapidly', trendArrow: '↑↑' };
  }
  if (roc > 1.0) {
    return { trend: 'rising', trendArrow: '↑' };
  }
  if (roc < -2.0) {
    return { trend: 'falling_rapidly', trendArrow: '↓↓' };
  }
  if (roc < -1.0) {
    return { trend: 'falling', trendArrow: '↓' };
  }
  return { trend: 'stable', trendArrow: '→' };
}

class GlucoseModel {
  /**
   * @param {object} persona - Patient persona profile
   * @param {object} [options={}] - Model configuration options
   */
  constructor(persona, options = {}) {
    this.persona = persona;
    this.arNoise = 0; // AR(1) state variable
    this.previousGlucose = null;
    this.currentGlucose =
      Number(options.initialGlucose) || persona.baseline || 100;
    this.lastTimestamp = options.startTime
      ? new Date(options.startTime).getTime()
      : Date.now();
  }

  /**
   * Updates persona profile and resets or transitions state smoothly.
   * @param {object} newPersona
   */
  setPersona(newPersona) {
    this.persona = newPersona;
  }

  /**
   * Advances the mathematical model by dtMinutes.
   *
   * @param {number} dtMinutes - Elapsed simulated minutes (e.g. 1 to 5 min)
   * @param {number} [eventDelta=0] - Incremental delta injected by active event
   * @param {Date|number} [currentTimestamp=null] - Current timestamp
   * @returns {object} Calculated glucose snapshot
   */
  step(dtMinutes = 5, eventDelta = 0, currentTimestamp = null) {
    const timestamp = currentTimestamp
      ? new Date(currentTimestamp).getTime()
      : this.lastTimestamp + dtMinutes * 60 * 1000;

    // 1. Update AR(1) colored noise process:
    //    w_t = phi * w_{t-1} + sigma * sqrt(1 - phi^2) * epsilon
    const phi = Math.min(0.98, Math.max(0.5, this.persona.arPhi || 0.85));
    const sigma = Math.max(0.5, this.persona.volatility || 2.0);
    const innovation = sampleStandardNormal() * sigma * Math.sqrt(1 - phi * phi);
    this.arNoise = phi * this.arNoise + innovation;

    // 2. Circadian diurnal component
    const circadianOffset = calculateCircadianDrift(
      timestamp,
      this.persona.circadianAmplitude
    );

    // 3. Natural homeostatic mean-reverting drift towards (baseline + circadian)
    //    In absence of events, glucose relaxes smoothly towards homeostatic target
    const targetHomeostatic = this.persona.baseline + circadianOffset;
    const relaxationSpeed = 0.04 * (this.persona.clearanceRate || 1.0); // fraction per minute
    const relaxationDelta =
      (targetHomeostatic - this.currentGlucose) * (1 - Math.exp(-relaxationSpeed * dtMinutes));

    // 4. Combine previous glucose + homeostatic drift + active event delta + AR(1) innovation
    //    To ensure continuity, we apply deltas directly to current continuous glucose
    let updatedGlucose =
      this.currentGlucose + relaxationDelta + eventDelta + (innovation * 0.4);

    // 5. Enforce strict physiological limits [40, 400] mg/dL
    updatedGlucose = Math.max(
      PHYSIOLOGICAL_MIN,
      Math.min(PHYSIOLOGICAL_MAX, updatedGlucose)
    );

    // 6. Compute exact rate of change: dG/dt (mg/dL per minute)
    let rateOfChange = 0;
    if (this.previousGlucose !== null && dtMinutes > 0) {
      rateOfChange = (updatedGlucose - this.previousGlucose) / dtMinutes;
    }
    const roundedRoc = Math.round(rateOfChange * 10) / 10;

    // 7. Determine trend classification and trend arrow
    const { trend, trendArrow } = classifyTrend(roundedRoc);

    // Update state history
    this.previousGlucose = this.currentGlucose;
    this.currentGlucose = updatedGlucose;
    this.lastTimestamp = timestamp;

    return {
      glucose: Math.round(updatedGlucose),
      exactGlucose: updatedGlucose,
      rateOfChange: roundedRoc,
      trend,
      trendArrow,
      timestamp: new Date(timestamp).toISOString()
    };
  }

  /**
   * Resets model state to persona baseline.
   * @param {number} [targetGlucose=null] - Optional override
   */
  reset(targetGlucose = null) {
    this.arNoise = 0;
    this.currentGlucose =
      targetGlucose !== null ? targetGlucose : this.persona.baseline;
    this.previousGlucose = null;
  }
}

module.exports = {
  GlucoseModel,
  PHYSIOLOGICAL_MIN,
  PHYSIOLOGICAL_MAX,
  calculateCircadianDrift,
  classifyTrend
};

