'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  HeartPulse,
  Activity,
  ShieldAlert,
  PhoneCall,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  ShieldCheck,
  Info
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function CaregiverPortalPage() {
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [filterRisk, setFilterRisk] = useState('ALL');

  // Fetch patient roster with live simulated metrics & alert status
  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/clinical/patients`);
      if (!res.ok) {
        throw new Error(`Failed to load patient roster (HTTP ${res.status})`);
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPatients(json.data);
        setLastUpdated(new Date());
        setError(null);
      }
    } catch (err) {
      setError(err.message || 'Unable to connect to clinical API server.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
    // Poll every 5 seconds for live caregiver telemetry
    const interval = setInterval(fetchPatients, 5000);
    return () => clearInterval(interval);
  }, [fetchPatients]);

  // Handle Caregiver Remote Acknowledgment
  const handleCaregiverAck = async (alertId, patientId, caregiverName) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/clinical/caregiver/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId,
          patientId,
          caregiverName: caregiverName || 'Primary Family Caregiver',
          actionTaken: 'remote_caregiver_contact_verified'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionFeedback({
          type: 'success',
          text: `Alert for ${patientId} acknowledged remotely. Escalation halted.`
        });
        fetchPatients();
      } else {
        setActionFeedback({
          type: 'error',
          text: data.message || 'Failed to acknowledge alert.'
        });
      }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        text: 'Network error communicating remote acknowledgment.'
      });
    }
    setTimeout(() => setActionFeedback(null), 5000);
  };

  // Find any active alerts among dependents
  const activeAlertPatients = patients.filter((p) => p.activeAlert !== null);

  // Filtered patients
  const displayedPatients = patients.filter((p) => {
    if (filterRisk === 'ALL') return true;
    return p.riskTier === filterRisk;
  });

  return (
    <div className="flex-1 bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-sky-100 text-sky-800">
                <Users className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Caregiver Oversight Portal
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Multi-Patient Family &amp; Dependent Remote Monitoring • Real-Time Telemetry Bridge
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchPatients}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              href="/clinical"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
            >
              Doctor AGP Portal
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{actionFeedback.text}</span>
            </div>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* URGENT CAREGIVER ESCALATION BANNER (If any dependent in active alert) */}
        {activeAlertPatients.length > 0 && (
          <div className="rounded-2xl border-2 border-rose-500 bg-rose-50/90 p-5 shadow-md space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-rose-600 text-white shrink-0 animate-bounce">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                      Emergency Alert Active
                    </span>
                    <span className="text-xs text-rose-700 font-semibold">
                      {activeAlertPatients.length} Dependent(s) Require Attention
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-rose-950 mt-1">
                    Caregiver Urgent Notification &amp; Remote Safety Action
                  </h2>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {activeAlertPatients.map((p) => {
                const alert = p.activeAlert;
                return (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl border border-rose-300 bg-white shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-bold text-slate-900">{p.name}</span>
                        <span className="text-xs text-slate-500 ml-2">({p.id})</span>
                      </div>
                      <span className="text-base font-black text-rose-600">
                        {p.currentGlucose} mg/dL {p.trendArrow}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 bg-rose-50/80 p-2.5 rounded-lg border border-rose-200">
                      <p className="font-semibold text-rose-900">{alert?.title || 'Glycemic Warning'}</p>
                      <p className="mt-0.5 text-slate-700">{alert?.message}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Stage {alert?.stage || 1} Escalation • Caregiver Contact: {p.caregiver?.caregiverName} ({p.caregiver?.phone})
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() =>
                          handleCaregiverAck(
                            alert?.alertId,
                            p.id,
                            p.caregiver?.caregiverName
                          )
                        }
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Acknowledge as Caregiver (I Am With Patient)
                      </button>

                      <a
                        href={`tel:${p.caregiver?.phone || '555-0100'}`}
                        className="inline-flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-slate-600" />
                        Call
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter Bar & Roster Overview Metrics */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Filter by Risk Tier:
            </span>
            <div className="flex items-center gap-1.5">
              {['ALL', 'HIGH', 'MODERATE', 'LOW'].map((tier) => (
                <button
                  key={tier}
                  onClick={() => setFilterRisk(tier)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    filterRisk === tier
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <span>
              Total Monitored: <strong className="text-slate-900">{patients.length}</strong>
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>
              Stable in Target: <strong className="text-emerald-700">
                {patients.filter((p) => p.statusCategory === 'in_range').length}
              </strong>
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span>
              Action Required: <strong className="text-rose-700">
                {activeAlertPatients.length}
              </strong>
            </span>
          </div>
        </div>

        {/* Monitored Dependents Patient Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedPatients.map((patient) => {
            const hasAlert = !!patient.activeAlert;
            const isHypo = patient.currentGlucose < 70;
            const isHyper = patient.currentGlucose > 180;
            const isSafe = !isHypo && !isHyper;

            // Risk tier badge colors
            let riskBadge = 'bg-slate-100 text-slate-700 border-slate-300';
            if (patient.riskTier === 'HIGH') {
              riskBadge = 'bg-rose-100 text-rose-800 border-rose-300';
            } else if (patient.riskTier === 'MODERATE') {
              riskBadge = 'bg-amber-100 text-amber-800 border-amber-300';
            } else if (patient.riskTier === 'LOW') {
              riskBadge = 'bg-emerald-100 text-emerald-800 border-emerald-300';
            }

            // Glucose badge styling
            let glucoseBox = 'bg-emerald-50 border-emerald-300 text-emerald-950';
            let glucoseText = 'text-emerald-700';
            if (patient.currentGlucose < 54) {
              glucoseBox = 'bg-rose-100 border-rose-400 text-rose-950 animate-pulse';
              glucoseText = 'text-rose-700 font-black';
            } else if (patient.currentGlucose < 70) {
              glucoseBox = 'bg-rose-50 border-rose-300 text-rose-950';
              glucoseText = 'text-rose-700';
            } else if (patient.currentGlucose > 250) {
              glucoseBox = 'bg-purple-50 border-purple-300 text-purple-950';
              glucoseText = 'text-purple-700';
            } else if (patient.currentGlucose > 180) {
              glucoseBox = 'bg-amber-50 border-amber-300 text-amber-950';
              glucoseText = 'text-amber-700';
            }

            return (
              <div
                key={patient.id}
                className={`rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                  hasAlert ? 'border-rose-400 ring-2 ring-rose-300/50' : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Top Bar: Name, ID, Risk Tier */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {patient.id}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs text-slate-500 font-medium">
                          {patient.caregiver?.relation || 'Dependent'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">
                        {patient.name}
                      </h3>
                    </div>
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${riskBadge}`}
                    >
                      {patient.riskTier} RISK
                    </span>
                  </div>

                  {/* Glucose Readout Box */}
                  <div className={`mt-4 p-3.5 rounded-xl border ${glucoseBox} flex items-center justify-between`}>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Current Glucose
                      </span>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className={`text-3xl font-extrabold tracking-tight ${glucoseText}`}>
                          {patient.currentGlucose}
                        </span>
                        <span className="text-xs font-bold text-slate-500">mg/dL</span>
                        <span className="text-lg font-bold text-slate-700 ml-1">
                          {patient.trendArrow}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          isSafe
                            ? 'bg-emerald-100 text-emerald-800'
                            : isHypo
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isSafe ? 'In Target' : isHypo ? 'Below Range' : 'Above Range'}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Rate: {patient.rateOfChange > 0 ? `+${patient.rateOfChange}` : patient.rateOfChange} mg/dL/min
                      </p>
                    </div>
                  </div>

                  {/* Target Range Mini Bar */}
                  <div className="mt-3.5 space-y-1">
                    <div className="flex justify-between text-[11px] font-medium text-slate-500">
                      <span>Target: {patient.targetRange?.low || 70}–{patient.targetRange?.high || 180} mg/dL</span>
                      <span>Baseline: {patient.baseline} mg/dL</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
                      <div className="w-[17%] bg-rose-300" title="Low (<70)" />
                      <div className="w-[28%] bg-emerald-400" title="Safe Target (70-180)" />
                      <div className="w-[18%] bg-amber-300" title="High (181-250)" />
                      <div className="w-[37%] bg-purple-300" title="Very High (>250)" />
                    </div>
                  </div>

                  {/* Caregiver Assigned Details */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Caregiver:</span>
                      <span className="font-semibold text-slate-800">
                        {patient.caregiver?.caregiverName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Phone:</span>
                      <span className="font-mono text-slate-700">
                        {patient.caregiver?.phone}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Attending Physician:</span>
                      <span className="text-slate-700">
                        {patient.caregiver?.assignedDoctor}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <Link
                    href={`/clinical?patient=${patient.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    View AGP Profile
                  </Link>

                  <a
                    href={`tel:${patient.caregiver?.phone || '555-0100'}`}
                    className="inline-flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                    title={`Call ${patient.caregiver?.caregiverName}`}
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-slate-600" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Clinical Guidelines & Caregiver Protocols Section */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">
              Caregiver Emergency Protocol &amp; Escalation Standard
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-sky-600" />
                Stage 1: Patient Alarm (60s)
              </span>
              <p>
                Patient receives prominent visual siren and 60-second countdown prompt to confirm consciousness and take fast-acting simple carbohydrates.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-600" />
                Stage 2: Caregiver Notification
              </span>
              <p>
                If countdown lapses or glucose falls below 50 mg/dL, caregiver portal triggers critical notification banner and allows 1-click remote acknowledgment.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Stage 3: Simulated EMS Dispatch
              </span>
              <p>
                Unacknowledged severe events initiate simulated emergency dispatch protocol with simulated ambulance ETA and GPS telemetry bridge.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              <strong>Healthcare Simulation Notice:</strong> GlucoGuard Caregiver Portal is a research and educational prototype. All patient readings, telemetry updates, and emergency dispatches are 100% synthetically simulated. Never use for real clinical decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
