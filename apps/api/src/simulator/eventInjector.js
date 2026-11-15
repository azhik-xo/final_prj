/**
 * GlucoGuard Virtual CGM Event Injector (Module M1)
 *
 * Simulates dynamic physiological glycemic events:
 * - meal_spike: Rapid carbohydrate absorption (+60 to +100 mg/dL peak in 20-30 min)
 * - hypo_drop: Steep decline (<-2.5 mg/dL/min) dropping below 70 mg/dL down to 50-55 mg/dL
 * - exercise: Muscle glucose uptake drawdown (-1.5 mg/dL/min)
 * - rescue_carbs: Fast-acting oral glucose intervention (restores normoglycemia)
 * - reset: Smooth return to persona baseline
 *
 * @module simulator/eventInjector
 */

const VALID_EVENT_TYPES = [
  'meal_spike',
  'hypo_drop',
  'exercise',
  'rescue_carbs',
  'reset'
];

class EventInjector {
  constructor() {
    this.activeEvent = null;
    this.elapsedMinutes = 0;
    this.eventState = null;
  }

  /**
   * Injects a dynamic glycemic event.
   * @param {string} eventType - One of: meal_spike, hypo_drop, exercise, rescue_carbs, reset
   * @param {object} [params={}] - Optional event configuration parameters
   * @param {number} [currentGlucose=100] - Glucose value at moment of injection
   * @param {object} [persona=null] - Active persona profile
   * @returns {object} Initialized event state
   */
  inject(eventType, params = {}, currentGlucose = 100, persona = null) {
    if (!VALID_EVENT_TYPES.includes(eventType)) {
      throw new Error(
        `Invalid event type: "${eventType}". Valid types: ${VALID_EVENT_TYPES.join(', ')}`
      );
    }

    this.activeEvent = eventType;
    this.elapsedMinutes = 0;
    const startGlucose = Number(currentGlucose) || 100;

    switch (eventType) {
      case 'meal_spike': {
        // Peak rise between +60 and +100 mg/dL, default +75 mg/dL
        const peakRise = Math.min(
          100,
          Math.max(60, Number(params.peakRise) || 75)
        );
        const peakTime = Number(params.peakTime) || 25; // minutes to peak
        this.eventState = {
          type: 'meal_spike',
          peakRise,
          peakTime,
          startGlucose,
          previousExcursion: 0
        };
        break;
      }

      case 'hypo_drop': {
        // Steep drop rate <-2.5 mg/dL/min down to 50-55 mg/dL
        const targetNadir = Math.min(
          55,
          Math.max(50, Number(params.targetNadir) || 52)
        );
        const dropRate = -Math.abs(Number(params.dropRate) || 2.8); // mg/dL/min (< -2.5)
        this.eventState = {
          type: 'hypo_drop',
          startGlucose,
          targetNadir,
          dropRate
        };
        break;
      }

      case 'exercise': {
        // Steady drawdown at -1.5 mg/dL/min
        const drawdownRate = -Math.abs(Number(params.drawdownRate) || 1.5);
        const floorGlucose = Math.max(70, Number(params.floorGlucose) || 75);
        this.eventState = {
          type: 'exercise',
          startGlucose,
          drawdownRate,
          floorGlucose
        };
        break;
      }

      case 'rescue_carbs': {
        // Rapid recovery from hypoglycemia back to normoglycemia
        const targetRecovery = Math.max(
          100,
          Number(params.targetRecovery) || (persona ? persona.baseline : 105)
        );
        const riseRate = Math.abs(Number(params.riseRate) || 2.8);
        this.eventState = {
          type: 'rescue_carbs',
          startGlucose,
          targetRecovery,
          riseRate
        };
        break;
      }

      case 'reset': {
        // Smooth return to baseline
        const targetBaseline = persona ? persona.baseline : 100;
        this.eventState = {
          type: 'reset',
          startGlucose,
          targetBaseline,
          recoveryRate: 2.0 // mg/dL/min towards baseline
        };
        break;
      }

      default:
        this.eventState = null;
    }

    return {
      activeEvent: this.activeEvent,
      ...this.eventState
    };
  }

  /**
   * Advances the active event by dtMinutes and calculates the incremental glucose delta.
   * @param {number} dtMinutes - Elapsed simulation time for this tick (in minutes)
   * @param {number} currentGlucose - Current glucose reading before this tick
   * @param {number} baseline - Persona natural fasting baseline
   * @param {object} [persona=null] - Persona object
   * @returns {number} Incremental glucose delta (mg/dL) to apply for this tick
   */
  step(dtMinutes, currentGlucose, baseline, persona = null) {
    if (!this.activeEvent || !this.eventState) {
      return 0;
    }

    this.elapsedMinutes += dtMinutes;
    const t = this.elapsedMinutes;

    switch (this.activeEvent) {
      case 'meal_spike': {
        // Pharmacokinetic double-exponential absorption curve:
        // Excursion(t) = peakRise * (t / tPeak) * exp(1 - t / tPeak)
        const { peakRise, peakTime, previousExcursion } = this.eventState;
        const currentExcursion =
          peakRise * (t / peakTime) * Math.exp(1 - t / peakTime);
        const delta = currentExcursion - previousExcursion;
        this.eventState.previousExcursion = currentExcursion;

        // Auto-conclude if excursion has decayed to under 2 mg/dL after peak
        if (t > peakTime * 3 && currentExcursion < 2.0) {
          this.clear();
        }

        return delta;
      }

      case 'hypo_drop': {
        const { targetNadir, dropRate } = this.eventState;
        if (currentGlucose <= targetNadir) {
          // Reached nadir: clamp around 50-55 mg/dL nadir with slight fluctuation
          const nadirOffset = (targetNadir - currentGlucose) * 0.3;
          return nadirOffset;
        }
        // Step down at the steep drop rate (< -2.5 mg/dL/min)
        const proposedDelta = dropRate * dtMinutes;
        const potentialGlucose = currentGlucose + proposedDelta;
        if (potentialGlucose < targetNadir) {
          return targetNadir - currentGlucose;
        }
        return proposedDelta;
      }

      case 'exercise': {
        const { floorGlucose, drawdownRate } = this.eventState;
        if (currentGlucose <= floorGlucose) {
          return (floorGlucose - currentGlucose) * 0.2;
        }
        const proposedDelta = drawdownRate * dtMinutes;
        const potentialGlucose = currentGlucose + proposedDelta;
        if (potentialGlucose < floorGlucose) {
          return floorGlucose - currentGlucose;
        }
        return proposedDelta;
      }

      case 'rescue_carbs': {
        const { targetRecovery, riseRate } = this.eventState;
        if (currentGlucose >= targetRecovery) {
          // Recovered! Auto-clear event and return to normal
          this.clear();
          return 0;
        }
        const proposedDelta = riseRate * dtMinutes;
        const potentialGlucose = currentGlucose + proposedDelta;
        if (potentialGlucose > targetRecovery) {
          const delta = targetRecovery - currentGlucose;
          this.clear();
          return delta;
        }
        return proposedDelta;
      }

      case 'reset': {
        const { targetBaseline, recoveryRate } = this.eventState;
        const diff = targetBaseline - currentGlucose;
        if (Math.abs(diff) < 1.0) {
          this.clear();
          return diff;
        }
        const stepSize = Math.sign(diff) * Math.min(Math.abs(diff), recoveryRate * dtMinutes);
        return stepSize;
      }

      default:
        return 0;
    }
  }

  /**
   * Clears any active event.
   */
  clear() {
    this.activeEvent = null;
    this.elapsedMinutes = 0;
    this.eventState = null;
  }

  /**
   * Returns current active event name or null.
   * @returns {string|null}
   */
  getActiveEvent() {
    return this.activeEvent;
  }
}

module.exports = {
  EventInjector,
  VALID_EVENT_TYPES
};
