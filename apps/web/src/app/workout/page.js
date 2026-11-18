'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Dumbbell,
  Activity,
  Flame,
  ShieldAlert,
  CheckCircle2,
  Heart,
  Lock,
  Unlock,
  Clock,
  Footprints,
  Plus,
  Sparkles,
  TrendingDown,
  AlertCircle,
  Info,
  RefreshCw,
  Sliders,
  Calendar,
  Zap,
  ArrowRight
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Reference activities with calibrated METs (ADR-010)
const DEFAULT_ACTIVITIES = [
  {
    id: 'brisk_walking',
    name: '30m Brisk Walking',
    category: 'aerobic',
    met: 3.8,
    intensity: 'moderate',
    defaultDuration: 30,
    description: 'Steady aerobic walk. Stimulates insulin-independent muscle GLUT4 uptake.'
  },
  {
    id: 'light_jogging',
    name: '20m Light Jogging',
    category: 'aerobic',
    met: 8.3,
    intensity: 'high',
    defaultDuration: 20,
    description: 'Vigorous aerobic stride. Higher rate of skeletal glycogen consumption.'
  },
  {
    id: 'cycling_moderate',
    name: '25m Trail / Road Cycling',
    category: 'aerobic',
    met: 6.8,
    intensity: 'moderate',
    defaultDuration: 25,
    description: 'Continuous quadriceps and cardiovascular loading with predictable drawdown.'
  },
  {
    id: 'swimming_freestyle',
    name: '30m Lap Swimming',
    category: 'full_body',
    met: 7.0,
    intensity: 'high',
    defaultDuration: 30,
    description: 'Full-body resistance and aerobic conditioning across all major muscle groups.'
  },
  {
    id: 'resistance_training',
    name: '20m Dumbbell Resistance',
    category: 'anaerobic',
    met: 5.0,
    intensity: 'moderate',
    defaultDuration: 20,
    description: 'Hypertrophic resistance training with delayed post-workout glucose clearance.'
  },
  {
    id: 'gentle_yoga',
    name: '25m Gentle Hatha Yoga',
    category: 'flexibility',
    met: 2.5,
    intensity: 'low',
    defaultDuration: 25,
    description: 'Restorative movement that lowers cortisol without precipitous glucose drops.'
  }
];

// Local deterministic physiological drawdown calculator (0ms latency preview)
function calculateLocalWorkoutImpact(activityId, duration, intensity, currentGlucose, rateOfChange = 0, weightKg = 70) {
  const g = Math.max(40, Math.min(400, Number(currentGlucose) || 120));
  const roc = Number(rateOfChange || 0);
  const dur = Math.max(5, Math.min(180, Number(duration) || 30));
  const weight = Math.max(40, Math.min(150, Number(weightKg) || 70));

  const metMap = {
    brisk_walking: 3.8,
    light_jogging: 8.3,
    cycling_moderate: 6.8,
    swimming_freestyle: 7.0,
    resistance_training: 5.0,
    gentle_yoga: 2.5
  };
  const met = metMap[activityId] || 3.8;
  const intensityFactor = intensity === 'low' ? 0.7 : intensity === 'high' ? 1.35 : 1.0;

  // Evaluate clinical safety interlocks
  let safetyStatus = 'safe';
  let isSafe = true;
  let title = 'Safe to Exercise';
  let reason = `Blood glucose (${g} mg/dL) is within optimal clinical training window (90–250 mg/dL).`;
  let actionProtocol = 'Target glycemic conditions optimal for physical training. Maintain consistent hydration.';

  if (g < 90 || (g < 110 && roc < -1.5)) {
    safetyStatus = 'locked_hypo';
    isSafe = false;
    title = 'Exercise Locked: Low Glucose Level';
    reason = `Current glucose is ${g} mg/dL (<90 mg/dL) with velocity ${roc} mg/dL/min.`;
    actionProtocol = 'DO NOT EXERCISE. Physical exertion under hypoglycemia risks severe loss of consciousness. Consume 15g fast-acting carbohydrates immediately. Wait until blood glucose is steadily above 100 mg/dL.';
  } else if (g > 250) {
    safetyStatus = 'caution_hyper';
    if (intensity === 'high') {
      isSafe = false;
      title = 'Strenuous Exercise Locked: High Glucose Alert';
      reason = `Current glucose is ${g} mg/dL (>250 mg/dL). Strenuous anaerobic exercise precipitates ketosis risk.`;
      actionProtocol = 'High-intensity exercise is locked out. Hydrate with 500ml water and restrict to gentle walking.';
    } else {
      isSafe = true;
      title = 'Exercise Caution: Elevated Blood Sugar';
      reason = `Current glucose is ${g} mg/dL (>250 mg/dL). Restrict to low or moderate intensity.`;
      actionProtocol = 'Gentle low-intensity exercise is permitted and can assist glucose clearance. Drink plenty of water.';
    }
  }

  const caloriesBurned = Math.round(met * weight * (dur / 60.0) * 10) / 10;
  const drawdown = isSafe
    ? Math.max(-120, Math.min(0, Math.round(-1.0 * dur * intensityFactor * (met / 3.5) * 10) / 10))
    : 0;

  const projectedPostGlucose = Math.max(40, Math.min(400, Math.round((g + drawdown) * 10) / 10));
  const timeToNadir = dur + 10;

  // 2-Hour trajectory
  const trajectory = [];
  for (let min = 0; min <= 120; min += 10) {
    let delta;
    if (min <= timeToNadir) {
      delta = drawdown * Math.sin((Math.PI / 2.0) * (min / Math.max(1, timeToNadir)));
    } else {
      const elapsed = min - timeToNadir;
      const rebound = (-drawdown * 0.28) * (1.0 - Math.exp(-elapsed / 40.0));
      delta = drawdown + rebound;
    }
    trajectory.push({
      minute: min,
      projectedGlucose: Math.max(40, Math.min(400, Math.round((g + delta) * 10) / 10)),
      delta: Math.round(delta * 10) / 10
    });
  }

  const needsPreemptiveSnack = isSafe && projectedPostGlucose < 75;

  return {
    activityId,
    durationMinutes: dur,
    intensity,
    met,
    caloriesBurned,
    startGlucose: g,
    estimatedDrawdownMgDl: drawdown,
    timeToNadirMinutes: timeToNadir,
    projectedPostGlucose,
    safetyStatus,
    isSafe,
    safetyTitle: title,
    safetyReason: reason,
    actionProtocol,
    needsPreemptiveSnack,
    trajectory
  };
}

export default function WorkoutPlannerPage() {
  // Current Simulation State & Form Inputs
  const [currentGlucose, setCurrentGlucose] = useState(135);
  const [rateOfChange, setRateOfChange] = useState(0.0);
  const [activityId, setActivityId] = useState('brisk_walking');
  const [activityName, setActivityName] = useState('30m Brisk Walking');
  const [intensity, setIntensity] = useState('moderate');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [bodyWeightKg, setBodyWeightKg] = useState(70);
  const [injectSimulation, setInjectSimulation] = useState(true);

  // Collections & Remote Telemetry
  const [loggedActivities, setLoggedActivities] = useState([]);
  const [presetActivities, setPresetActivities] = useState(DEFAULT_ACTIVITIES);
  const [guidelines, setGuidelines] = useState([
    'Verify blood glucose before starting: 90–250 mg/dL is the target safe training zone.',
    'Always carry 15g of fast-acting simple carbohydrates (juice, glucose tabs) during workouts.',
    'For sessions longer than 45 minutes, consume a 15–20g complex carb + protein snack.',
    'Stay hydrated: drink 250ml water every 20 minutes of moderate-to-vigorous exercise.',
    'If blood sugar is >250 mg/dL, avoid high-intensity sprints to prevent counter-regulatory ketosis.'
  ]);

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [selectedPresetId, setSelectedPresetId] = useState('brisk_walking');

  // Real-Time Local AI Safety & Drawdown Calculation
  const localPrediction = useMemo(() => {
    return calculateLocalWorkoutImpact(
      activityId,
      durationMinutes,
      intensity,
      currentGlucose,
      rateOfChange,
      bodyWeightKg
    );
  }, [activityId, durationMinutes, intensity, currentGlucose, rateOfChange, bodyWeightKg]);

  // Fetch initial activities and history
  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch Logged Activities
      const logsRes = await fetch(`${API_BASE}/api/v1/activity/logs?userId=usr_patient_03`);
      if (logsRes.ok) {
        const logsJson = await logsRes.json();
        if (logsJson.data && Array.isArray(logsJson.data)) {
          setLoggedActivities(logsJson.data);
        }
      }
    } catch {
      // Retain existing
    }

    try {
      // 2. Fetch Reference Activities
      const actRes = await fetch(`${API_BASE}/api/v1/activity/activities`);
      if (actRes.ok) {
        const actJson = await actRes.json();
        if (actJson.data && Array.isArray(actJson.data) && actJson.data.length > 0) {
          setPresetActivities(actJson.data);
        }
      }
    } catch {
      // Retain defaults
    }

    try {
      // 3. Fetch Guidelines
      const recRes = await fetch(`${API_BASE}/api/v1/activity/recommendations`);
      if (recRes.ok) {
        const recJson = await recRes.json();
        if (recJson.data?.guidelines) {
          setGuidelines(recJson.data.guidelines);
        }
      }
    } catch {
      // Retain defaults
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle preset selection
  const handleSelectPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setActivityId(preset.id);
    setActivityName(preset.name);
    setIntensity(preset.intensity || 'moderate');
    setDurationMinutes(preset.defaultDuration || 30);
    setStatusMessage({
      type: 'info',
      text: `Loaded preset: ${preset.name}. Review safety interlock and drawdown preview.`
    });
  };

  // Submit and log workout
  const handleLogWorkout = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatusMessage(null);

    const payload = {
      userId: 'usr_patient_03',
      activityType: activityId,
      name: activityName.trim() || 'Physical Activity',
      intensity,
      durationMinutes: Number(durationMinutes),
      startGlucose: Number(currentGlucose),
      rateOfChange: Number(rateOfChange),
      bodyWeightKg: Number(bodyWeightKg),
      injectSimulationEvent: injectSimulation
    };

    try {
      const response = await fetch(`${API_BASE}/api/v1/activity/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const savedAct = result.data?.activity || {
          ...payload,
          _id: 'local_' + Date.now(),
          estimatedDrawdownMgDl: localPrediction.estimatedDrawdownMgDl,
          projectedPostGlucose: localPrediction.projectedPostGlucose,
          caloriesBurned: localPrediction.caloriesBurned,
          safetyStatus: localPrediction.safetyStatus,
          timestamp: new Date().toISOString()
        };

        setLoggedActivities((prev) => [savedAct, ...prev]);
        setStatusMessage({
          type: localPrediction.isSafe ? 'success' : 'error',
          text: localPrediction.isSafe
            ? `Workout "${activityName}" logged successfully! Drawdown: ${localPrediction.estimatedDrawdownMgDl} mg/dL.${
                injectSimulation ? ' Injected exercise drawdown event into live simulation.' : ''
              }`
            : `Exercise logged with Safety Warning: ${localPrediction.safetyTitle}`
        });
      } else {
        // Fallback local persistence
        const localAct = {
          ...payload,
          _id: 'local_' + Date.now(),
          estimatedDrawdownMgDl: localPrediction.estimatedDrawdownMgDl,
          projectedPostGlucose: localPrediction.projectedPostGlucose,
          caloriesBurned: localPrediction.caloriesBurned,
          safetyStatus: localPrediction.safetyStatus,
          timestamp: new Date().toISOString()
        };
        setLoggedActivities((prev) => [localAct, ...prev]);
        setStatusMessage({
          type: localPrediction.isSafe ? 'success' : 'error',
          text: `Workout recorded in local session. Drawdown: ${localPrediction.estimatedDrawdownMgDl} mg/dL.`
        });
      }
    } catch {
      const fallbackAct = {
        ...payload,
        _id: 'local_' + Date.now(),
        estimatedDrawdownMgDl: localPrediction.estimatedDrawdownMgDl,
        projectedPostGlucose: localPrediction.projectedPostGlucose,
        caloriesBurned: localPrediction.caloriesBurned,
        safetyStatus: localPrediction.safetyStatus,
        timestamp: new Date().toISOString()
      };
      setLoggedActivities((prev) => [fallbackAct, ...prev]);
      setStatusMessage({
        type: localPrediction.isSafe ? 'success' : 'error',
        text: `Workout recorded in local session (offline). Drawdown: ${localPrediction.estimatedDrawdownMgDl} mg/dL.`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Breadcrumb & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                <Dumbbell className="w-3 h-3" />
                Module M6
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <ShieldAlert className="w-3 h-3" />
                Clinical Safety Interlocks
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                source: simulation
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              AI Workout Planner & Glycemic Safety Engine
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Simulate physical activity kinetics, enforce clinical hypoglycemia lockouts, and forecast
              exercise-induced blood sugar drawdowns before beginning workouts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              Patient Dashboard
            </Link>
            <Link
              href="/diet"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
            >
              <Footprints className="w-3.5 h-3.5 text-amber-600" />
              Diet Planner
            </Link>
          </div>
        </div>

        {/* Dynamic Clinical Safety Interlock Hero Banner (ADA Guidelines / ADR-010) */}
        <section
          className={`rounded-2xl p-6 border shadow-sm transition-colors ${
            localPrediction.safetyStatus === 'locked_hypo'
              ? 'bg-rose-50 border-rose-300 text-rose-950'
              : localPrediction.safetyStatus === 'caution_hyper'
              ? 'bg-amber-50 border-amber-300 text-amber-950'
              : 'bg-emerald-50 border-emerald-300 text-emerald-950'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  localPrediction.safetyStatus === 'locked_hypo'
                    ? 'bg-rose-600 text-white'
                    : localPrediction.safetyStatus === 'caution_hyper'
                    ? 'bg-amber-600 text-white'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {localPrediction.safetyStatus === 'locked_hypo' ? (
                  <Lock className="w-6 h-6" />
                ) : localPrediction.safetyStatus === 'caution_hyper' ? (
                  <AlertCircle className="w-6 h-6" />
                ) : (
                  <Unlock className="w-6 h-6" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      localPrediction.safetyStatus === 'locked_hypo'
                        ? 'bg-rose-200 text-rose-900'
                        : localPrediction.safetyStatus === 'caution_hyper'
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-emerald-200 text-emerald-900'
                    }`}
                  >
                    {localPrediction.safetyStatus === 'locked_hypo'
                      ? 'Clinical Lockout Active'
                      : localPrediction.safetyStatus === 'caution_hyper'
                      ? 'Elevated Sugar Caution'
                      : 'Interlock Disengaged'}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 font-mono">
                    Baseline: {currentGlucose} mg/dL {rateOfChange !== 0 ? `(${rateOfChange > 0 ? '+' : ''}${rateOfChange} mg/dL/min)` : ''}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  {localPrediction.safetyTitle}
                </h2>
                <p className="text-xs sm:text-sm mt-1 max-w-2xl opacity-90 leading-relaxed">
                  {localPrediction.actionProtocol}
                </p>
              </div>
            </div>

            {/* Quick Blood Sugar Scenario Switcher for Simulator Testing */}
            <div className="bg-white/80 backdrop-blur rounded-xl p-3 border border-slate-200/80 shrink-0 space-y-2">
              <span className="text-[11px] font-semibold text-slate-700 block">
                Test Simulation Glucose Scenario:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentGlucose(135);
                    setRateOfChange(0.0);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    currentGlucose === 135
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Safe (135 mg/dL)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentGlucose(78);
                    setRateOfChange(-0.5);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    currentGlucose === 78
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Low / Hypo (78 mg/dL)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentGlucose(105);
                    setRateOfChange(-2.2);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    currentGlucose === 105 && rateOfChange < -1.5
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Rapid Fall (105 mg/dL, -2.2)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentGlucose(265);
                    setRateOfChange(0.5);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                    currentGlucose === 265
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  High / Ketone Caution (265 mg/dL)
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Mandatory Clinical Simulation Disclaimer Banner (ADR-007 / ADR-010) */}
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong className="font-semibold block text-amber-950 mb-0.5">
              Non-Clinical Exercise Simulation Boundary (ADR-007 / ADR-010)
            </strong>
            GlucoGuard is a software-based educational simulation prototype. This physical activity planner models
            metabolic glucose drawdown using MET equations based on ADA standards. It does <strong>NOT</strong> provide
            prescriptive medical clearance, cardiac stress testing, or insulin basal adjustments. Patients with Type 1 or
            Type 2 diabetes must carry emergency glucose and consult their physician before changing exercise regimens.
          </div>
        </div>

        {/* Status Toast Banner */}
        {statusMessage && (
          <div
            className={`rounded-xl p-4 text-xs font-medium flex items-center justify-between border shadow-sm ${
              statusMessage.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-200'
                : statusMessage.type === 'info'
                ? 'bg-sky-50 text-sky-900 border-sky-200'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : statusMessage.type === 'info' ? (
                <Info className="w-4 h-4 text-sky-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600 ml-4 font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Section 1: 1-Click Reference Activity Presets */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-indigo-600" />
                1-Click Calibrated Workout Presets
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Standardized aerobic and resistance activities calibrated with physiological MET values.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {presetActivities.length} calibrated routines
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {presetActivities.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              const intensityBadge =
                preset.intensity === 'low'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : preset.intensity === 'moderate'
                  ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                  : 'bg-rose-100 text-rose-800 border-rose-200';

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-slate-900 line-clamp-1">
                        {preset.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 border ${intensityBadge}`}
                      >
                        {preset.intensity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mb-3">
                      {preset.description || `${preset.category} physical training routine.`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-600 font-mono">
                    <span className="font-semibold text-slate-800">
                      MET {preset.met}
                    </span>
                    <span>
                      {preset.defaultDuration || 30} mins
                    </span>
                    <span className="capitalize text-slate-400">
                      {preset.category}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 2: Interactive Workout Logger & Real-Time Drawdown Gauge */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Custom Workout Form (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  Custom Workout Planning & Simulation
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Adjust duration and intensity to compute kinetic glucose drawdowns in real time.
                </p>
              </div>
              <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                MET Kinetics
              </span>
            </div>

            <form onSubmit={handleLogWorkout} className="space-y-5">
              {/* Routine Name & Base Activity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Workout Session Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={activityName}
                    onChange={(e) => setActivityName(e.target.value)}
                    placeholder="e.g. Afternoon Lakeside Jog"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Activity Type
                  </label>
                  <select
                    value={activityId}
                    onChange={(e) => {
                      setActivityId(e.target.value);
                      const match = presetActivities.find((a) => a.id === e.target.value);
                      if (match) setActivityName(match.name);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 bg-white"
                  >
                    {presetActivities.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Intensity Selector Pills */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Workout Exertion Intensity
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'low', label: 'Low Intensity', desc: 'Gentle, conversational pace' },
                    { id: 'moderate', label: 'Moderate', desc: 'Elevated HR, light perspiration' },
                    { id: 'high', label: 'High / Strenuous', desc: 'Vigorous anaerobic exertion' }
                  ].map((level) => (
                    <button
                      key={level.id}
                      type="button"
                      onClick={() => setIntensity(level.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        intensity === level.id
                          ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20 text-indigo-950 shadow-sm'
                          : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="block text-xs font-bold capitalize">{level.label}</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">{level.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration Slider */}
              <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Workout Duration
                  </label>
                  <span className="text-xs font-bold text-indigo-900 font-mono">
                    {durationMinutes} minutes
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>5 mins (Quick)</span>
                  <span>45 mins (Standard)</span>
                  <span>120 mins (Endurance)</span>
                </div>
              </div>

              {/* Starting Glucose & Weight Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    Current Pre-Workout Glucose
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="40"
                      max="400"
                      value={currentGlucose}
                      onChange={(e) => setCurrentGlucose(Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 font-mono"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-semibold">
                      mg/dL
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    Patient Body Weight
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="40"
                      max="150"
                      value={bodyWeightKg}
                      onChange={(e) => setBodyWeightKg(Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-900 font-mono"
                    />
                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-semibold">
                      kg
                    </span>
                  </div>
                </div>
              </div>

              {/* Simulation Bridge Checkbox */}
              <div className="pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={injectSimulation}
                    onChange={(e) => setInjectSimulation(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                  <span>
                    Bridge with Virtual CGM Engine: trigger <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] text-slate-800">exercise</code> drawdown event on running simulator
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || (!localPrediction.isSafe && localPrediction.safetyStatus === 'locked_hypo')}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-all ${
                    !localPrediction.isSafe && localPrediction.safetyStatus === 'locked_hypo'
                      ? 'bg-slate-400 cursor-not-allowed opacity-75'
                      : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Evaluating & Persisting...
                    </>
                  ) : !localPrediction.isSafe && localPrediction.safetyStatus === 'locked_hypo' ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      Locked: Hypoglycemia Countermeasure Required
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Log Workout Session & Apply Drawdown
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Real-Time Drawdown Gauge & 2-Hour Recovery Trajectory (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Exercise Glycemic Impact
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    localPrediction.safetyStatus === 'locked_hypo'
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : localPrediction.safetyStatus === 'caution_hyper'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      localPrediction.safetyStatus === 'locked_hypo'
                        ? 'bg-rose-500'
                        : localPrediction.safetyStatus === 'caution_hyper'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  {localPrediction.safetyStatus === 'locked_hypo'
                    ? 'Hypo Lockout'
                    : localPrediction.safetyStatus === 'caution_hyper'
                    ? 'Hyper Caution'
                    : 'Safe Exertion'}
                </span>
              </div>

              {/* Primary Drawdown Metric Readout */}
              <div className="py-6 flex flex-col items-center justify-center text-center">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Estimated Glucose Drawdown
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`text-4xl sm:text-5xl font-black tracking-tight font-mono ${
                      localPrediction.isSafe ? 'text-indigo-600' : 'text-slate-400'
                    }`}
                  >
                    {localPrediction.estimatedDrawdownMgDl}
                  </span>
                  <span className="text-sm font-bold text-slate-500">mg/dL</span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs font-medium text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Projected Nadir: ~<strong className="text-slate-900">{localPrediction.projectedPostGlucose} mg/dL</strong>
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Flame className="w-3.5 h-3.5 text-orange-500" />
                  <span>Energy expenditure: ~<strong className="text-slate-800">{localPrediction.caloriesBurned} kcal</strong></span>
                </div>
              </div>

              {/* Preemptive Snack Warning Badge if Nadir drops too low */}
              {localPrediction.needsPreemptiveSnack && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-2 text-xs text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block">Preemptive Carbohydrate Snack Required:</strong>
                    Projected blood glucose drops below 75 mg/dL during this session. Consume a 15–20g snack (apple with peanut butter or whole grain toast) 15 minutes prior to starting.
                  </div>
                </div>
              )}

              {/* 2-Hour Recovery Trajectory SVG */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                  <span className="font-semibold text-slate-800">2-Hour Drawdown & Recovery Curve</span>
                  <span className="text-[10px] text-slate-400">Sinusoidal drawdown + post-workout rebound</span>
                </div>

                <div className="w-full h-24 relative flex items-end">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 120 60" preserveAspectRatio="none">
                    {/* Baseline reference line */}
                    <line x1="0" y1="15" x2="120" y2="15" stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth="1" />

                    {/* Gradient under curve */}
                    <defs>
                      <linearGradient id="workoutGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.0" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.25" />
                      </linearGradient>
                    </defs>

                    {localPrediction.trajectory.length > 0 && (
                      <>
                        <path
                          d={`M 0 15 ${localPrediction.trajectory
                            .map((p) => {
                              const x = (p.minute / 120) * 120;
                              // Delta is negative or 0; scale -120 mg/dL mapped to 40px down
                              const y = 15 - (p.delta / -120) * -38;
                              return `L ${x.toFixed(1)} ${y.toFixed(1)}`;
                            })
                            .join(' ')} L 120 15 Z`}
                          fill="url(#workoutGradient)"
                        />
                        <path
                          d={`M 0 15 ${localPrediction.trajectory
                            .map((p) => {
                              const x = (p.minute / 120) * 120;
                              const y = 15 - (p.delta / -120) * -38;
                              return `L ${x.toFixed(1)} ${y.toFixed(1)}`;
                            })
                            .join(' ')}`}
                          fill="none"
                          stroke={localPrediction.isSafe ? '#4f46e5' : '#94a3b8'}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </>
                    )}
                  </svg>
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-mono">
                  <span>0m (Start)</span>
                  <span>{durationMinutes}m (End)</span>
                  <span>60m (Nadir)</span>
                  <span>120m (Recovery)</span>
                </div>
              </div>

              {/* Pre-Workout Hydration & Safety Advice */}
              <div className="mt-5 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                <strong className="font-semibold text-slate-800 block">
                  Hydration & Safety Guidance:
                </strong>
                <p>
                  Drink 250ml water every 20 minutes. Keep fast-acting carbohydrates (Rule of 15) immediately accessible.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: ADA Physical Activity Standards & Emergency Guidance */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-600" />
                Clinical Exercise Protocols & Rule of 15
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Evidence-based physical activity standards of care for diabetes management.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              ADA Standards
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-2.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Target Exercise Glucose Guidelines
              </h4>
              <ul className="space-y-2 text-xs text-slate-600">
                {guidelines.map((g, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40">
              <h4 className="text-xs font-bold text-rose-950 flex items-center gap-1.5 mb-2.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                Hypoglycemia Emergency Protocol: The Rule of 15
              </h4>
              <ol className="space-y-2 text-xs text-rose-900 list-decimal list-inside">
                <li>Stop exertion immediately if blood sugar is &lt;90 mg/dL or you feel trembling, weak, or sweaty.</li>
                <li>Consume <strong>15g of fast-acting simple carbohydrates</strong> (4 oz fruit juice, 3-4 glucose tablets, or 5 hard candies).</li>
                <li>Wait <strong>15 minutes</strong> in a rested seated position.</li>
                <li>Recheck blood glucose. If still under 100 mg/dL, repeat with another 15g carbs until stable.</li>
              </ol>
            </div>
          </div>
        </section>

        {/* Section 4: Logged Workout History */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Logged Workout History & Telemetry Log
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chronological ledger of recorded exercise bouts and calculated metabolic glucose drawdowns.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {loggedActivities.length} recorded sessions
            </span>
          </div>

          {loggedActivities.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
              <Dumbbell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No Workouts Logged Yet</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Choose a workout preset above or configure a custom routine to log your first physical activity session.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3">Session Title</th>
                    <th className="py-3 px-3">Intensity</th>
                    <th className="py-3 px-3">Duration</th>
                    <th className="py-3 px-3">Calories</th>
                    <th className="py-3 px-3">Pre-Glucose</th>
                    <th className="py-3 px-3">Estimated Drawdown</th>
                    <th className="py-3 px-3">Post-Nadir</th>
                    <th className="py-3 px-3">Safety Status</th>
                    <th className="py-3 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loggedActivities.map((act, index) => {
                    const isHypo = act.safetyStatus === 'locked_hypo';
                    const isHyper = act.safetyStatus === 'caution_hyper';
                    const formattedTime = act.timestamp
                      ? new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Just now';

                    return (
                      <tr key={act._id || index} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-3 font-semibold text-slate-900">
                          {act.name}
                        </td>
                        <td className="py-3.5 px-3 uppercase text-[10px] font-bold text-slate-500">
                          {act.intensity}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-slate-700">
                          {act.durationMinutes} mins
                        </td>
                        <td className="py-3.5 px-3 font-mono text-slate-700">
                          {act.caloriesBurned || 0} kcal
                        </td>
                        <td className="py-3.5 px-3 font-mono text-slate-900 font-semibold">
                          {act.startGlucose} mg/dL
                        </td>
                        <td className="py-3.5 px-3 font-bold font-mono text-indigo-700">
                          {act.estimatedDrawdownMgDl || 0} mg/dL
                        </td>
                        <td className="py-3.5 px-3 font-mono text-slate-800">
                          ~{act.projectedPostGlucose || act.startGlucose} mg/dL
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isHypo
                                ? 'bg-rose-50 text-rose-800 border-rose-200'
                                : isHyper
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isHypo ? 'bg-rose-500' : isHyper ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                            />
                            {isHypo ? 'Hypo Lock' : isHyper ? 'Caution' : 'Safe'}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                          {formattedTime}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
