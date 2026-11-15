'use client';

import React from 'react';
import { Activity, Battery, ShieldAlert, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Returns color classes and clinical status label according to glucose level.
 * @param {number} glucose
 */
function getGlucoseStatus(glucose) {
  if (glucose === null || glucose === undefined) {
    return {
      label: 'Waiting for Telemetry',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
      textClass: 'text-slate-600',
      bgGlow: 'bg-slate-50 border-slate-200'
    };
  }

  if (glucose < 54) {
    return {
      label: 'Severe Hypoglycemia',
      badgeClass: 'bg-red-100 text-red-900 border-red-300 animate-pulse',
      textClass: 'text-red-700',
      bgGlow: 'bg-red-50/70 border-red-300 ring-2 ring-red-500/20'
    };
  }
  if (glucose < 70) {
    return {
      label: 'Hypoglycemia Alert',
      badgeClass: 'bg-orange-100 text-orange-900 border-orange-300',
      textClass: 'text-orange-700',
      bgGlow: 'bg-orange-50/70 border-orange-300'
    };
  }
  if (glucose <= 180) {
    return {
      label: 'In Target Range (70–180)',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      textClass: 'text-emerald-700',
      bgGlow: 'bg-emerald-50/50 border-emerald-200'
    };
  }
  if (glucose <= 250) {
    return {
      label: 'Hyperglycemia Alert',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
      textClass: 'text-amber-700',
      bgGlow: 'bg-amber-50/70 border-amber-300'
    };
  }
  return {
    label: 'Critical Hyperglycemia',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 animate-pulse',
    textClass: 'text-rose-700',
    bgGlow: 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20'
  };
}

export default function MetricCards({ reading, isConnected, persona }) {
  const glucose = reading ? reading.glucose : null;
  const status = getGlucoseStatus(glucose);
  const rateOfChange = reading ? Number(reading.rateOfChange || 0) : 0;
  const trendArrow = reading?.trendArrow || '→';
  const batteryLevel = reading?.batteryLevel ?? 100;
  const activeEvent = reading?.activeEvent || null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Primary Big Glucose Metric Card */}
      <div className={`rounded-2xl border p-5 transition-all shadow-sm ${status.bgGlow} col-span-1 md:col-span-2 lg:col-span-1`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Interstitial Glucose
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.badgeClass}`}>
            {status.label}
          </span>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className={`text-5xl font-black tracking-tight font-mono ${status.textClass}`}>
            {glucose !== null ? Math.round(glucose) : '--'}
          </span>
          <span className="text-sm font-semibold text-slate-500">mg/dL</span>
          <span className={`ml-2 text-2xl font-black px-2 py-0.5 rounded bg-white/70 border shadow-xs ${status.textClass}`}>
            {trendArrow}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-200/60">
          <span className="flex items-center gap-1 font-mono">
            {rateOfChange > 0 ? `+${rateOfChange.toFixed(1)}` : rateOfChange.toFixed(1)} mg/dL/min
          </span>
          <span className="font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded text-[10px] border border-emerald-200">
            source: &quot;simulation&quot;
          </span>
        </div>
      </div>

      {/* 2. Patient Profile & Device ID */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Virtual Patient Persona
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {persona?.id || 'VP-01'}
          </span>
        </div>

        <div className="mt-2">
          <h3 className="text-base font-bold text-slate-900 leading-snug">
            {persona?.name || 'Healthy Individual (Non-Diabetic)'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
            {persona?.description || 'Tight glycemic control baseline (80-110 mg/dL).'}
          </p>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>{reading?.deviceId || persona?.deviceId || 'VIRTUAL_CGM_001'}</span>
          <span className="text-slate-400">ID: {reading?.userId || persona?.userId || 'usr_01'}</span>
        </div>
      </div>

      {/* 3. Physiological Trend & Active Events */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Active Event Shock
          </span>
          <Zap className={`w-4 h-4 ${activeEvent ? 'text-amber-500 animate-bounce' : 'text-slate-300'}`} />
        </div>

        <div className="mt-2">
          {activeEvent ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 font-semibold text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>{activeEvent.toUpperCase().replace('_', ' ')} IN PROGRESS</span>
            </div>
          ) : (
            <span className="text-xs text-slate-500 font-medium italic">
              Homeostatic Baseline (No Active Event)
            </span>
          )}
          <div className="mt-2 text-xs text-slate-600">
            Target Range: <span className="font-semibold text-emerald-700">70 – 180 mg/dL</span>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Trend Direction</span>
          <span className="font-semibold capitalize text-slate-800">
            {reading?.trend ? reading.trend.replace('_', ' ') : 'Stable'}
          </span>
        </div>
      </div>

      {/* 4. Telemetry Telemetry Gateway & Battery */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Telemetry Gateway
          </span>
          <span className="flex items-center gap-1 text-xs">
            <Battery className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono text-slate-700 font-bold">{batteryLevel}%</span>
          </span>
        </div>

        <div className="mt-2">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm font-bold text-slate-900">
              {isConnected ? 'Socket.IO Live' : 'Disconnected'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isConnected ? 'WebSocket stream active @ port 5000' : 'Attempting to reconnect gateway...'}
          </p>
        </div>

        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Last Tick</span>
          <span className="font-mono text-[11px] text-slate-600">
            {reading?.timestamp ? new Date(reading.timestamp).toLocaleTimeString() : 'Standby'}
          </span>
        </div>
      </div>
    </div>
  );
}

