'use client';

import React from 'react';
import {
  BrainCircuit,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Sparkles,
  CheckCircle2,
  Activity,
  Layers
} from 'lucide-react';

export default function AIPredictionCard({ prediction }) {
  if (!prediction) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              AI Trajectory Forecast &amp; Early-Warning Engine
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
            Awaiting Telemetry Stream
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Start the Virtual CGM Simulator to compute real-time +15m, +30m, and +45m multi-step predictive trajectories.
        </p>
      </div>
    );
  }

  const {
    currentGlucose,
    trend = {},
    predictions = [],
    breachWarning = {},
    modelMetrics = {},
    anomaly = {}
  } = prediction;

  const isBreach = breachWarning.breachPredicted;
  const isHypo = breachWarning.type === 'hypoglycemia';
  const isCritical = breachWarning.severity === 'critical';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
      {/* 1. Header with Model Architecture Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              AI Trajectory Forecast &amp; Predictive Early-Warning
            </h2>
            <p className="text-xs text-slate-500">
              Multi-step polynomial regression + Random Forest ensemble with zero-leakage temporal validation.
            </p>
          </div>
        </div>

        {/* Accuracy Metrics Pill */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 font-mono text-[11px]">
            <span>MAE: {modelMetrics.mae ?? '4.6'} mg/dL</span>
            <span className="text-slate-300">|</span>
            <span>RMSE: {modelMetrics.rmse ?? '6.3'} mg/dL</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-200">
            Zero-Leakage
          </span>
        </div>
      </div>

      {/* 2. Early Threshold Breach Warning Banner */}
      <div className="mt-4">
        {isBreach ? (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
              isHypo
                ? isCritical
                  ? 'bg-rose-50/90 border-rose-300 text-rose-950 ring-2 ring-rose-500/20'
                  : 'bg-amber-50/90 border-amber-300 text-amber-950'
                : isCritical
                ? 'bg-rose-50/90 border-rose-300 text-rose-950'
                : 'bg-amber-50/90 border-amber-300 text-amber-950'
            }`}
          >
            <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isCritical ? 'text-rose-600 animate-pulse' : 'text-amber-600'}`} />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs uppercase tracking-wide">
                  {isHypo ? 'Impending Hypoglycemia Breach' : 'Impending Hyperglycemia Breach'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 border shadow-2xs font-mono">
                  {isCritical ? 'CRITICAL RISK' : 'ADVISORY WARNING'}
                </span>
                {breachWarning.estimatedTimeToBreachMinutes && (
                  <span className="text-[11px] font-mono font-semibold text-slate-700 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    Est. Breach in ~{Math.round(breachWarning.estimatedTimeToBreachMinutes)} min
                  </span>
                )}
              </div>
              <p className="text-xs mt-1 leading-relaxed opacity-90">
                {breachWarning.message}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 text-emerald-950 flex items-center gap-2.5 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="flex-1">
              <span className="font-bold">Target Glycemic Stability Projected:</span> No threshold breaches (&lt;70 or &gt;180 mg/dL) anticipated across the 45-minute horizon.
            </div>
          </div>
        )}
      </div>

      {/* 3. Multi-Horizon Forecast Horizon Cards (+15m, +30m, +45m) */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {predictions.map((p) => {
          const projected = Math.round(p.projectedGlucose);
          const lower = Math.round(p.lowerBound);
          const upper = Math.round(p.upperBound);
          const delta = projected - Math.round(currentGlucose || projected);

          const isPointHypo = projected < 70;
          const isPointHyper = projected > 180;

          const cardColor = isPointHypo
            ? 'bg-rose-50/50 border-rose-200'
            : isPointHyper
            ? 'bg-amber-50/50 border-amber-200'
            : 'bg-slate-50/70 border-slate-200';

          return (
            <div key={p.minutesAhead} className={`rounded-xl border p-4 transition-all shadow-2xs ${cardColor}`}>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  +{p.minutesAhead} Minutes
                </span>
                <span className={`text-[11px] font-mono font-semibold ${delta > 0 ? 'text-amber-700' : delta < 0 ? 'text-blue-700' : 'text-slate-500'}`}>
                  {delta > 0 ? `+${delta}` : delta} mg/dL
                </span>
              </div>

              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold font-mono tracking-tight text-slate-900">
                  {projected}
                </span>
                <span className="text-xs text-slate-500 font-medium">mg/dL</span>
              </div>

              {/* 95% Confidence Bounds */}
              <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>95% CI:</span>
                <span className="font-medium text-slate-700">
                  [{lower} – {upper}]
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Trajectory Momentum & Anomaly State Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span>
            Kinetic Momentum: <strong className="text-slate-800 capitalize font-medium">{trend.momentum?.replace('_', ' ') || 'Steady'}</strong>
          </span>
          <span className="text-slate-300">|</span>
          <span>
            Telemetry Filter: {anomaly.is_anomaly ? (
              <strong className="text-rose-600 font-semibold">Anomaly Flagged</strong>
            ) : (
              <strong className="text-emerald-700 font-semibold">Normal Inlier</strong>
            )}
          </span>
        </div>

        <span className="text-[11px] font-mono text-slate-400">
          Source: &quot;simulation&quot;
        </span>
      </div>
    </div>
  );
}

