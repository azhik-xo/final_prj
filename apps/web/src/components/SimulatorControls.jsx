'use client';

import React from 'react';
import { Play, Pause, Square, Zap, RotateCcw, AlertTriangle, Utensils, Activity, HeartPulse } from 'lucide-react';

export default function SimulatorControls({
  personas = [],
  selectedPersonaId,
  onSelectPersona,
  status = {},
  onStart,
  onPause,
  onResume,
  onStop,
  onInjectEvent,
  speedMs,
  onChangeSpeed,
  isLoading
}) {
  const isRunning = status.isRunning;
  const isPaused = status.isPaused;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Virtual CGM Simulator Control Center
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a virtual clinical persona, control simulation stream, and inject dynamic glycemic events.
          </p>
        </div>

        {/* Speed toggle pills */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Tick Interval:</span>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            {[
              { label: '1s (Fast)', val: 1000 },
              { label: '3s (Default)', val: 3000 },
              { label: '5s (Slow)', val: 5000 }
            ].map((spd) => (
              <button
                key={spd.val}
                type="button"
                onClick={() => onChangeSpeed && onChangeSpeed(spd.val)}
                className={`px-2.5 py-1 rounded-md font-medium text-xs transition-colors ${
                  speedMs === spd.val
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {spd.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* 1. Persona Selector Dropdown */}
        <div className="md:col-span-5 flex flex-col gap-1.5">
          <label htmlFor="persona-select" className="text-xs font-semibold text-slate-700">
            Clinical Patient Persona
          </label>
          <select
            id="persona-select"
            value={selectedPersonaId}
            disabled={isRunning && !isPaused}
            onChange={(e) => onSelectPersona(e.target.value)}
            className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id}: {p.name} (Baseline: {p.baseline} mg/dL)
              </option>
            ))}
          </select>
        </div>

        {/* 2. Simulation State Controls */}
        <div className="md:col-span-7 flex flex-wrap items-center gap-2 pt-2 md:pt-5">
          {!isRunning ? (
            <button
              type="button"
              onClick={onStart}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm hover:shadow transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Simulation
            </button>
          ) : isPaused ? (
            <button
              type="button"
              onClick={onResume}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm hover:shadow transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Resume
            </button>
          ) : (
            <button
              type="button"
              onClick={onPause}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm hover:shadow transition-all disabled:opacity-50"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              Pause
            </button>
          )}

          <button
            type="button"
            onClick={onStop}
            disabled={!isRunning || isLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-300 hover:border-red-300 font-semibold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Stop Engine
          </button>
        </div>
      </div>

      {/* 3. Dynamic Manual Event Injection Section */}
      <div className="mt-6 pt-5 border-t border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Inject Dynamic Physiological Events
          </span>
          <span className="text-[11px] text-slate-400">
            {isRunning ? 'Click any event button below to trigger live curve deviation' : 'Engine must be running to inject events'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* Meal Spike */}
          <button
            type="button"
            onClick={() => onInjectEvent('meal_spike', { carbGrams: 65 })}
            disabled={!isRunning || isLoading}
            className="flex items-center gap-2 p-2.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 text-amber-900 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-left"
          >
            <span className="text-base">🍕</span>
            <div>
              <div>Meal Spike</div>
              <div className="text-[10px] font-normal text-amber-700">+60-80 mg/dL</div>
            </div>
          </button>

          {/* Hypo Drop */}
          <button
            type="button"
            onClick={() => onInjectEvent('hypo_drop', { dropRate: 3.0, targetNadir: 52 })}
            disabled={!isRunning || isLoading}
            className="flex items-center gap-2 p-2.5 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100/80 text-red-900 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-left"
          >
            <span className="text-base">📉</span>
            <div>
              <div>Hypo Drop</div>
              <div className="text-[10px] font-normal text-red-700">&lt; -2.5 mg/dL/min</div>
            </div>
          </button>

          {/* Workout Exercise */}
          <button
            type="button"
            onClick={() => onInjectEvent('exercise', { drawdownRate: 1.5, floorGlucose: 75 })}
            disabled={!isRunning || isLoading}
            className="flex items-center gap-2 p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 text-blue-900 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-left"
          >
            <span className="text-base">🏃</span>
            <div>
              <div>Workout</div>
              <div className="text-[10px] font-normal text-blue-700">-1.5 mg/dL/min</div>
            </div>
          </button>

          {/* Rescue Carbs */}
          <button
            type="button"
            onClick={() => onInjectEvent('rescue_carbs', { targetRecovery: 110 })}
            disabled={!isRunning || isLoading}
            className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-900 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-left"
          >
            <span className="text-base">🍭</span>
            <div>
              <div>Rescue Carbs</div>
              <div className="text-[10px] font-normal text-emerald-700">Fast Recovery</div>
            </div>
          </button>

          {/* Reset Baseline */}
          <button
            type="button"
            onClick={() => onInjectEvent('reset')}
            disabled={!isRunning || isLoading}
            className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-left"
          >
            <RotateCcw className="w-4 h-4 text-slate-600" />
            <div>
              <div>Reset Normal</div>
              <div className="text-[10px] font-normal text-slate-600">Homeostasis</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

