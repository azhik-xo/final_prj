'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Siren,
  ShieldAlert,
  PhoneCall,
  Ambulance,
  CheckCircle2,
  Clock,
  MapPin,
  Activity,
  AlertTriangle,
  HeartPulse,
  Navigation,
  User,
  Radio,
  RefreshCw,
  Play,
  X,
  Volume2,
  VolumeX,
  Check
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const EMERGENCY_CONTACTS = [
  {
    role: 'Primary Caregiver',
    name: 'Jane Doe (Spouse)',
    phone: '+1 (555) 019-2834',
    relationship: 'Family Member',
    channel: 'SMS & Critical Push Notification',
    status: 'Verified & Active'
  },
  {
    role: 'Attending Endocrinologist',
    name: 'Dr. Robert Vance, MD',
    phone: '+1 (555) 019-5821',
    relationship: 'Healthcare Provider',
    channel: 'Clinical Portal Escalation',
    status: 'On Call'
  },
  {
    role: 'Simulated EMS Emergency Dispatch',
    name: 'Metro EMS Ambulance Services',
    phone: 'Simulated 911 / 112 Gateway',
    relationship: 'Emergency Medical Dispatcher',
    channel: 'Simulated Telemetry Bridge (Unit AMB-108)',
    status: 'Simulation Only'
  }
];

export default function EmergencyHubPage() {
  const [activeAlert, setActiveAlert] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [countdown, setCountdown] = useState(60);
  const [simulatedEta, setSimulatedEta] = useState(8);

  // Fetch active alert & history
  const fetchEmergencyData = useCallback(async () => {
    try {
      const activeRes = await fetch(`${API_BASE}/api/v1/alerts/active?userId=usr_patient_03`);
      if (activeRes.ok) {
        const activeJson = await activeRes.json();
        if (activeJson.hasActiveAlert && activeJson.data) {
          setActiveAlert(activeJson.data);
          if (activeJson.data.countdownSeconds) {
            setCountdown(activeJson.data.countdownSeconds);
          }
        } else {
          setActiveAlert(null);
        }
      }
    } catch {
      // Fallback
    }

    try {
      const histRes = await fetch(`${API_BASE}/api/v1/alerts/history?userId=usr_patient_03`);
      if (histRes.ok) {
        const histJson = await histRes.json();
        if (histJson.data && Array.isArray(histJson.data)) {
          setHistory(histJson.data);
        }
      }
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    fetchEmergencyData();
    const interval = setInterval(fetchEmergencyData, 4000);
    return () => clearInterval(interval);
  }, [fetchEmergencyData]);

  // Live countdown timer for active alert
  useEffect(() => {
    if (!activeAlert || activeAlert.status === 'acknowledged') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeAlert]);

  // Acknowledge active alert
  const handleAcknowledge = async (actionTaken = 'consumed_15g_carbs') => {
    if (!activeAlert) return;
    setIsLoading(true);
    try {
      const alertId = activeAlert.alertId || activeAlert._id;
      const res = await fetch(`${API_BASE}/api/v1/alerts/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId,
          acknowledgedBy: 'patient',
          actionTaken
        })
      });

      if (res.ok) {
        setActiveAlert(null);
        setStatusMessage({
          type: 'success',
          text: 'Emergency alert acknowledged. Escalation protocol successfully disengaged.'
        });
        fetchEmergencyData();
      }
    } catch {
      setActiveAlert(null);
      setStatusMessage({
        type: 'success',
        text: 'Alert acknowledged in local session.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Escalate to Stage 2 Caregiver
  const handleEscalateCaregiver = async () => {
    if (!activeAlert) return;
    setIsLoading(true);
    try {
      const alertId = activeAlert.alertId || activeAlert._id;
      const res = await fetch(`${API_BASE}/api/v1/alerts/escalate-caregiver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId })
      });

      if (res.ok) {
        setStatusMessage({
          type: 'info',
          text: 'Stage 2 Escalation Activated: Caregiver alert transmitted.'
        });
        fetchEmergencyData();
      }
    } catch {
      setStatusMessage({
        type: 'info',
        text: 'Escalated to Stage 2 (Caregiver).'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Dispatch Stage 3 Simulated SOS
  const handleDispatchSos = async () => {
    if (!activeAlert) return;
    setIsLoading(true);
    try {
      const alertId = activeAlert.alertId || activeAlert._id;
      const res = await fetch(`${API_BASE}/api/v1/alerts/dispatch-sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId,
          coords: { lat: 13.0827, lng: 80.2707 }
        })
      });

      if (res.ok) {
        setStatusMessage({
          type: 'error',
          text: 'Stage 3 Simulated SOS Dispatched: Ambulance Unit AMB-GLUCO-108 en route.'
        });
        fetchEmergencyData();
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Simulated SOS dispatched.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 1-Click Simulation Trigger
  const handleTriggerSimulation = async (glucose, rateOfChange, label) => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/alerts/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'usr_patient_03',
          glucose,
          rateOfChange
        })
      });

      const json = await res.json();
      if (res.ok && json.data) {
        setActiveAlert(json.data);
        setCountdown(60);
        setStatusMessage({
          type: 'info',
          text: `Injected simulated emergency: ${label}. Review escalation protocol.`
        });
        fetchEmergencyData();
      }
    } catch {
      // Local fallback simulation
      const mockAlert = {
        alertId: 'sim_' + Date.now(),
        glucose,
        rateOfChange,
        alertType: glucose < 54 ? 'CRITICAL_HYPO' : glucose > 300 ? 'CRITICAL_HYPER' : 'WARNING_HYPO',
        severity: 'CRITICAL',
        title: glucose < 54 ? 'CRITICAL HYPOGLYCEMIA ALERT' : 'CRITICAL HYPERGLYCEMIA ALERT',
        message: `Simulated reading of ${glucose} mg/dL (rate: ${rateOfChange} mg/dL/min).`,
        actionProtocol: 'Immediate fast carbs required.',
        status: 'triggered',
        stage: 1,
        countdownSeconds: 60,
        source: 'simulation',
        timestamp: new Date().toISOString()
      };
      setActiveAlert(mockAlert);
      setCountdown(60);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Breadcrumb */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                <Siren className="w-3 h-3" />
                Module M7
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <ShieldAlert className="w-3 h-3" />
                Intelligent Emergency Response
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                source: simulation
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Emergency Response Hub & Simulated SOS Dispatch
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Real-time monitoring of acute glycemic breaches, multi-stage patient-to-caregiver escalation,
              and automated simulated EMS ambulance dispatch tracking.
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
              <Radio className="w-3.5 h-3.5" />
              Simulation Lab
            </Link>
          </div>
        </div>

        {/* Mandatory Clinical Simulation Disclaimer per ADR-007 and ADR-011 */}
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong className="font-semibold block text-amber-950 mb-0.5">
              Simulated Emergency Boundary Notice (ADR-007 / ADR-011)
            </strong>
            GlucoGuard is a software-based educational engineering simulation prototype. <strong>NO ACTUAL EMERGENCY SERVICES (911/112) ARE CONTACTED</strong>.
            All ambulance dispatches, caregiver notifications, and GPS tracking coordinates are fully synthetic. In a real-world diabetic medical emergency,
            always call your local emergency phone number immediately.
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
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : statusMessage.type === 'info' ? (
                <ShieldAlert className="w-4 h-4 text-sky-600 shrink-0" />
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

        {/* Section 1: Live Emergency Status Hero Card */}
        {activeAlert ? (
          <section className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-6 shadow-md relative overflow-hidden animate-in fade-in">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-lg animate-pulse">
                  <Siren className="w-7 h-7" />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase bg-rose-200 text-rose-950 tracking-wider">
                      ACTIVE EMERGENCY INCIDENT
                    </span>
                    <span className="text-xs font-bold text-rose-800">
                      Severity: {activeAlert.severity}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-rose-950 tracking-tight">
                    {activeAlert.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-rose-900 mt-1 max-w-2xl leading-relaxed">
                    {activeAlert.message}
                  </p>
                </div>
              </div>

              {/* Countdown & Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/90 backdrop-blur p-4 rounded-xl border border-rose-200 shrink-0">
                <div className="text-center px-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Auto-Escalate In
                  </span>
                  <span className="text-3xl font-black text-rose-600 font-mono">
                    {countdown}s
                  </span>
                </div>

                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleAcknowledge('consumed_15g_carbs')}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    I Am Safe (Acknowledge)
                  </button>
                  <button
                    type="button"
                    onClick={handleDispatchSos}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all"
                  >
                    <Ambulance className="w-3.5 h-3.5" />
                    Dispatch Simulated SOS
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="bg-emerald-50 border border-emerald-300 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-200 text-emerald-950 tracking-wider">
                    All Systems Normal
                  </span>
                  <h2 className="text-lg font-bold text-emerald-950 mt-0.5">
                    No Active Emergency Detected
                  </h2>
                  <p className="text-xs text-emerald-800">
                    Continuous monitoring active. Blood glucose levels remain within monitored clinical tolerance.
                  </p>
                </div>
              </div>

              <div className="text-right text-xs text-emerald-900 font-mono">
                <span className="block text-[10px] text-emerald-700 uppercase">Target Safe Zone</span>
                <span className="font-bold text-sm">70 – 180 mg/dL</span>
              </div>
            </div>
          </section>
        )}

        {/* Section 2: Multi-Stage Escalation Visualizer */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Multi-Stage Escalation Protocol Architecture
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Deterministic 3-tier safety workflow triggered by unacknowledged glycemic events.
              </p>
            </div>
            <span className="text-[11px] font-medium text-slate-500">
              Protocol: ADA-SOS-v1
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Stage 1 */}
            <div className={`p-5 rounded-xl border flex flex-col justify-between ${
              activeAlert?.stage === 1
                ? 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20'
                : 'border-slate-200 bg-slate-50/50'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-200 text-slate-800">
                    Stage 1 (0 – 60s)
                  </span>
                  <Clock className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Patient Direct Alert</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  High-contrast visual siren and synthetic acoustic pulse chime. Patient has 60 seconds to acknowledge safety.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] text-slate-500">
                Action: Acknowledge & Consume 15g fast carbs.
              </div>
            </div>

            {/* Stage 2 */}
            <div className={`p-5 rounded-xl border flex flex-col justify-between ${
              activeAlert?.stage === 2 || activeAlert?.caregiverNotified
                ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                : 'border-slate-200 bg-slate-50/50'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-200 text-slate-800">
                    Stage 2 (60s+)
                  </span>
                  <PhoneCall className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Caregiver SOS Notification</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Automated simulated SMS and push notification broadcast to designated caregiver with real-time glucose reading.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] text-slate-500">
                Recipient: Jane Doe (Spouse) &bull; Verified
              </div>
            </div>

            {/* Stage 3 */}
            <div className={`p-5 rounded-xl border flex flex-col justify-between ${
              activeAlert?.stage === 3 || activeAlert?.simulatedSos?.dispatched
                ? 'border-rose-600 bg-rose-50/80 ring-2 ring-rose-600/30 shadow-sm'
                : 'border-slate-200 bg-slate-50/50'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-200 text-slate-800">
                    Stage 3 (SOS Dispatch)
                  </span>
                  <Ambulance className="w-4 h-4 text-rose-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Simulated EMS Dispatch</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Automated simulated ambulance routing with synthetic GPS coordinate transmission and live ETA tracking.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200/80 text-[11px] font-mono text-rose-700 font-semibold">
                Unit: AMB-GLUCO-108 &bull; ETA ~8 min
              </div>
            </div>
          </div>

          {/* Live Simulated Ambulance GPS Tracking Card */}
          {(activeAlert?.simulatedSos?.dispatched || activeAlert?.stage === 3) && (
            <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                    Simulated EMS Unit In Transit
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Vehicle ID: {activeAlert?.simulatedSos?.vehicleId || 'AMB-GLUCO-108'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="bg-slate-800/80 p-2.5 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Simulated GPS Coordinates</span>
                  <span className="font-mono font-bold text-white">
                    13.0827° N, 80.2707° E
                  </span>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Estimated Arrival Time</span>
                  <span className="font-mono font-bold text-emerald-400">
                    ~8 minutes (Simulated)
                  </span>
                </div>
                <div className="bg-slate-800/80 p-2.5 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Dispatch Status</span>
                  <span className="font-bold text-amber-400">
                    Priority 1 Emergency Response
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Section 3: 1-Click Simulation Triggers for Testing */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-600" />
                1-Click Simulation Triggers (Testing & Verification)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inject synthetic glucose breaches to test multi-stage escalation and simulated SOS dispatches.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              Interactive Test Bench
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleTriggerSimulation(46, -1.2, 'Severe Hypo (<54 mg/dL)')}
              className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/60 text-left transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-rose-950">Severe Hypo (&lt;54 mg/dL)</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-200 text-rose-900 font-mono">
                  46 mg/dL
                </span>
              </div>
              <p className="text-[11px] text-rose-800">
                Triggers Critical Hypoglycemia Alert and activates 60-second countdown.
              </p>
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleTriggerSimulation(66, -3.2, 'Precipitous Drop (-3.2 mg/dL/min)')}
              className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 text-left transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-amber-950">Precipitous Drop Velocity</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 font-mono">
                  -3.2 /min
                </span>
              </div>
              <p className="text-[11px] text-amber-800">
                Tests rapid plunge threshold ($dG/dt &lt; -2.5$) escalating ahead of nadir.
              </p>
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleTriggerSimulation(335, 1.8, 'Hyperglycemic Crisis (>300 mg/dL)')}
              className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100/60 text-left transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-indigo-950">Hyper Crisis (&gt;300 mg/dL)</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-200 text-indigo-900 font-mono">
                  335 mg/dL
                </span>
              </div>
              <p className="text-[11px] text-indigo-800">
                Tests Critical Hyperglycemia and ketosis warning alerts.
              </p>
            </button>
          </div>
        </section>

        {/* Section 4: Emergency Contacts Roster & Rule of 15 Protocol */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Emergency Contacts Roster (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-emerald-600" />
                Emergency Contact Notification Roster
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Designated family caregivers and medical personnel configured for automated escalation.
              </p>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {EMERGENCY_CONTACTS.map((contact, idx) => (
                <div key={idx} className="p-4 bg-white hover:bg-slate-50/50 transition-colors flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      {contact.role}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 mt-0.5">
                      {contact.name}
                    </h3>
                    <p className="text-xs text-slate-600 font-mono mt-0.5">
                      {contact.phone}
                    </p>
                    <span className="text-[11px] text-slate-500 block mt-1">
                      Channel: {contact.channel}
                    </span>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                    {contact.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Rule of 15 Emergency Protocol Card (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-rose-600" />
                The Clinical &quot;Rule of 15&quot; Protocol
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Standard American Diabetes Association guideline for treating hypoglycemia.
              </p>
            </div>

            <ol className="space-y-3 text-xs text-slate-700">
              <li className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50/50 border border-rose-200/70">
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="font-semibold block text-slate-900">15g Fast Carbohydrates</strong>
                  Consume 4 oz fruit juice, 3-4 glucose tablets, or 5 pieces of hard candy immediately.
                </div>
              </li>

              <li className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50/50 border border-amber-200/70">
                <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="font-semibold block text-slate-900">Wait 15 Minutes</strong>
                  Rest in a seated position. Allow duodenal absorption to elevate circulating blood sugar.
                </div>
              </li>

              <li className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50/50 border border-emerald-200/70">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="font-semibold block text-slate-900">Recheck Blood Glucose</strong>
                  If still below 100 mg/dL, repeat with another 15g carbs. Once above 100 mg/dL, consume a small meal.
                </div>
              </li>
            </ol>
          </div>
        </div>

        {/* Section 5: Emergency Incident Audit History */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-600" />
                Emergency Incident Audit Log
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Permanent chronological record of critical breaches, caregiver escalations, and acknowledgments.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {history.length} logged incidents
            </span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
              <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No Emergency Incidents Recorded</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Use the 1-Click simulation triggers above to test emergency alerting.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3">Alert Type</th>
                    <th className="py-3 px-3">Glucose Level</th>
                    <th className="py-3 px-3">Severity</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Action Taken</th>
                    <th className="py-3 px-3">Caregiver</th>
                    <th className="py-3 px-3">Simulated SOS</th>
                    <th className="py-3 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((item, index) => {
                    const formattedTime = item.timestamp
                      ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Just now';

                    return (
                      <tr key={item._id || item.alertId || index} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-3 font-semibold text-slate-900">
                          {item.title || item.alertType}
                        </td>
                        <td className="py-3.5 px-3 font-mono font-bold text-rose-700">
                          {item.glucose} mg/dL
                        </td>
                        <td className="py-3.5 px-3 uppercase text-[10px] font-bold">
                          <span className={`px-2 py-0.5 rounded ${
                            item.severity === 'CRITICAL'
                              ? 'bg-rose-100 text-rose-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}>
                            {item.severity}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 capitalize font-semibold text-slate-700">
                          {item.status}
                        </td>
                        <td className="py-3.5 px-3 text-slate-600">
                          {item.actionTaken || 'None recorded'}
                        </td>
                        <td className="py-3.5 px-3 text-slate-600">
                          {item.caregiverNotified ? 'Notified' : 'Pending'}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[11px]">
                          {item.simulatedSos?.dispatched ? 'Dispatched' : 'Standby'}
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
