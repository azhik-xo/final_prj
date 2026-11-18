/**
 * GlucoGuard Clinical Alert Rules Engine (Module M7)
 *
 * Implements real-time clinical threshold evaluation, multi-stage
 * emergency escalation, smart alert suppression/cooldown, and
 * simulated SOS dispatch coordination.
 *
 * Clinical Reference: ADA Standards of Care / ADR-006, ADR-007, ADR-011
 *
 * @module modules/alerts/alertEngine
 */

const THRESHOLDS = {
  CRITICAL_HYPO_LEVEL: 54, // < 54 mg/dL
  WARNING_HYPO_LEVEL: 70,  // < 70 mg/dL
  RAPID_DROP_VELOCITY: -2.5, // mg/dL/min
  WARNING_HYPER_LEVEL: 250, // > 250 mg/dL
  CRITICAL_HYPER_LEVEL: 300 // > 300 mg/dL
};

const COOLDOWN_MS = 15 * 60 * 1000; // 15-minute suppression window
const DEFAULT_COUNTDOWN_SECONDS = 60;

class AlertEngine {
  constructor() {
    // In-memory cache for fast lookup and state management
    this.activeAlerts = new Map(); // key: userId -> Alert object
    this.alertHistory = []; // chronological log
    this.lastAlertTimestamps = new Map(); // key: `${userId}_${severity}` -> timestamp
  }

  /**
   * Evaluates an incoming CGM telemetry reading against clinical thresholds.
   *
   * @param {object} reading - CGM telemetry payload
   * @returns {object|null} Generated alert object or null if normal or suppressed
   */
  evaluateReading(reading) {
    if (!reading || typeof reading.glucose !== 'number') {
      return null;
    }

    const {
      glucose,
      rateOfChange = 0.0,
      deviceId = 'CGM-SENSOR-SIM',
      userId = 'usr_patient_03',
      timestamp = new Date()
    } = reading;

    let alertType = null;
    let severity = null;
    let title = '';
    let message = '';
    let actionProtocol = '';

    // 1. Critical Hypoglycemia (< 54 mg/dL OR < 70 mg/dL with plunge < -2.5 mg/dL/min)
    if (glucose < THRESHOLDS.CRITICAL_HYPO_LEVEL || (glucose < THRESHOLDS.WARNING_HYPO_LEVEL && rateOfChange < THRESHOLDS.RAPID_DROP_VELOCITY)) {
      alertType = 'CRITICAL_HYPO';
      severity = 'CRITICAL';
      title = 'CRITICAL HYPOGLYCEMIA ALERT';
      message = `Blood glucose reached dangerous low of ${glucose} mg/dL (rate: ${rateOfChange} mg/dL/min). Acute risk of neuroglycopenic impairment.`;
      actionProtocol = 'Immediate intervention required. Consume 15–20g of fast-acting simple carbohydrates (juice, glucose tabs). If unacknowledged, system escalates to caregiver and simulated EMS dispatch.';
    }
    // 2. Warning Hypoglycemia (54 - 69 mg/dL)
    else if (glucose < THRESHOLDS.WARNING_HYPO_LEVEL) {
      alertType = 'WARNING_HYPO';
      severity = 'WARNING';
      title = 'HYPOGLYCEMIA WARNING';
      message = `Blood glucose dropped to ${glucose} mg/dL. Approaching clinical hypoglycemia.`;
      actionProtocol = 'Consume 15g fast-acting carbohydrates (Rule of 15). Recheck glucose in 15 minutes.';
    }
    // 3. Critical Hyperglycemia (> 300 mg/dL)
    else if (glucose > THRESHOLDS.CRITICAL_HYPER_LEVEL) {
      alertType = 'CRITICAL_HYPER';
      severity = 'CRITICAL';
      title = 'CRITICAL HYPERGLYCEMIA ALERT';
      message = `Blood glucose severely elevated at ${glucose} mg/dL. Elevated risk of diabetic ketoacidosis (DKA) / hyperosmolar state.`;
      actionProtocol = 'Drink 500ml water, test blood/urine ketones immediately, contact physician or endocrinology care team.';
    }
    // 4. Warning Hyperglycemia (250 - 300 mg/dL)
    else if (glucose > THRESHOLDS.WARNING_HYPER_LEVEL) {
      alertType = 'WARNING_HYPER';
      severity = 'WARNING';
      title = 'HYPERGLYCEMIA WARNING';
      message = `Blood glucose elevated at ${glucose} mg/dL.`;
      actionProtocol = 'Hydrate with fresh water. Avoid carbohydrates and re-test trend in 20 minutes.';
    }

    // Normal range: no alert
    if (!alertType) {
      // If patient had an active alert and glucose has returned to safe range (80-180), resolve it
      if (glucose >= 80 && glucose <= 180 && this.activeAlerts.has(userId)) {
        const active = this.activeAlerts.get(userId);
        if (active.status !== 'resolved') {
          active.status = 'resolved';
          active.resolvedAt = new Date();
          active.resolvedGlucose = glucose;
          this.activeAlerts.delete(userId);
        }
      }
      return null;
    }

    // Check Cooldown Suppression
    const cooldownKey = `${userId}_${severity}`;
    const lastTimestamp = this.lastAlertTimestamps.get(cooldownKey);
    const now = Date.now();

    // If an alert exists for this user, check severity escalation override
    const currentActive = this.activeAlerts.get(userId);
    const isEscalation = currentActive && currentActive.severity === 'WARNING' && severity === 'CRITICAL';

    if (lastTimestamp && (now - lastTimestamp < COOLDOWN_MS) && !isEscalation) {
      // Alert suppressed under 15-minute cooldown window to prevent notification fatigue
      return null;
    }

    // Record timestamp for suppression
    this.lastAlertTimestamps.set(cooldownKey, now);

    const alertId = 'alt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const newAlert = {
      alertId,
      _id: alertId,
      userId,
      deviceId,
      glucose,
      rateOfChange,
      alertType,
      severity,
      title,
      message,
      actionProtocol,
      status: 'triggered', // 'triggered' | 'acknowledged' | 'caregiver_escalated' | 'sos_dispatched' | 'resolved'
      stage: 1, // Stage 1 (Patient Countdown)
      countdownSeconds: DEFAULT_COUNTDOWN_SECONDS,
      acknowledgedBy: null,
      acknowledgedAt: null,
      actionTaken: null,
      caregiverNotified: false,
      caregiverNotifiedAt: null,
      simulatedSos: {
        dispatched: false,
        vehicleId: null,
        etaMinutes: null,
        coords: { lat: 13.0827, lng: 80.2707 }, // Simulation GPS (Chennai coordinates default)
        dispatchedAt: null
      },
      source: 'simulation',
      disclaimer: 'SIMULATION ONLY: No actual emergency services (911/112) are contacted.',
      timestamp: new Date(timestamp)
    };

    this.activeAlerts.set(userId, newAlert);
    this.alertHistory.unshift(newAlert);

    return newAlert;
  }

  /**
   * Retrieves the currently active unacknowledged alert for a patient.
   */
  getActiveAlert(userId = 'usr_patient_03') {
    return this.activeAlerts.get(userId) || null;
  }

  /**
   * Acknowledges an active alert, cancelling the escalation countdown.
   */
  acknowledgeAlert(alertId, acknowledgedBy = 'patient', actionTaken = 'fast_carbs') {
    let targetAlert = null;
    for (const [userId, alert] of this.activeAlerts.entries()) {
      if (alert.alertId === alertId || alert._id === alertId) {
        targetAlert = alert;
        break;
      }
    }

    if (!targetAlert) {
      // Check history
      targetAlert = this.alertHistory.find((a) => a.alertId === alertId || a._id === alertId);
    }

    if (targetAlert) {
      targetAlert.status = 'acknowledged';
      targetAlert.acknowledgedBy = acknowledgedBy;
      targetAlert.acknowledgedAt = new Date();
      targetAlert.actionTaken = actionTaken;
      this.activeAlerts.delete(targetAlert.userId);
      return targetAlert;
    }

    return null;
  }

  /**
   * Escalates alert to Stage 2 (Caregiver SMS/Push Notification).
   */
  escalateToCaregiver(alertId) {
    let targetAlert = null;
    for (const alert of this.activeAlerts.values()) {
      if (alert.alertId === alertId || alert._id === alertId) {
        targetAlert = alert;
        break;
      }
    }

    if (!targetAlert) {
      targetAlert = this.alertHistory.find((a) => a.alertId === alertId || a._id === alertId);
    }

    if (targetAlert) {
      targetAlert.stage = 2;
      targetAlert.status = 'caregiver_escalated';
      targetAlert.caregiverNotified = true;
      targetAlert.caregiverNotifiedAt = new Date();
      return targetAlert;
    }

    return null;
  }

  /**
   * Dispatches Simulated Stage 3 EMS Ambulance Dispatch.
   */
  dispatchSimulatedSos(alertId, coords = null) {
    let targetAlert = null;
    for (const alert of this.activeAlerts.values()) {
      if (alert.alertId === alertId || alert._id === alertId) {
        targetAlert = alert;
        break;
      }
    }

    if (!targetAlert) {
      targetAlert = this.alertHistory.find((a) => a.alertId === alertId || a._id === alertId);
    }

    if (targetAlert) {
      targetAlert.stage = 3;
      targetAlert.status = 'sos_dispatched';
      targetAlert.caregiverNotified = true;
      targetAlert.simulatedSos = {
        dispatched: true,
        vehicleId: 'AMB-GLUCO-108',
        etaMinutes: 8,
        coords: coords || { lat: 13.0827, lng: 80.2707 },
        dispatchedAt: new Date()
      };
      return targetAlert;
    }

    return null;
  }

  /**
   * Returns chronological alert history.
   */
  getHistory(userId = 'usr_patient_03', limit = 50) {
    return this.alertHistory
      .filter((a) => !userId || a.userId === userId)
      .slice(0, limit);
  }

  /**
   * Clears state (useful for test resets).
   */
  reset() {
    this.activeAlerts.clear();
    this.alertHistory = [];
    this.lastAlertTimestamps.clear();
  }
}

const alertEngine = new AlertEngine();

module.exports = {
  AlertEngine,
  alertEngine,
  THRESHOLDS
};
