'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Utensils,
  Apple,
  Sparkles,
  Plus,
  Clock,
  Flame,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  TrendingUp,
  Activity,
  Info,
  Wheat,
  Beef,
  Droplet,
  Layers,
  RefreshCw,
  AlertCircle,
  Zap,
  Sliders,
  Calendar
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Standard diabetic reference presets (ADR-009 / M5)
const DEFAULT_PRESETS = [
  {
    id: 'oatmeal_almonds',
    name: 'Steel-Cut Oatmeal with Almonds',
    category: 'breakfast',
    mealType: 'breakfast',
    carbs: 32,
    protein: 8,
    fat: 7,
    fiber: 6,
    glycemicIndex: 42,
    calories: 220,
    giCategory: 'low',
    description: 'Slow-digesting beta-glucan soluble oats with healthy monounsaturated fats.'
  },
  {
    id: 'brown_rice_bowl',
    name: 'Brown Rice Veggie Bowl with Tofu',
    category: 'lunch',
    mealType: 'lunch',
    carbs: 45,
    protein: 14,
    fat: 6,
    fiber: 7,
    glycemicIndex: 50,
    calories: 290,
    giCategory: 'low',
    description: 'Whole grain brown rice with steamed greens and fiber-rich plant protein.'
  },
  {
    id: 'grilled_chicken_salad',
    name: 'Mediterranean Grilled Chicken Salad',
    category: 'dinner',
    mealType: 'dinner',
    carbs: 8,
    protein: 28,
    fat: 9,
    fiber: 4,
    glycemicIndex: 20,
    calories: 230,
    giCategory: 'low',
    description: 'Lean poultry breast tossed with extra virgin olive oil, avocado and leafy greens.'
  },
  {
    id: 'dosa_sambar',
    name: 'Traditional Dosa with Veggie Sambar',
    category: 'breakfast',
    mealType: 'breakfast',
    carbs: 52,
    protein: 9,
    fat: 8,
    fiber: 5,
    glycemicIndex: 62,
    calories: 320,
    giCategory: 'medium',
    description: 'Fermented lentil-rice crepe paired with fiber-rich vegetable and dal broth.'
  },
  {
    id: 'white_bread_jam',
    name: 'White Toast with Fruit Jam',
    category: 'breakfast',
    mealType: 'breakfast',
    carbs: 50,
    protein: 4,
    fat: 4,
    fiber: 1,
    glycemicIndex: 78,
    calories: 250,
    giCategory: 'high',
    description: 'Fast-acting refined carbohydrates with rapid systemic glucose absorption.'
  },
  {
    id: 'sweet_soda',
    name: 'Regular Carbonated Soda (330ml)',
    category: 'snack',
    mealType: 'snack',
    carbs: 39,
    protein: 0,
    fat: 0,
    fiber: 0,
    glycemicIndex: 85,
    calories: 150,
    giCategory: 'high',
    description: 'High fructose syrup without protein or fiber; causes steep glycemic shock.'
  }
];

const DEFAULT_SWAPS = [
  {
    originalFood: 'Polished White Rice',
    originalGi: 73,
    recommendedSwap: 'Brown Basmati Rice, Quinoa, or Cauliflower Rice',
    recommendedGi: 45,
    glycemicBenefit: 'Reduces peak post-meal spike by ~28 mg/dL',
    fiberIncreaseGrams: 5.0,
    reason: 'Higher insoluble fiber wraps starches in a protective matrix, attenuating rapid breakdown.'
  },
  {
    originalFood: 'White Bread / Bagels',
    originalGi: 78,
    recommendedSwap: '100% Sprouted Whole Grain Bread or Sourdough',
    recommendedGi: 48,
    glycemicBenefit: 'Reduces peak spike by ~22 mg/dL',
    fiberIncreaseGrams: 4.5,
    reason: 'Slow fermentation and whole grains significantly lower the insulinogenic demand.'
  },
  {
    originalFood: 'Regular Sugary Soda',
    originalGi: 85,
    recommendedSwap: 'Lemon-Mint Sparkling Water or Iced Green Tea',
    recommendedGi: 0,
    glycemicBenefit: 'Prevents steep +45-60 mg/dL rapid spike',
    fiberIncreaseGrams: 0.0,
    reason: 'Zero liquid sugars eliminates immediate hyperosmolar duodenal glucose dumping.'
  },
  {
    originalFood: 'Instant Sweetened Oatmeal',
    originalGi: 79,
    recommendedSwap: 'Steel-Cut Oats with Chia Seeds & Crushed Walnuts',
    recommendedGi: 42,
    glycemicBenefit: 'Flattens glucose curve over 2.5 hours',
    fiberIncreaseGrams: 6.0,
    reason: 'Soluble beta-glucans form a viscous gel in the digestive tract, pacing glucose delivery.'
  }
];

// Local deterministic physiological excursion calculator (0ms latency client-side preview)
function calculateLocalExcursion(carbs, protein, fat, fiber, gi, currentGlucose = 110) {
  const c = Math.max(0, Number(carbs) || 0);
  const p = Math.max(0, Number(protein) || 0);
  const f = Math.max(0, Number(fat) || 0);
  const fib = Math.max(0, Number(fiber) || 0);
  const gIndex = Math.max(10, Math.min(100, Number(gi) || 55));
  const baseG = Math.max(40, Math.min(400, Number(currentGlucose) || 110));

  const netCarbs = Math.max(0, c - fib);
  const giFactor = 0.5 + (gIndex / 100) * 1.3;
  const buffering = Math.min(22.0, (f * 0.28) + (p * 0.16));
  const fiberBlunting = fib * 0.75;
  const rawSpike = netCarbs <= 0.5 ? 0 : (netCarbs * giFactor) - fiberBlunting - (buffering * 0.35);
  const estimatedSpike = Math.max(0, Math.min(150, Math.round(rawSpike * 10) / 10));

  const basePeakTime = gIndex < 55 ? 65 : gIndex < 70 ? 50 : 35;
  const timeDelay = Math.min(20, (f * 0.4) + (p * 0.2));
  const timeToPeak = Math.round(Math.max(30, Math.min(80, basePeakTime + timeDelay)));

  const projectedPeak = Math.min(400, Math.round((baseG + estimatedSpike) * 10) / 10);

  const trajectory = [];
  for (let min = 0; min <= 120; min += 10) {
    let rise;
    if (min <= timeToPeak) {
      rise = estimatedSpike * Math.sin((Math.PI / 2) * (min / Math.max(1, timeToPeak)));
    } else {
      rise = estimatedSpike * Math.exp(-(min - timeToPeak) / 45.0);
    }
    trajectory.push({
      minute: min,
      projectedGlucose: Math.max(40, Math.min(400, Math.round((baseG + rise) * 10) / 10)),
      delta: Math.round(rise * 10) / 10
    });
  }

  const giCategory = gIndex < 55 ? 'low' : gIndex < 70 ? 'medium' : 'high';
  const riskLevel = estimatedSpike <= 30 ? 'safe' : estimatedSpike <= 65 ? 'moderate' : 'high_spike';
  const riskLabel = riskLevel === 'safe'
    ? 'Minimal Glycemic Excursion'
    : riskLevel === 'moderate'
    ? 'Moderate Glycemic Excursion'
    : 'Significant Glucose Spike Anticipated';

  return {
    netCarbs: Math.round(netCarbs * 10) / 10,
    estimatedSpikeMgDl: estimatedSpike,
    timeToPeakMinutes: timeToPeak,
    currentGlucose: baseG,
    projectedPeakGlucose: projectedPeak,
    giCategory,
    riskLevel,
    riskLabel,
    trajectory
  };
}

export default function DietPlannerPage() {
  // Meal Form State
  const [mealName, setMealName] = useState('Steel-Cut Oatmeal with Almonds');
  const [mealType, setMealType] = useState('breakfast');
  const [carbs, setCarbs] = useState(32);
  const [protein, setProtein] = useState(8);
  const [fat, setFat] = useState(7);
  const [fiber, setFiber] = useState(6);
  const [glycemicIndex, setGlycemicIndex] = useState(42);
  const [calories, setCalories] = useState(220);
  const [injectSimulation, setInjectSimulation] = useState(true);

  // Data Collections
  const [loggedMeals, setLoggedMeals] = useState([]);
  const [foodPresets, setFoodPresets] = useState(DEFAULT_PRESETS);
  const [swaps, setSwaps] = useState(DEFAULT_SWAPS);
  const [guidelines, setGuidelines] = useState([
    'Prioritize non-starchy vegetables (leafy greens, peppers, broccoli) on half your plate.',
    'Combine complex carbohydrates with quality protein and healthy fats to slow systemic absorption.',
    'Substitute refined white starches with sprouted whole grains, legumes, or cauliflower alternatives.',
    'Maintain consistent hydration with water rather than sweetened or caloric beverages.'
  ]);

  // UI Feedback & States
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [selectedPresetId, setSelectedPresetId] = useState('oatmeal_almonds');

  // Real-Time Local AI Excursion Prediction
  const localPrediction = useMemo(() => {
    return calculateLocalExcursion(carbs, protein, fat, fiber, glycemicIndex, 110);
  }, [carbs, protein, fat, fiber, glycemicIndex]);

  // Fetch initial meals, reference foods, and recommendations
  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch Logged Meals
      const mealsRes = await fetch(`${API_BASE}/api/v1/diet/meals?userId=usr_patient_03`);
      if (mealsRes.ok) {
        const mealsJson = await mealsRes.json();
        if (mealsJson.data && Array.isArray(mealsJson.data)) {
          setLoggedMeals(mealsJson.data);
        }
      }
    } catch {
      // Retain existing state if offline
    }

    try {
      // 2. Fetch Reference Foods
      const foodsRes = await fetch(`${API_BASE}/api/v1/diet/foods`);
      if (foodsRes.ok) {
        const foodsJson = await foodsRes.json();
        if (foodsJson.data && Array.isArray(foodsJson.data) && foodsJson.data.length > 0) {
          setFoodPresets(foodsJson.data);
        }
      }
    } catch {
      // Retain defaults
    }

    try {
      // 3. Fetch Swaps & Guidelines
      const swapsRes = await fetch(`${API_BASE}/api/v1/diet/recommendations`);
      if (swapsRes.ok) {
        const swapsJson = await swapsRes.json();
        if (swapsJson.data) {
          if (Array.isArray(swapsJson.data.swaps) && swapsJson.data.swaps.length > 0) {
            setSwaps(swapsJson.data.swaps);
          }
          const guideList = swapsJson.data.guidelines || swapsJson.data.generalGuidelines;
          if (Array.isArray(guideList) && guideList.length > 0) {
            setGuidelines(guideList);
          }
        }
      }
    } catch {
      // Retain defaults
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Apply a 1-click preset meal
  const handleSelectPreset = (preset) => {
    setSelectedPresetId(preset.id || null);
    setMealName(preset.name);
    setMealType(preset.mealType || preset.category || 'lunch');
    setCarbs(preset.carbs);
    setProtein(preset.protein || 0);
    setFat(preset.fat || 0);
    setFiber(preset.fiber || 0);
    setGlycemicIndex(preset.glycemicIndex || 50);
    setCalories(preset.calories || 0);
    setStatusMessage({
      type: 'info',
      text: `Loaded preset: ${preset.name}. Review predicted glycemic spike below.`
    });
  };

  // Submit and log meal to API
  const handleLogMeal = async (e) => {
    e.preventDefault();
    if (!mealName.trim()) {
      setStatusMessage({ type: 'error', text: 'Meal description is required.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    const payload = {
      userId: 'usr_patient_03',
      name: mealName.trim(),
      mealType,
      carbs: Number(carbs),
      protein: Number(protein),
      fat: Number(fat),
      fiber: Number(fiber),
      glycemicIndex: Number(glycemicIndex),
      calories: Number(calories),
      injectSimulationEvent: injectSimulation
    };

    try {
      const response = await fetch(`${API_BASE}/api/v1/diet/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const savedMeal = result.data?.meal || {
          ...payload,
          _id: 'local_' + Date.now(),
          estimatedSpikeMgDl: localPrediction.estimatedSpikeMgDl,
          timeToPeakMinutes: localPrediction.timeToPeakMinutes,
          riskLevel: localPrediction.riskLevel,
          timestamp: new Date().toISOString()
        };

        setLoggedMeals((prev) => [savedMeal, ...prev]);
        setStatusMessage({
          type: 'success',
          text: `Meal "${mealName}" successfully logged. Predicted spike: +${localPrediction.estimatedSpikeMgDl} mg/dL in ~${localPrediction.timeToPeakMinutes} min.${
            injectSimulation ? ' Injected meal event into Virtual CGM stream.' : ''
          }`
        });
      } else {
        // Fallback save in local state if API is offline
        const localMeal = {
          ...payload,
          _id: 'local_' + Date.now(),
          estimatedSpikeMgDl: localPrediction.estimatedSpikeMgDl,
          timeToPeakMinutes: localPrediction.timeToPeakMinutes,
          riskLevel: localPrediction.riskLevel,
          timestamp: new Date().toISOString()
        };
        setLoggedMeals((prev) => [localMeal, ...prev]);
        setStatusMessage({
          type: 'success',
          text: `Meal logged locally (offline mode). Predicted spike: +${localPrediction.estimatedSpikeMgDl} mg/dL.`
        });
      }
    } catch {
      // Network failure fallback
      const fallbackMeal = {
        ...payload,
        _id: 'local_' + Date.now(),
        estimatedSpikeMgDl: localPrediction.estimatedSpikeMgDl,
        timeToPeakMinutes: localPrediction.timeToPeakMinutes,
        riskLevel: localPrediction.riskLevel,
        timestamp: new Date().toISOString()
      };
      setLoggedMeals((prev) => [fallbackMeal, ...prev]);
      setStatusMessage({
        type: 'success',
        text: `Meal logged in local session. Predicted excursion: +${localPrediction.estimatedSpikeMgDl} mg/dL.`
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Color mappings for clinical risk levels
  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'safe':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Low / Safe Impact'
        };
      case 'moderate':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          label: 'Moderate Spike'
        };
      case 'high_spike':
      default:
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-rose-500',
          label: 'High Glycemic Spike'
        };
    }
  };

  const currentRisk = getRiskBadge(localPrediction.riskLevel);

  // Compute macro percentage ratios for visual bars
  const totalMacros = (Number(carbs) || 0) + (Number(protein) || 0) + (Number(fat) || 0);
  const carbPercent = totalMacros > 0 ? Math.round(((Number(carbs) || 0) / totalMacros) * 100) : 0;
  const proteinPercent = totalMacros > 0 ? Math.round(((Number(protein) || 0) / totalMacros) * 100) : 0;
  const fatPercent = totalMacros > 0 ? Math.round(((Number(fat) || 0) / totalMacros) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Breadcrumb & Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <Utensils className="w-3 h-3" />
                Module M5
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                <Sparkles className="w-3 h-3" />
                AI Glycemic Forecaster
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                source: simulation
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              AI Diet Planner & Nutritional Telemetry
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Model meal macronutrient composition, predict post-prandial glycemic excursions before ingestion,
              and discover evidence-based low-GI nutritional substitutions.
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
              href="/simulation"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              Simulation Lab
            </Link>
          </div>
        </div>

        {/* Mandatory Clinical Simulation Disclaimer per ADR-007 and ADR-009 */}
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong className="font-semibold block text-amber-950 mb-0.5">
              Non-Clinical Medical Simulation Boundary (ADR-007 / ADR-009)
            </strong>
            GlucoGuard is a software-based educational simulation prototype. This AI Diet Planner predicts estimated
            glycemic responses using deterministic physiological kinetic models. It does <strong>NOT</strong> calculate,
            prescribe, or titrate insulin doses, insulin-to-carbohydrate ratios (ICR), or pharmaceutical regimens. Always
            consult a qualified endocrinologist or certified diabetes care and education specialist (CDCES) for medical management.
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

        {/* Section 1: 1-Click Quick Meal Presets */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Utensils className="w-4 h-4 text-emerald-600" />
                1-Click Reference Meal Presets
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select a standardized diabetic-plate meal to test glycemic excursion kinetics instantly.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {foodPresets.length} presets available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {foodPresets.map((preset) => {
              const isSelected = selectedPresetId === preset.id;
              const giBadgeColor =
                preset.glycemicIndex < 55
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : preset.glycemicIndex < 70
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-rose-100 text-rose-800 border-rose-200';

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-slate-900 line-clamp-1">
                        {preset.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 border ${giBadgeColor}`}
                      >
                        GI {preset.glycemicIndex}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mb-3">
                      {preset.description || `${preset.category} item with standardized diabetic metrics.`}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-800">
                      {preset.carbs}g <span className="text-slate-400 font-normal">Carbs</span>
                    </span>
                    <span>
                      {preset.protein}g <span className="text-slate-400">P</span>
                    </span>
                    <span>
                      {preset.fat}g <span className="text-slate-400">F</span>
                    </span>
                    <span>
                      {preset.fiber}g <span className="text-slate-400">Fiber</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 2: Interactive Meal Logger & Real-Time AI Excursion Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Custom Meal Entry Form (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  Custom Macronutrient Logger
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Input custom nutritional parameters to simulate kinetic glucose excursions in real time.
                </p>
              </div>
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                Live Kinetic Feed
              </span>
            </div>

            <form onSubmit={handleLogMeal} className="space-y-5">
              {/* Meal Name & Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Meal Description / Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                    placeholder="e.g. Quinoa Salad with Roasted Chickpeas"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Meal Category
                  </label>
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 bg-white"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>
              </div>

              {/* Carbohydrates & Dietary Fiber */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Wheat className="w-3.5 h-3.5 text-amber-600" />
                      Total Carbohydrates
                    </label>
                    <span className="text-xs font-bold text-slate-900 font-mono">{carbs} g</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    step="1"
                    value={carbs}
                    onChange={(e) => setCarbs(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>0g (Zero Carb)</span>
                    <span>75g (Moderate)</span>
                    <span>150g (High)</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-600" />
                      Dietary Fiber (Blunts Spike)
                    </label>
                    <span className="text-xs font-bold text-emerald-700 font-mono">{fiber} g</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={fiber}
                    onChange={(e) => setFiber(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>0g</span>
                    <span>Net Carbs: {localPrediction.netCarbs}g</span>
                    <span>30g</span>
                  </div>
                </div>
              </div>

              {/* Protein & Fat (Gastric Delay Factors) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Beef className="w-3.5 h-3.5 text-indigo-600" />
                      Protein
                    </label>
                    <span className="text-xs font-bold text-indigo-700 font-mono">{protein} g</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="1"
                    value={protein}
                    onChange={(e) => setProtein(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <p className="text-[10px] text-slate-400">
                    Lean protein delays stomach emptying by +10–15 mins.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Droplet className="w-3.5 h-3.5 text-rose-500" />
                      Healthy Dietary Fat
                    </label>
                    <span className="text-xs font-bold text-rose-700 font-mono">{fat} g</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="1"
                    value={fat}
                    onChange={(e) => setFat(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    Fats buffer the rate of duodenal carbohydrate absorption.
                  </p>
                </div>
              </div>

              {/* Glycemic Index Slider & Calories */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700">
                      Glycemic Index (GI: 10 - 100)
                    </label>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        glycemicIndex < 55
                          ? 'bg-emerald-100 text-emerald-800'
                          : glycemicIndex < 70
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      GI {glycemicIndex} ({localPrediction.giCategory})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={glycemicIndex}
                    onChange={(e) => setGlycemicIndex(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-800"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Low (&lt;55)</span>
                    <span>Med (55-69)</span>
                    <span>High (70+)</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    Estimated Energy (Calories)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="2000"
                    value={calories}
                    onChange={(e) => setCalories(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900"
                  />
                </div>
              </div>

              {/* Simulation Bridge Checkbox */}
              <div className="pt-2">
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={injectSimulation}
                    onChange={(e) => setInjectSimulation(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span>
                    Bridge with Virtual CGM Engine: trigger <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] text-slate-800">meal_spike</code> event on live simulation stream
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Computing & Persisting...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Log Meal & Calculate Excursion
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Real-Time AI Glycemic Excursion Gauge & Trajectory (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Primary Prediction Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Predicted Glycemic Excursion
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${currentRisk.bg}`}
                >
                  <span className={`w-2 h-2 rounded-full ${currentRisk.dot}`} />
                  {currentRisk.label}
                </span>
              </div>

              {/* Primary Spike Readout */}
              <div className="py-6 flex flex-col items-center justify-center text-center">
                <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
                  Estimated Peak Delta
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 font-mono">
                    +{localPrediction.estimatedSpikeMgDl}
                  </span>
                  <span className="text-sm font-bold text-slate-500">mg/dL</span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs font-medium text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Peak expected in ~<strong className="text-slate-900">{localPrediction.timeToPeakMinutes} minutes</strong>
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  Projected Peak: ~<strong className="text-slate-800">{localPrediction.projectedPeakGlucose} mg/dL</strong> (from baseline {localPrediction.currentGlucose} mg/dL)
                </div>
              </div>

              {/* 2-Hour Projected Curve Mini Graphic */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                  <span className="font-semibold text-slate-800">2-Hour Excursion Projection</span>
                  <span className="text-[10px] text-slate-400">Sinusoidal rise + exponential decay</span>
                </div>

                {/* SVG Projected Kinetic Curve */}
                <div className="w-full h-24 relative flex items-end">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 120 60" preserveAspectRatio="none">
                    {/* Baseline reference line */}
                    <line x1="0" y1="52" x2="120" y2="52" stroke="#cbd5e1" strokeDasharray="3 3" strokeWidth="1" />

                    {/* Gradient Fill under Curve */}
                    <defs>
                      <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Path mapping through trajectory points */}
                    {localPrediction.trajectory.length > 0 && (
                      <>
                        <path
                          d={`M 0 52 ${localPrediction.trajectory
                            .map((p) => {
                              const x = (p.minute / 120) * 120;
                              // Scale delta: max 150 mg/dL mapped to 44px height
                              const y = 52 - (p.delta / 150) * 44;
                              return `L ${x.toFixed(1)} ${y.toFixed(1)}`;
                            })
                            .join(' ')} L 120 52 Z`}
                          fill="url(#curveGradient)"
                        />
                        <path
                          d={`M 0 52 ${localPrediction.trajectory
                            .map((p) => {
                              const x = (p.minute / 120) * 120;
                              const y = 52 - (p.delta / 150) * 44;
                              return `L ${x.toFixed(1)} ${y.toFixed(1)}`;
                            })
                            .join(' ')}`}
                          fill="none"
                          stroke={
                            localPrediction.riskLevel === 'safe'
                              ? '#059669'
                              : localPrediction.riskLevel === 'moderate'
                              ? '#d97706'
                              : '#e11d48'
                          }
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </>
                    )}
                  </svg>
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-mono">
                  <span>0m (Eat)</span>
                  <span>{localPrediction.timeToPeakMinutes}m (Peak)</span>
                  <span>60m</span>
                  <span>120m</span>
                </div>
              </div>

              {/* Macronutrient Distribution Meters */}
              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Macro Composition</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    {totalMacros}g total
                  </span>
                </div>

                {/* Segmented Progress Bar */}
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${carbPercent}%` }}
                    className="bg-amber-500 h-full transition-all duration-300"
                    title={`Carbs: ${carbPercent}%`}
                  />
                  <div
                    style={{ width: `${proteinPercent}%` }}
                    className="bg-indigo-500 h-full transition-all duration-300"
                    title={`Protein: ${proteinPercent}%`}
                  />
                  <div
                    style={{ width: `${fatPercent}%` }}
                    className="bg-rose-400 h-full transition-all duration-300"
                    title={`Fat: ${fatPercent}%`}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                    Carbs: {carbPercent}% ({carbs}g)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                    Protein: {proteinPercent}% ({protein}g)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
                    Fat: {fatPercent}% ({fat}g)
                  </span>
                </div>
              </div>

              {/* Kinetic Action Recommendation Note */}
              <div className="mt-5 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <strong className="font-semibold text-slate-800 block mb-0.5">
                  AI Glycemic Guidance:
                </strong>
                {localPrediction.riskLevel === 'safe'
                  ? 'Excellent diabetic meal profile. Sufficient fiber and protein slow absorption, keeping post-meal readings within optimal target bounds.'
                  : localPrediction.riskLevel === 'moderate'
                  ? 'Noticeable glycemic spike anticipated. Consider pairing with additional leafy greens (soluble fiber) or an extra glass of water to blunt the curve.'
                  : 'High systemic glucose spike expected. Explore replacing refined ingredients with one of the recommended low-GI substitutions below.'}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Smart Diabetic Nutritional Swaps (Module M5 Feature) */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Apple className="w-4 h-4 text-emerald-600" />
                Intelligent Low-GI Food Substitutions
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Evidence-based dietary swaps engineered to lower glycemic index and prevent acute glucose volatility.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              Spike Reduction Matrix
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {swaps.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="line-through text-slate-500">{item.originalFood}</span>
                      <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-mono">
                        GI {item.originalGi}
                      </span>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{item.recommendedSwap}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono">
                        GI {item.recommendedGi}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {item.reason}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {item.glycemicBenefit}
                  </span>
                  {item.fiberIncreaseGrams > 0 && (
                    <span className="text-slate-500">
                      +{item.fiberIncreaseGrams}g soluble fiber
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* General Diabetic Plate Guidelines */}
          <div className="mt-6 p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
            <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 mb-2">
              <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
              Diabetic Healthy Plate Guidelines (Educational Simulation Model)
            </h4>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-900">
              {guidelines.map((rule, rIdx) => (
                <li key={rIdx} className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Section 4: Logged Meal History */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Patient Meal History & Impact Log
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chronological log of simulated nutritional records and calculated post-prandial excursions.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {loggedMeals.length} recorded meals
            </span>
          </div>

          {loggedMeals.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
              <Utensils className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No Meals Logged Yet</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Select a preset meal above or enter custom macronutrients to log your first simulated meal.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3">Meal Name</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Carbs / Fiber</th>
                    <th className="py-3 px-3">Protein / Fat</th>
                    <th className="py-3 px-3">GI Score</th>
                    <th className="py-3 px-3">Predicted Spike</th>
                    <th className="py-3 px-3">Risk Level</th>
                    <th className="py-3 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loggedMeals.map((meal, index) => {
                    const badge = getRiskBadge(meal.riskLevel || 'safe');
                    const formattedTime = meal.timestamp
                      ? new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Just now';

                    return (
                      <tr key={meal._id || index} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-3 font-semibold text-slate-900">
                          {meal.name}
                        </td>
                        <td className="py-3.5 px-3 uppercase text-[10px] font-bold text-slate-500">
                          {meal.mealType}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-slate-700">
                          {meal.carbs}g <span className="text-slate-400 text-[10px]">({meal.fiber || 0}g fib)</span>
                        </td>
                        <td className="py-3.5 px-3 font-mono text-slate-700">
                          {meal.protein || 0}g P / {meal.fat || 0}g F
                        </td>
                        <td className="py-3.5 px-3 font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              (meal.glycemicIndex || 50) < 55
                                ? 'bg-emerald-100 text-emerald-800'
                                : (meal.glycemicIndex || 50) < 70
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            GI {meal.glycemicIndex || 50}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-bold font-mono text-slate-900">
                          +{meal.estimatedSpikeMgDl || 0} mg/dL
                          <span className="block text-[10px] font-normal text-slate-400">
                            in ~{meal.timeToPeakMinutes || 45}m
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badge.bg}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
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
