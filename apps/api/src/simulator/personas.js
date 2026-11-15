/**
 * GlucoGuard Virtual Patient Personas (Module M1)
 *
 * Defines the 6 clinical patient personas for the Virtual CGM Simulator:
 * - VP-01: Healthy Individual (Non-Diabetic, 80-110 mg/dL baseline)
 * - VP-02: Well-Managed Type 1 (100-140 mg/dL baseline)
 * - VP-03: Brittle Type 1 (High Risk, 60-240 mg/dL baseline with high volatility)
 * - VP-04: Type 2 (Insulin Resistant, 130-190 mg/dL baseline)
 * - VP-05: Pre-Diabetes / Impaired Glucose Tolerance (100-150 mg/dL baseline)
 * - VP-06: Active Athlete (75-120 mg/dL baseline)
 *
 * @module simulator/personas
 */

const PERSONAS = {
  'VP-01': {
    id: 'VP-01',
    name: 'Healthy Individual (Non-Diabetic)',
    userId: 'usr_patient_01',
    deviceId: 'VIRTUAL_CGM_VP01',
    baseline: 95,
    minBaseline: 80,
    maxBaseline: 110,
    targetRange: { low: 70, high: 140 },
    volatility: 1.2,
    arPhi: 0.82,
    circadianAmplitude: 5.0,
    clearanceRate: 1.5,
    insulinSensitivity: 1.2,
    description: 'Tight glycemic regulation (80–110 mg/dL fasting), swift endogenous insulin response and post-meal recovery.'
  },
  'VP-02': {
    id: 'VP-02',
    name: 'Well-Managed Type 1',
    userId: 'usr_patient_02',
    deviceId: 'VIRTUAL_CGM_VP02',
    baseline: 120,
    minBaseline: 100,
    maxBaseline: 140,
    targetRange: { low: 70, high: 180 },
    volatility: 2.4,
    arPhi: 0.88,
    circadianAmplitude: 12.0,
    clearanceRate: 1.0,
    insulinSensitivity: 1.0,
    description: 'Controlled baseline (100–140 mg/dL), predictable post-meal excursions (160–180 mg/dL), adheres to basal-bolus regimen.'
  },
  'VP-03': {
    id: 'VP-03',
    name: 'Brittle Type 1 (High Risk)',
    userId: 'usr_patient_03',
    deviceId: 'VIRTUAL_CGM_VP03',
    baseline: 150,
    minBaseline: 60,
    maxBaseline: 240,
    targetRange: { low: 70, high: 180 },
    volatility: 4.8,
    arPhi: 0.93,
    circadianAmplitude: 24.0,
    clearanceRate: 0.65,
    insulinSensitivity: 0.75,
    description: 'Severe glycemic variability (60–240 mg/dL), frequent unheralded drops, nocturnal hypoglycemia, primary target for emergency escalation testing.'
  },
  'VP-04': {
    id: 'VP-04',
    name: 'Type 2 Diabetes (Insulin Resistant)',
    userId: 'usr_patient_04',
    deviceId: 'VIRTUAL_CGM_VP04',
    baseline: 160,
    minBaseline: 130,
    maxBaseline: 190,
    targetRange: { low: 70, high: 180 },
    volatility: 2.1,
    arPhi: 0.90,
    circadianAmplitude: 14.0,
    clearanceRate: 0.50,
    insulinSensitivity: 0.45,
    description: 'Elevated fasting baseline (130–190 mg/dL), prolonged post-prandial plateau with sluggish clearance due to peripheral insulin resistance.'
  },
  'VP-05': {
    id: 'VP-05',
    name: 'Pre-Diabetes (Impaired Glucose Tolerance)',
    userId: 'usr_patient_05',
    deviceId: 'VIRTUAL_CGM_VP05',
    baseline: 118,
    minBaseline: 100,
    maxBaseline: 150,
    targetRange: { low: 70, high: 140 },
    volatility: 1.8,
    arPhi: 0.85,
    circadianAmplitude: 8.5,
    clearanceRate: 0.80,
    insulinSensitivity: 0.80,
    description: 'Normal-to-borderline fasting levels (100–120 mg/dL), delayed glucose clearance following carbohydrate-rich intake.'
  },
  'VP-06': {
    id: 'VP-06',
    name: 'Active Athlete',
    userId: 'usr_patient_06',
    deviceId: 'VIRTUAL_CGM_VP06',
    baseline: 88,
    minBaseline: 75,
    maxBaseline: 120,
    targetRange: { low: 70, high: 140 },
    volatility: 1.5,
    arPhi: 0.84,
    circadianAmplitude: 6.0,
    clearanceRate: 1.6,
    insulinSensitivity: 1.4,
    description: 'Dynamic metabolic responsiveness (75–120 mg/dL), high muscular insulin sensitivity, rapid exercise-induced glucose drawdown.'
  }
};

const DEFAULT_PERSONA_ID = 'VP-01';

/**
 * Retrieves a virtual patient persona by ID.
 * @param {string} id - Persona identifier (e.g. 'VP-01' through 'VP-06')
 * @returns {object} Persona configuration object
 */
function getPersona(id) {
  const normalizedId = (id || DEFAULT_PERSONA_ID).toUpperCase();
  const persona = PERSONAS[normalizedId];
  if (!persona) {
    const validIds = Object.keys(PERSONAS).join(', ');
    throw new Error(`Unknown persona ID: "${id}". Valid persona IDs are: ${validIds}`);
  }
  // Return a cloned copy to prevent accidental mutation
  return JSON.parse(JSON.stringify(persona));
}

/**
 * Returns all available virtual patient personas.
 * @returns {Array<object>} Array of all personas
 */
function getAllPersonas() {
  return Object.values(PERSONAS).map((p) => JSON.parse(JSON.stringify(p)));
}

module.exports = {
  PERSONAS,
  DEFAULT_PERSONA_ID,
  getPersona,
  getAllPersonas
};

