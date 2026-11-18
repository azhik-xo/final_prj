'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import io from 'socket.io-client';
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  Activity, 
  Radio,
  SlidersHorizontal,
  HeartHandshake,
  X
} from 'lucide-react';
import MetricCards from '../components/MetricCards';
import GlucoseChart from '../components/GlucoseChart';
import AIPredictionCard from '../components/AIPredictionCard';
import SeniorGlucoseView from '../components/SeniorGlucoseView';
import EmergencyAlertModal from '../components/EmergencyAlertModal';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

export default function PatientDashboard() {
  const [personas, setPersonas] = useState([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState('VP-03');
  const [status, setStatus] = useState({ isRunning: false, isPaused: false });
  const [readings, setReadings] = useState([]);
  const [latestReading, setLatestReading] = useState(null);
  const [aiPrediction, setAiPrediction] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [viewMode, setViewMode] = useState('clinical'); // 'clinical' | 'senior'
  const [activeEmergencyAlert, setActiveEmergencyAlert] = useState(null);

  const socketRef = useRef(null);

  // Restore saved view mode preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('glucoguard_view_mode');
      if (savedMode === 'senior' || savedMode === 'clinical') {
        setViewMode(savedMode);
      }
    }
  }, []);

  const handleToggleView = (mode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('glucoguard_view_mode', mode);
    }
  };

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

        // 4. Fetch initial AI prediction
        const predRes = await fetch(`${API_BASE}/api/v1/cgm/prediction`);
        if (predRes.ok) {
          const predData = await predRes.json();
          if (isMounted && predData.data) {
            setAiPrediction(predData.data);
          }
        }

        // 5. Fetch active emergency alert if present
        const alertRes = await fetch(`${API_BASE}/api/v1/alerts/active?userId=usr_patient_03`);
        if (alertRes.ok) {
          const alertData = await alertRes.json();
          if (isMounted && alertData.hasActiveAlert && alertData.data) {
            setActiveEmergencyAlert(alertData.data);
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
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
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

    // Ingest real-time AI predictions broadcast
    socket.on('cgm:prediction', (predictionData) => {
      setAiPrediction(predictionData);
    });

    // Receive status updates (running, paused, stopped)
    socket.on('cgm:status', (newStatus) => {
      setStatus(newStatus);
      if (newStatus.personaId) {
        setSelectedPersonaId(newStatus.personaId);
      }
    });

    // Receive event notifications
    socket.on('cgm:event', (eventData) => {
      const eventName = (eventData.activeEvent || 'Normal').replace('_', ' ').toUpperCase();
      showFeedback(`Metabolic event updated: ${eventName}`, 'info');
    });

    // Ingest emergency breach alerts (Module M7)
    socket.on('cgm:alert', (alertData) => {
      setActiveEmergencyAlert(alertData);
    });

    socket.on('cgm:alert_acknowledged', () => {
      setActiveEmergencyAlert(null);
    });

    return () => {
      socket.disconnect();
    };
  }, [showFeedback]);

  const activePersona = personas.find((p) => p.id === (status.personaId || selectedPersonaId)) || {
    id: 'VP-03',
    name: 'Brittle Type 1 (High Risk)',
    baseline: 150,
    targetRange: { low: 70, high: 180 },
    deviceId: 'CGM-SENSOR-VP03',
    userId: 'usr_patient_03'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full flex-1">
      {/* Patient Header & Clinical Telemetry Status */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                Continuous Interstitial Telemetry
              </span>
              <span className="text-xs font-mono text-slate-400">
                Patient: <strong className="text-slate-700">{activePersona.name}</strong>
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">
              Patient Continuous Glucose Monitor
            </h1>
            <p className="mt-1 text-slate-600 text-xs md:text-sm">
              Real-time metabolic trajectory, forward AI forecasting, and dynamic clinical emergency supervision.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle Switch (TASK-M3-SENIOR) */}
            <div className="inline-flex rounded-xl border border-slate-300 p-1 bg-slate-100 shadow-2xs">
              <button
                type="button"
                onClick={() => handleToggleView('clinical')}
                data-testid="toggle-clinical-view"
                aria-pressed={viewMode === 'clinical'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'clinical'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Clinical View</span>
              </button>
              <button
                type="button"
                onClick={() => handleToggleView('senior')}
                data-testid="toggle-senior-view"
                aria-pressed={viewMode === 'senior'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'senior'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Senior Care View</span>
              </button>
            </div>

            {/* Real-time Socket Connection Badge */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-2xs ${
              socketConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}>
              {socketConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  <span>Telemetry Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-rose-600" />
                  <span>Connecting...</span>
                </>
              )}
            </div>

            {/* Sensor Device Badge */}
            <div className="text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 font-mono flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-slate-500" />
              <span>{activePersona.deviceId || 'CGM-SENSOR-001'}</span>
            </div>

            {/* Discreet Simulation Tag per ADR-007 */}
            <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 font-mono">
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
            <button type="button" onClick={() => setFeedbackMessage(null)} aria-label="Dismiss message" className="text-slate-400 hover:text-slate-600 ml-4 font-bold">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Conditionally Render Senior Care View or Clinical Telemetry View */}
      {viewMode === 'senior' ? (
        <SeniorGlucoseView
          reading={latestReading}
          prediction={aiPrediction}
          persona={activePersona}
        />
      ) : (
        <>
          {/* 1. Clinical Metric Cards Display */}
          <MetricCards
            reading={latestReading}
            readings={readings}
            persona={activePersona}
            isConnected={socketConnected}
          />

          {/* 2. AI Predictive Early-Warning & Multi-Step Forecast Card (TASK-M4-FULL) */}
          <AIPredictionCard prediction={aiPrediction} />

          {/* 3. Interactive Real-Time Recharts Line Graph with AI Forecast Extension */}
          <GlucoseChart
            readings={readings}
            predictions={aiPrediction?.predictions || []}
            maxPoints={50}
          />
        </>
      )}

      {/* Clinical Disclaimer Callout per ADR-007 */}
      <div className="mt-8 bg-amber-50 rounded-2xl border border-amber-200 p-6 text-amber-900 text-xs leading-relaxed mb-6 shadow-2xs">
        <h3 className="font-bold text-sm text-amber-950 mb-1 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Non-Clinical Simulation Prototype Notice</span>
        </h3>
        <p>
          GlucoGuard is developed strictly as an educational and engineering simulation prototype. Readings displayed on this interface are synthetic simulation values generated for computational modeling and algorithmic demonstration. This software must not be used to direct medical care, administer insulin or pharmacological therapy, or replace licensed physician oversight.
        </p>
      </div>

      {/* Real-time Emergency Alert Modal (Module M7) */}
      {activeEmergencyAlert && (
        <EmergencyAlertModal
          alert={activeEmergencyAlert}
          onAcknowledge={() => setActiveEmergencyAlert(null)}
          onDismiss={() => setActiveEmergencyAlert(null)}
        />
      )}
    </div>
  );
}
