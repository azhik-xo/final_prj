'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import Link from 'next/link';
import { 
  Activity, 
  Play, 
  Pause, 
  RotateCcw, 
  Square, 
  Zap, 
  Pizza, 
  TrendingDown, 
  Coffee, 
  HeartPulse, 
  ArrowLeft,
  Wifi,
  WifiOff,
  Code2
} from 'lucide-react';
import GlucoseChart from '../../components/GlucoseChart';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

export default function SimulatorPage() {
  const [personas, setPersonas] = useState([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState('VP-03');
  const [status, setStatus] = useState({ isRunning: false, isPaused: false });
  const [readings, setReadings] = useState([]);
  const [latestReading, setLatestReading] = useState(null);
  const [speedMs, setSpeedMs] = useState(2000);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showJsonPayload, setShowJsonPayload] = useState(false);

  const socketRef = useRef(null);

  const notify = useCallback((msg, type = 'info') => {
    setFeedback({ text: msg, type });
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  // Fetch personas and status
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [pRes, sRes, hRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/simulator/personas`),
          fetch(`${API_BASE}/api/v1/simulator/status`),
          fetch(`${API_BASE}/api/v1/cgm/history?limit=30`)
        ]);

        if (pRes.ok) {
          const pData = await pRes.json();
          if (isMounted && pData.data) setPersonas(pData.data);
        }
        if (sRes.ok) {
          const sData = await sRes.json();
          if (isMounted && sData.data) {
            setStatus(sData.data);
            if (sData.data.personaId) setSelectedPersonaId(sData.data.personaId);
            if (sData.data.latestReading) setLatestReading(sData.data.latestReading);
          }
        }
        if (hRes.ok) {
          const hData = await hRes.json();
          if (isMounted && hData.data) {
            setReadings(hData.data);
            if (hData.data.length > 0) setLatestReading(hData.data[hData.data.length - 1]);
          }
        }
      } catch (err) {
        console.warn('[Simulator Lab] Initialization deferred:', err.message);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, []);

  // Socket.IO Listener
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10
    });
    socketRef.current = socket;

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    socket.on('cgm:reading', (reading) => {
      setLatestReading(reading);
      setReadings((prev) => {
        const updated = [...prev, reading];
        return updated.length > 50 ? updated.slice(updated.length - 50) : updated;
      });
    });

    socket.on('cgm:status', (newStatus) => setStatus(newStatus));
    socket.on('cgm:event', (eventData) => {
      notify(`Injected event: ${eventData.activeEvent || 'none'}`, 'success');
    });

    return () => socket.disconnect();
  }, [notify]);

  // Actions
  const handleStart = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/simulator/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId: selectedPersonaId, intervalMs: speedMs })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(data.data.status || { isRunning: true, isPaused: false });
        if (data.data.firstReading) {
          setLatestReading(data.data.firstReading);
          setReadings((prev) => [...prev, data.data.firstReading]);
        }
        notify(`Virtual CGM started for ${selectedPersonaId}!`, 'success');
      } else {
        notify(data.error || 'Failed to start simulator', 'error');
      }
    } catch (err) {
      notify(`Network error: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/simulator/pause`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setStatus(data.data);
        notify('Simulator paused', 'info');
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleResume = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/simulator/resume`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setStatus(data.data);
        notify('Simulator resumed', 'success');
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleStop = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/simulator/stop`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setStatus(data.data);
        notify('Simulator stopped', 'info');
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleInject = async (eventType) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/simulator/inject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType })
      });
      const data = await res.json();
      if (res.ok) {
        notify(`Triggered: ${eventType.toUpperCase().replace('_', ' ')}`, 'success');
      } else {
        notify(data.error || 'Event injection failed', 'error');
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const selectedPersona = personas.find((p) => p.id === selectedPersonaId);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 w-full flex-1">
      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <Link 
            href="/" 
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Patient Dashboard
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2.5">
            <Activity className="w-7 h-7 text-emerald-600" />
            Virtual CGM Simulator Lab
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            M1 Simulation Engine — Emulates continuous interstitial glucose telemetry, 6 clinical personas, and dynamic metabolic events.
          </p>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-white text-xs font-medium shadow-sm">
            {socketConnected ? (
              <span className="flex items-center gap-1.5 text-emerald-700">
                <Wifi className="w-4 h-4 text-emerald-600" />
                Socket.IO Connected
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-700">
                <WifiOff className="w-4 h-4 text-amber-600" />
                Disconnected
              </span>
            )}
          </div>
          <button
            onClick={() => setShowJsonPayload(!showJsonPayload)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-medium transition-colors"
          >
            <Code2 className="w-4 h-4 text-slate-600" />
            {showJsonPayload ? 'Hide Raw JSON' : 'Inspect Payload'}
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div className={`mb-6 p-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${
          feedback.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
      )}

      {/* Control Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Column 1: Persona Selection */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span>👤</span> 1. Select Clinical Persona
          </h2>
          <select
            value={selectedPersonaId}
            onChange={(e) => setSelectedPersonaId(e.target.value)}
            disabled={status.isRunning}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id}: {p.name} (Fasting: {p.baseline} mg/dL)
              </option>
            ))}
          </select>

          {selectedPersona && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Baseline Target:</span>
                <span className="font-bold text-slate-800">{selectedPersona.baseline} mg/dL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Range:</span>
                <span className="font-semibold text-slate-800">{selectedPersona.targetRange.low} – {selectedPersona.targetRange.high} mg/dL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Glycemic Volatility:</span>
                <span className="font-semibold text-slate-800">{selectedPersona.volatility}x</span>
              </div>
              <p className="pt-2 border-t border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                {selectedPersona.description}
              </p>
            </div>
          )}
        </div>

        {/* Column 2: Engine Controls & Speed */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span>⚙️</span> 2. Engine Lifecycle
            </h2>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {!status.isRunning ? (
                <button
                  onClick={handleStart}
                  disabled={isLoading}
                  className="col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Start Simulation
                </button>
              ) : (
                <>
                  {status.isPaused ? (
                    <button
                      onClick={handleResume}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Resume
                    </button>
                  ) : (
                    <button
                      onClick={handlePause}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      Pause
                    </button>
                  )}
                  <button
                    onClick={handleStop}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    Stop
                  </button>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Tick Interval Speed ({speedMs / 1000}s per reading):
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[1000, 2000, 5000].map((ms) => (
                <button
                  key={ms}
                  onClick={() => setSpeedMs(ms)}
                  className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    speedMs === ms ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {ms / 1000}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3: Event Injections */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span>⚡</span> 3. Dynamic Event Injection
          </h2>
          <p className="text-[11px] text-slate-500 mb-3">
            Inject real-time physiological stimuli to test alarms & curves:
          </p>
          <div className="space-y-2">
            <button
              onClick={() => handleInject('meal_spike')}
              disabled={!status.isRunning}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold transition-all disabled:opacity-40"
            >
              <span className="flex items-center gap-2">
                <Pizza className="w-4 h-4 text-amber-600" />
                Inject Carb Meal Spike
              </span>
              <span className="text-[10px] text-amber-700">+75 mg/dL</span>
            </button>

            <button
              onClick={() => handleInject('hypo_drop')}
              disabled={!status.isRunning}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-900 text-xs font-semibold transition-all disabled:opacity-40"
            >
              <span className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                Inject Hypo Drop (Emergency)
              </span>
              <span className="text-[10px] text-red-700">&lt;55 mg/dL</span>
            </button>

            <button
              onClick={() => handleInject('exercise')}
              disabled={!status.isRunning}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs font-semibold transition-all disabled:opacity-40"
            >
              <span className="flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-blue-600" />
                Inject Intense Exercise
              </span>
              <span className="text-[10px] text-blue-700">-1.5 mg/dL/min</span>
            </button>

            <button
              onClick={() => handleInject('rescue_carbs')}
              disabled={!status.isRunning}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold transition-all disabled:opacity-40"
            >
              <span className="flex items-center gap-2">
                <Coffee className="w-4 h-4 text-emerald-600" />
                Inject Rescue Carbs
              </span>
              <span className="text-[10px] text-emerald-700">Recovery</span>
            </button>
          </div>
        </div>
      </div>

      {/* Raw JSON Payload Inspector (Collapsible) */}
      {showJsonPayload && latestReading && (
        <div className="bg-slate-900 rounded-2xl p-5 mb-8 text-emerald-400 font-mono text-xs shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">
              Live CGM Telemetry Payload ({latestReading.deviceId})
            </span>
            <span className="text-emerald-500 text-[10px] font-semibold">
              Source: {latestReading.source}
            </span>
          </div>
          <pre className="overflow-x-auto text-[11px] leading-relaxed">
            {JSON.stringify(latestReading, null, 2)}
          </pre>
        </div>
      )}

      {/* Live Chart Stream */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Real-Time Telemetry Stream</h2>
            <p className="text-xs text-slate-500">
              Continuous interstitial glucose trajectory with Target Zone (70–180 mg/dL)
            </p>
          </div>
          {latestReading && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">Latest:</span>
              <span className="text-lg font-black text-slate-900">
                {latestReading.glucose} <span className="text-xs font-normal text-slate-500">mg/dL</span>
              </span>
              <span className="text-sm font-bold text-emerald-600">
                {latestReading.trendArrow} ({latestReading.rateOfChange > 0 ? `+${latestReading.rateOfChange}` : latestReading.rateOfChange} mg/dL/min)
              </span>
            </div>
          )}
        </div>
        <GlucoseChart readings={readings} />
      </div>
    </div>
  );
}

