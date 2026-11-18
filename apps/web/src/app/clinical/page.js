'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Stethoscope,
  Activity,
  FileText,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  Clock,
  Download,
  Printer,
  Plus,
  RefreshCw,
  Info,
  Calendar,
  ChevronDown,
  ShieldCheck,
  TrendingUp,
  User,
  X
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const PERSONAS_LIST = [
  { id: 'VP-01', name: 'VP-01 • Healthy Individual (Non-Diabetic)', tag: 'Non-Diabetic' },
  { id: 'VP-02', name: 'VP-02 • Well-Managed Type 1', tag: 'Type 1 Controlled' },
  { id: 'VP-03', name: 'VP-03 • Brittle Type 1 (High Risk)', tag: 'Type 1 High Risk' },
  { id: 'VP-04', name: 'VP-04 • Type 2 (Insulin Resistant)', tag: 'Type 2' },
  { id: 'VP-05', name: 'VP-05 • Pre-Diabetes / Impaired Tolerance', tag: 'Pre-Diabetes' },
  { id: 'VP-06', name: 'VP-06 • Active Athlete', tag: 'Athlete' }
];

function ClinicalAgpContent() {
  const searchParams = useSearchParams();
  const initialPatient = searchParams.get('patient') || 'VP-03';

  const [selectedPatientId, setSelectedPatientId] = useState(initialPatient);
  const [agpData, setAgpData] = useState(null);
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteFormError, setNoteFormError] = useState(null);
  const [noteSuccess, setNoteSuccess] = useState(null);

  // New Note Form State
  const [noteForm, setNoteForm] = useState({
    doctorName: 'Dr. Evelyn Reed, MD (Endocrinology)',
    noteType: 'routine_review',
    assessment: '',
    recommendations: ''
  });

  // Fetch AGP Report for active patient
  const fetchAgpReport = useCallback(async (patientId) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/clinical/agp/${patientId}`);
      if (!res.ok) {
        throw new Error(`Failed to load AGP Report (HTTP ${res.status})`);
      }
      const json = await res.json();
      if (json.success && json.data) {
        setAgpData(json.data);
      }
    } catch (err) {
      setError(err.message || 'Unable to load Ambulatory Glucose Profile.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch Physician Consultation Notes for active patient
  const fetchNotes = useCallback(async (patientId) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/clinical/notes/${patientId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setNotes(json.data);
        }
      }
    } catch (e) {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    fetchAgpReport(selectedPatientId);
    fetchNotes(selectedPatientId);
  }, [selectedPatientId, fetchAgpReport, fetchNotes]);

  // Handle Note Submission
  const handleCreateNote = async (e) => {
    e.preventDefault();
    setNoteFormError(null);

    // Validate non-prescriptive rule per ADR-007
    const forbiddenPattern = /\b\d+\s*(units?|iu|u)\s*(of\s*)?(insulin|humalog|novolog|lantus|tresiba|basaglar)/i;
    if (forbiddenPattern.test(noteForm.recommendations)) {
      setNoteFormError('Safety Violation: Recommendations must NOT prescribe specific insulin units or drug titration per ADR-007. Lifestyle, hydration, and nutritional guidance only.');
      return;
    }

    if (!noteForm.assessment.trim() || !noteForm.recommendations.trim()) {
      setNoteFormError('Both Clinical Assessment and Educational Recommendations are required.');
      return;
    }

    setIsSubmittingNote(true);
    try {
      const tirSummary = agpData
        ? {
            inRangePercent: agpData.timeInRange?.inRange,
            cvPercent: agpData.metrics?.cvPercent,
            gmiPercent: agpData.metrics?.gmi
          }
        : null;

      const res = await fetch(`${API_BASE}/api/v1/clinical/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatientId,
          doctorName: noteForm.doctorName,
          noteType: noteForm.noteType,
          assessment: noteForm.assessment,
          recommendations: noteForm.recommendations,
          tirSummary
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setNoteSuccess('Clinical consultation note saved successfully.');
        setIsModalOpen(false);
        setNoteForm({
          doctorName: 'Dr. Evelyn Reed, MD (Endocrinology)',
          noteType: 'routine_review',
          assessment: '',
          recommendations: ''
        });
        fetchNotes(selectedPatientId);
        setTimeout(() => setNoteSuccess(null), 5000);
      } else {
        setNoteFormError(json.message || 'Failed to save clinical note.');
      }
    } catch (err) {
      setNoteFormError('Network error saving consultation note.');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Percentile Curve Rendering Helpers (SVG based)
  const renderAgpSvg = (curve) => {
    if (!curve || curve.length !== 24) return null;

    const svgWidth = 800;
    const svgHeight = 280;
    const padX = 50;
    const padY = 25;
    const plotW = svgWidth - padX * 2;
    const plotH = svgHeight - padY * 2;

    const minG = 40;
    const maxG = 350;

    const scaleX = (hour) => padX + (hour / 23) * plotW;
    const scaleY = (g) => padY + plotH - ((Math.min(maxG, Math.max(minG, g)) - minG) / (maxG - minG)) * plotH;

    // Build SVG polygon paths
    // Outer range: p10 forward, p90 reversed
    const outerPoints = [
      ...curve.map((pt) => `${scaleX(pt.hour)},${scaleY(pt.p10)}`),
      ...[...curve].reverse().map((pt) => `${scaleX(pt.hour)},${scaleY(pt.p90)}`)
    ].join(' ');

    // IQR range: p25 forward, p75 reversed
    const iqrPoints = [
      ...curve.map((pt) => `${scaleX(pt.hour)},${scaleY(pt.p25)}`),
      ...[...curve].reverse().map((pt) => `${scaleX(pt.hour)},${scaleY(pt.p75)}`)
    ].join(' ');

    // Median line: p50
    const medianPoints = curve.map((pt) => `${scaleX(pt.hour)},${scaleY(pt.p50)}`).join(' ');

    // Target threshold lines
    const y70 = scaleY(70);
    const y180 = scaleY(180);

    return (
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto select-none">
        {/* Background Target Zone 70 - 180 */}
        <rect
          x={padX}
          y={y180}
          width={plotW}
          height={y70 - y180}
          fill="#10b981"
          fillOpacity="0.08"
        />

        {/* Target Guideline Dashed Lines */}
        <line
          x1={padX}
          y1={y180}
          x2={svgWidth - padX}
          y2={y180}
          stroke="#10b981"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <text x={padX + 6} y={y180 - 6} fill="#059669" fontSize="10" fontWeight="600">
          Upper Target: 180 mg/dL
        </text>

        <line
          x1={padX}
          y1={y70}
          x2={svgWidth - padX}
          y2={y70}
          stroke="#ef4444"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <text x={padX + 6} y={y70 + 14} fill="#dc2626" fontSize="10" fontWeight="600">
          Hypo Threshold: 70 mg/dL
        </text>

        {/* Outer Ribbon (10th - 90th percentile) */}
        <polygon points={outerPoints} fill="#6366f1" fillOpacity="0.12" />

        {/* Interquartile Ribbon (25th - 75th percentile) */}
        <polygon points={iqrPoints} fill="#4f46e5" fillOpacity="0.25" />

        {/* Median Line (50th percentile) */}
        <polyline
          points={medianPoints}
          fill="none"
          stroke="#312e81"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* X Axis Ticks */}
        {[0, 3, 6, 9, 12, 15, 18, 21, 23].map((h) => {
          const x = scaleX(h);
          const label = `${String(h).padStart(2, '0')}:00`;
          return (
            <g key={h}>
              <line x1={x} y1={svgHeight - padY} x2={x} y2={svgHeight - padY + 5} stroke="#94a3b8" />
              <text
                x={x}
                y={svgHeight - padY + 16}
                fill="#64748b"
                fontSize="10"
                textAnchor="middle"
                fontWeight="500"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Y Axis Labels */}
        {[70, 140, 180, 250, 300].map((val) => {
          const y = scaleY(val);
          return (
            <g key={val}>
              <line x1={padX - 4} y1={y} x2={padX} y2={y} stroke="#cbd5e1" />
              <text
                x={padX - 8}
                y={y + 3}
                fill="#64748b"
                fontSize="10"
                textAnchor="end"
                fontWeight="500"
              >
                {val}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  const patient = agpData?.patient;
  const metrics = agpData?.metrics;
  const tir = agpData?.timeInRange;

  return (
    <div className="flex-1 bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-indigo-100 text-indigo-800">
              <Stethoscope className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Ambulatory Glucose Profile (AGP) Clinical Report
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                  International Consensus Standard
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Battelino et al., Diabetes Care 2019 • 5-Tier Time-in-Range • Glycemic Variability &amp; GMI
              </p>
            </div>
          </div>

          {/* Action Shortcuts */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / PDF
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Clinical Note
            </button>
          </div>
        </div>

        {/* Patient Selection Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Select Monitored Patient:
            </span>
            <div className="relative">
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 pr-8 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {PERSONAS_LIST.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2 pointer-events-none" />
            </div>
          </div>

          {patient && (
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span>
                Target Range: <strong className="text-slate-900">{patient.targetRange?.low}–{patient.targetRange?.high} mg/dL</strong>
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span>
                Baseline: <strong className="text-slate-900">{patient.baseline} mg/dL</strong>
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span>
                Volatility: <strong className="text-slate-900">{patient.volatility}x</strong>
              </span>
            </div>
          )}
        </div>

        {noteSuccess && (
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{noteSuccess}</span>
          </div>
        )}

        {/* CLINICAL SUMMARY KPI CARDS (Mean, GMI, CV, Readings Count) */}
        {metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Mean Glucose */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Mean Glucose (eAG)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900">
                  {metrics.meanGlucose}
                </span>
                <span className="text-xs font-bold text-slate-500">mg/dL</span>
              </div>
              <p className="text-[11px] text-slate-500">
                SD: &plusmn;{metrics.stdDev} mg/dL • Target: &lt;154 mg/dL
              </p>
            </div>

            {/* 2. Glucose Management Indicator (GMI / est HbA1c) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                GMI (Estimated HbA1c)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-indigo-700">
                  {metrics.gmi}%
                </span>
                <span className="text-xs font-bold text-slate-500">GMI</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Formula: 3.31 + 0.02392 &times; Mean • Target: &lt;7.0%
              </p>
            </div>

            {/* 3. Glycemic Variability (CV) */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Glycemic Variability (CV)
              </span>
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-3xl font-extrabold ${
                    metrics.cvPercent <= 36 ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {metrics.cvPercent}%
                </span>
                <span className="text-xs font-bold text-slate-500">CV</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    metrics.cvPercent <= 36
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {metrics.cvPercent <= 36 ? 'Target Met (<=36%)' : 'High Variability (>36%)'}
                </span>
              </div>
            </div>

            {/* 4. Active Telemetry Sufficiency */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                CGM Active Telemetry
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900">
                  {agpData.reportingPeriod?.readingsCount || 288}
                </span>
                <span className="text-xs font-bold text-slate-500">readings</span>
              </div>
              <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                100% Complete 14-Day Simulation Window
              </p>
            </div>
          </div>
        )}

        {/* 5-TIER TIME-IN-RANGE (TIR) CLINICAL SECTION */}
        {tir && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Time-in-Range (TIR) Clinical Standard
                </h2>
                <p className="text-xs text-slate-500">
                  Consensus Target: &gt;70% In-Range, &lt;4% Hypo (&lt;1% Very Low), &lt;25% Hyper
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    tir.inRange >= 70
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {tir.inRange >= 70 ? 'TIR Target Achieved' : 'TIR Below Target (<70%)'}
                </span>
              </div>
            </div>

            {/* Stacked Horizontal Bar Meter */}
            <div className="space-y-2">
              <div className="h-7 w-full rounded-xl bg-slate-100 overflow-hidden flex shadow-inner">
                {/* 1. Very Low (<54) */}
                <div
                  style={{ width: `${Math.max(1, tir.veryLow)}%` }}
                  className="bg-rose-700 h-full transition-all relative group"
                  title={`Very Low (<54 mg/dL): ${tir.veryLow}%`}
                />
                {/* 2. Low (54-69) */}
                <div
                  style={{ width: `${Math.max(1, tir.low)}%` }}
                  className="bg-rose-400 h-full transition-all relative group"
                  title={`Low (54-69 mg/dL): ${tir.low}%`}
                />
                {/* 3. In Range (70-180) */}
                <div
                  style={{ width: `${Math.max(1, tir.inRange)}%` }}
                  className="bg-emerald-500 h-full transition-all relative group"
                  title={`In Range (70-180 mg/dL): ${tir.inRange}%`}
                />
                {/* 4. High (181-250) */}
                <div
                  style={{ width: `${Math.max(1, tir.high)}%` }}
                  className="bg-amber-400 h-full transition-all relative group"
                  title={`High (181-250 mg/dL): ${tir.high}%`}
                />
                {/* 5. Very High (>250) */}
                <div
                  style={{ width: `${Math.max(1, tir.veryHigh)}%` }}
                  className="bg-purple-600 h-full transition-all relative group"
                  title={`Very High (>250 mg/dL): ${tir.veryHigh}%`}
                />
              </div>

              {/* Stacked Bar Legend & Target Benchmark Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                {/* Very High */}
                <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/60 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                    <span className="text-[11px] font-bold text-slate-700">Very High (&gt;250)</span>
                  </div>
                  <p className="text-lg font-extrabold text-purple-900">{tir.veryHigh}%</p>
                  <p className="text-[10px] text-slate-500">Target: &lt;5%</p>
                </div>

                {/* High */}
                <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/60 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-[11px] font-bold text-slate-700">High (181–250)</span>
                  </div>
                  <p className="text-lg font-extrabold text-amber-900">{tir.high}%</p>
                  <p className="text-[10px] text-slate-500">Target: &lt;25%</p>
                </div>

                {/* In Range */}
                <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 space-y-0.5 col-span-2 sm:col-span-1 shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-bold text-emerald-900">In Range (70–180)</span>
                  </div>
                  <p className="text-xl font-black text-emerald-800">{tir.inRange}%</p>
                  <p className="text-[10px] text-emerald-700 font-semibold">Target: &gt;70%</p>
                </div>

                {/* Low */}
                <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/60 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <span className="text-[11px] font-bold text-slate-700">Low (54–69)</span>
                  </div>
                  <p className="text-lg font-extrabold text-rose-900">{tir.low}%</p>
                  <p className="text-[10px] text-slate-500">Target: &lt;4%</p>
                </div>

                {/* Very Low */}
                <div className="p-3 rounded-lg border border-rose-300 bg-rose-100/60 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-700" />
                    <span className="text-[11px] font-bold text-slate-700">Very Low (&lt;54)</span>
                  </div>
                  <p className="text-lg font-extrabold text-rose-950">{tir.veryLow}%</p>
                  <p className="text-[10px] text-slate-500">Target: &lt;1%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 24-HOUR AMBULATORY GLUCOSE PROFILE PERCENTILE CURVE */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                24-Hour Ambulatory Glucose Profile Percentile Curve
              </h2>
              <p className="text-xs text-slate-500">
                Median (50th percentile) with Interquartile Range (25th–75th) &amp; Outer Range (10th–90th)
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <span className="w-3 h-1 bg-indigo-950 rounded-full" />
                Median (50%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-2.5 bg-indigo-500/40 rounded" />
                IQR (25–75%)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-2.5 bg-indigo-300/30 rounded" />
                Outer (10–90%)
              </span>
            </div>
          </div>

          {/* SVG Percentile Chart */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            {agpData?.percentileCurve ? (
              renderAgpSvg(agpData.percentileCurve)
            ) : (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                Loading AGP percentile series...
              </div>
            )}
          </div>
        </div>

        {/* HOURLY MODAL DAY PROFILE / HEATMAP */}
        {agpData?.hourlyHeatmap && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <h2 className="text-base font-bold text-slate-900">
              Hourly Modal Day Stability Profile
            </h2>
            <p className="text-xs text-slate-500">
              Hour-by-hour median glucose distribution throughout the 24-hour circadian cycle
            </p>

            <div className="grid grid-cols-6 sm:grid-cols-12 md:grid-cols-24 gap-1.5 pt-2">
              {agpData.hourlyHeatmap.map((b) => {
                let cellColor = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                if (b.status === 'very_low') cellColor = 'bg-rose-200 text-rose-950 border-rose-400';
                else if (b.status === 'low') cellColor = 'bg-rose-100 text-rose-900 border-rose-300';
                else if (b.status === 'very_high') cellColor = 'bg-purple-200 text-purple-950 border-purple-400';
                else if (b.status === 'high') cellColor = 'bg-amber-100 text-amber-900 border-amber-300';

                return (
                  <div
                    key={b.hour}
                    className={`p-2 rounded-lg border text-center transition-all ${cellColor}`}
                    title={`Hour ${b.timeLabel}: Median ${b.medianGlucose} mg/dL (${b.status})`}
                  >
                    <div className="text-[10px] font-mono text-slate-500 font-semibold">{b.timeLabel.slice(0, 2)}h</div>
                    <div className="text-xs font-bold mt-0.5">{b.medianGlucose}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PHYSICIAN CONSULTATION NOTES & CLINICAL IMPRESSIONS LOG */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Physician Consultation Notes &amp; Clinical Impressions
                </h2>
                <p className="text-xs text-slate-500">
                  Documented clinical reviews for patient {selectedPatientId}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Consultation Note
            </button>
          </div>

          {notes.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No consultation notes recorded for this patient yet. Click &quot;Add Clinical Note&quot; to author an impression.
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note._id || note.timestamp}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-slate-200/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{note.doctorName}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                        {note.noteType.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(note.timestamp).toLocaleDateString()} at{' '}
                      {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Clinical Assessment
                    </h4>
                    <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
                      {note.assessment}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Educational Recommendations (Lifestyle &amp; Nutrition)
                    </h4>
                    <p className="text-xs text-slate-700 mt-0.5 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                      {note.recommendations}
                    </p>
                  </div>

                  {note.tirSummary && (
                    <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                      <span>TIR: <strong className="text-slate-800">{note.tirSummary.inRangePercent}%</strong></span>
                      <span>CV: <strong className="text-slate-800">{note.tirSummary.cvPercent}%</strong></span>
                      <span>GMI: <strong className="text-slate-800">{note.tirSummary.gmiPercent}%</strong></span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODAL: ADD CLINICAL CONSULTATION NOTE */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Add Physician Consultation Note ({selectedPatientId})
                  </h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {noteFormError && (
                <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-900 text-xs font-medium flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{noteFormError}</span>
                </div>
              )}

              <form onSubmit={handleCreateNote} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Physician / Attending Doctor Name
                  </label>
                  <input
                    type="text"
                    value={noteForm.doctorName}
                    onChange={(e) => setNoteForm({ ...noteForm, doctorName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Consultation Type
                  </label>
                  <select
                    value={noteForm.noteType}
                    onChange={(e) => setNoteForm({ ...noteForm, noteType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="routine_review">Routine Review</option>
                    <option value="urgent_consult">Urgent Consult</option>
                    <option value="therapy_adjustment">Therapy Adjustment (Lifestyle)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Clinical Assessment &amp; AGP Impression
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Document observations on Time-in-Range, overnight hypoglycemia patterns, postprandial glycemic excursions..."
                    value={noteForm.assessment}
                    onChange={(e) => setNoteForm({ ...noteForm, assessment: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Educational Recommendations (Lifestyle, Nutrition &amp; Physical Activity)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Dietary substitutions (low-GI foods), exercise timing, bedside glucose tablets, hydration... STRICTLY NO INSULIN TITRATION per ADR-007."
                    value={noteForm.recommendations}
                    onChange={(e) => setNoteForm({ ...noteForm, recommendations: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    required
                  />
                  <p className="text-[11px] text-amber-700 mt-1 font-semibold">
                    Notice: Direct insulin dosing prescriptions or pharmaceutical titration plans are strictly prohibited per healthcare safety guidelines.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingNote}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50"
                  >
                    {isSubmittingNote ? 'Saving...' : 'Save Consultation Note'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Clinical Simulation Disclaimer */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white text-xs text-slate-500 flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-slate-900">Healthcare Non-Medical Device Disclaimer</h4>
            <p className="mt-0.5">
              The GlucoGuard Ambulatory Glucose Profile (AGP) Portal is an educational and engineering simulation prototype. All metrics (TIR, GMI, CV, and percentiles) are derived from virtual patient telemetry. This system does NOT provide clinical diagnostic authority or medical prescriptions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClinicalAgpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 bg-slate-50 py-12 px-4 text-center">
          <div className="max-w-md mx-auto p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl inline-block">
              <Stethoscope className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Loading Clinical AGP Profile...</h3>
            <p className="text-xs text-slate-500">Preparing 24-hour ambulatory glucose calculations.</p>
          </div>
        </div>
      }
    >
      <ClinicalAgpContent />
    </Suspense>
  );
}
