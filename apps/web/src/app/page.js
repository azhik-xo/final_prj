'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import Link from 'next/link';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, ShieldAlert, Activity } from 'lucide-react';
import MetricCards from '../components/MetricCards';
import SimulatorControls from '../components/SimulatorControls';
import GlucoseChart from '../components/GlucoseChart';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

export default function PatientDashboard() {
  const [personas, setPersonas] = useState([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState('VP-03');
  const [status, setStatus] = useState({ isRunning: false, isPaused: false });
  const [readings, setReadings] = useState([]);
  const [latestReading, setLatestReading] = useState(null);
  const [speedMs, setSpeedMs] = useState(2000);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const socketRef = useRef(null);

  // Show transient notification
  const showFeedback = useCallback((msg, type = 'info') => {
    setFeedbackMessage({ text: msg, type });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  }, []);

  // Fetch initial configuration & historical telemetry
  useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      try {
        // 1. Fetch personas
        const pRes = await fetch(`${API_BASE}/api/v1/simulator/personas`);
        if (pRes.ok) {
          const pData = await pRes.json();
          if (isMounted && pData.data && pData.data.length > 0) {
            setPersonas(pData.data);
          }
        }

        // 2. Fetch current status
        const sRes = await fetch(`${API_BASE}/api/v1/simulator/status`);
        if (sRes.ok) {
          const sData = await sRes.json();
          if (isMounted && sData.data) {
            setStatus(sData.data);
            if (sData.data.personaId) {
              setSelectedPersonaId(sData.data.personaId);
            }
            if (sData.data.latestReading) {
              setLatestReading(sData.data.latestReading);
            }
          }
        }

        // 3. Fetch recent history for initial chart hydration
        const hRes = await fetch(`${API_BASE}/api/v1/cgm/history?limit=30`);
        if (hRes.ok) {
          const hData = await hRes.json();
          if (isMounted && hData.data && hData.data.length > 0) {
            setReadings(hData.data);
            setLatestReading(hData.data[hData.data.length - 1]);
          }
        }
      } catch (err) {
        console.warn('[Dashboard] API Gateway connection deferred:', err.message);
      }
    }

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Socket.IO lifecycle connection
  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      console.log('[Socket.IO] Connected to Telemetry Gateway');
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
      console.log('[Socket.IO] Disconnected from Telemetry Gateway');
    });

    // Ingest real-time readings pushed by simulator
    socket.on('cgm:reading', (reading) => {
      setLatestReading(reading);
      setReadings((prev) => {
        const updated = [...prev, reading];
        if (updated.length > 50) {
          return updated.slice(updated.length - 50);
        }
        return updated;
      });
    });

    // Receive status updates (running, paused, stopped)
    socket.on('cgm:status', (newStatus) => {
      setStatus(newStatus);
    });

    // Receive event injection notifications
    socket.on('cgm:event', (eventData) => {
      showFeedback(`Injected event: ${eventData.activeEvent || 'none'}`, 'success');
    });

    return () => {
      socket.disconnect();
    };
  }, [showFeedback]);

  // Handlers for simulator controls
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
        showFeedback(`Simulation started for ${selectedPersonaId}!`, 'success');
      } else {
        showFeedback(data.error || 'Failed to start simulation', 'error');
      }
    } catch (err) {
      showFeedback(`Network error: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/simulator/pause`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setStatus(data.data || { isRunning: true, isPaused: true });
        showFeedback('Simulation paused', 'info');
      }
    } catch (err) {
      showFeedback(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/simulator/resume`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setStatus(data.data || { isRunning: true, isPaused: false });
        showFeedback('Simulation resumed', 'success');
      }
    } catch (err) {
      showFeedback(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/simulator/stop`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setStatus(data.data || { isRunning: false, isPaused: false });
        showFeedback('Simulation stopped', 'info');
      }
    } catch (err) {
      showFeedback(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInjectEvent = async (eventType, params = {}) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/simulator/inject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, params })
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback(`Event "${eventType}" injected successfully!`, 'success');
      } else {
        showFeedback(data.error || 'Failed to inject event', 'error');
      }
    } catch (err) {
      showFeedback(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeSpeed = async (newSpeed) => {
    setSpeedMs(newSpeed);
    try {
      await fetch(`${API_BASE}/api/v1/simulator/speed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalMs: newSpeed })
      });
      showFeedback(`Interval updated to ${newSpeed} ms`, 'info');
    } catch (err) {
      console.warn('Could not update speed:', err.message);
    }
  };

  const activePersona = personas.find((p) => p.id === selectedPersonaId);

  const modules = [
    { id: 'M1', name: 'Virtual CGM Simulator', status: 'Live & Operational', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    { id: 'M2', name: 'Data Pipeline & Sockets', status: 'Live & Connected', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    { id: 'M3', name: 'Real-Time Patient Dashboard', status: 'Interactive Live Mode', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { id: 'M4', name: 'AI Intelligence Engine', status: 'FastAPI Microservice Ready', color: 'bg-amber-50 border-amber-200 text-amber-700' },
    { id: 'M5', name: 'AI Diet Planner', status: 'Nutritional Analysis', color: 'bg-slate-50 border-slate-200 text-slate-700' },
    { id: 'M6', name: 'AI Physical Activity Engine', status: 'Safety Interlocks Ready', color: 'bg-slate-50 border-slate-200 text-slate-700' },
    { id: 'M7', name: 'Emergency Detection Engine', status: 'Emergency Protocol Ready', color: 'bg-rose-50 border-rose-200 text-rose-700' },
    { id: 'M8', name: 'Caregiver & Doctor Portal', status: 'Clinical AGP Ready', color: 'bg-slate-50 border-slate-200 text-slate-700' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1">
      {/* Top Banner / System Status */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              TASK-INT-01 Real-Time E2E Pipeline Active
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Patient Continuous Glucose Monitor
            </h1>
            <p className="mt-1 text-slate-600 text-xs md:text-sm">
              Live AI-Powered Real-Time Telemetry &amp; Dynamic Emergency Simulation Loop.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Socket connection pill */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-xs ${
              socketConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}>
              {socketConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span>Socket.IO Connected (Live Stream)</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                  <span>Socket.IO Reconnecting...</span>
                </>
              )}
            </div>

            {/* In-Memory / DB Status */}
            <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 font-mono">
              MongoDB: <span className="text-emerald-700 font-semibold">Active</span>
            </div>

            {/* Simulation tag */}
            <div className="text-xs text-purple-700 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-200 font-semibold">
              source: simulation
            </div>
          </div>
        </div>

        {/* Transient feedback notification */}
        {feedbackMessage && (
          <div className={`mt-4 px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-between border ${
            feedbackMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}>
            <span>{feedbackMessage.text}</span>
            <button type="button" onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-slate-600 ml-4 font-bold">
              ×
            </button>
          </div>
        )}

        {/* Dedicated Simulator Lab Route Link */}
        <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-slate-800">
            <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Dedicated Virtual CGM Simulator Lab</strong> is available on a separate route at <code className="bg-emerald-100/60 px-1.5 py-0.5 rounded text-emerald-900 font-mono text-[11px]">/simulator</code>. Switch clinical personas, trigger spikes/lows, and inspect raw telemetry.
            </span>
          </div>
          <Link
            href="/simulator"
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors shrink-0 shadow-xs"
          >
            <span>Open Simulator Lab</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>

      {/* 1. Simulator Control Panel & Persona Selector */}
      <SimulatorControls
        personas={personas}
        selectedPersonaId={selectedPersonaId}
        onSelectPersona={setSelectedPersonaId}
        status={status}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onStop={handleStop}
        onInjectEvent={handleInjectEvent}
        speedMs={speedMs}
        onChangeSpeed={handleChangeSpeed}
        isLoading={isLoading}
      />

      {/* 2. Hero Metric Cards Display */}
      <MetricCards
        reading={latestReading}
        readings={readings}
        activePersona={activePersona}
      />

      {/* 3. Interactive Real-Time Recharts Line Graph */}
      <GlucoseChart
        readings={readings}
        maxPoints={50}
      />

      {/* Platform Architecture & Modules Matrix */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          Platform Architecture &amp; Module Matrix
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {modules.map((m) => (
            <div key={m.id} className={`rounded-xl border p-4 flex flex-col justify-between ${m.color}`}>
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider">{m.id}</span>
                <h3 className="font-semibold text-xs mt-0.5">{m.name}</h3>
              </div>
              <div className="mt-3 pt-2 border-t border-current/10 text-[11px] font-medium">
                {m.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Clinical Disclaimer Callout per ADR-007 */}
      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-6 text-amber-900 text-xs leading-relaxed mb-6 shadow-xs">
        <h3 className="font-bold text-sm text-amber-950 mb-1 flex items-center gap-1.5">
          <span>⚠️</span> Non-Clinical Simulation Prototype Notice
        </h3>
        <p>
          GlucoGuard is developed strictly as an educational and engineering simulation prototype. Readings displayed on this interface are synthetic simulation values generated for computational modeling and algorithmic demonstration. This software must not be used to direct medical care, administer insulin or pharmacological therapy, or replace licensed physician oversight.
        </p>
      </div>
    </div>
  );
}
