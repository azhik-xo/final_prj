'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Siren,
  ShieldAlert,
  Volume2,
  VolumeX,
  Clock,
  CheckCircle2,
  Ambulance,
  PhoneCall,
  MapPin,
  AlertTriangle,
  X
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function EmergencyAlertModal({
  alert,
  onAcknowledge,
  onDismiss
}) {
  const [countdown, setCountdown] = useState(60);
  const [currentStage, setCurrentStage] = useState(1); // 1: Patient, 2: Caregiver, 3: EMS
  const [isMuted, setIsMuted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAction, setSelectedAction] = useState('consumed_15g_carbs');

  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);

  // Initialize countdown from alert if provided
  useEffect(() => {
    if (alert?.countdownSeconds) {
      setCountdown(alert.countdownSeconds);
    }
    if (alert?.stage) {
      setCurrentStage(alert.stage);
    }
  }, [alert]);

  // Web Audio API Synthetic Pulsing Chime
  const playAlertTone = useCallback(() => {
    if (isMuted || typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      // Pitch: 880 Hz alternating with 440 Hz for emergency siren effect
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio autoplay policy fallback
    }
  }, [isMuted]);

  // Pulsing sound loop every 2.5 seconds while alert is unacknowledged
  useEffect(() => {
    if (!alert || alert.status === 'acknowledged' || isMuted) return;

    playAlertTone();
    const soundInterval = setInterval(() => {
      playAlertTone();
    }, 2500);

    return () => clearInterval(soundInterval);
  }, [alert, isMuted, playAlertTone]);

  // 60-Second Countdown Timer with Auto-Escalation
  useEffect(() => {
    if (!alert || alert.status === 'acknowledged') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-escalate to Stage 2 and 3 when countdown hits 0
          handleAutoEscalate();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [alert]);

  const handleAutoEscalate = async () => {
    setCurrentStage(3);
    try {
      // Escalate to caregiver
      await fetch(`${API_BASE}/api/v1/alerts/escalate-caregiver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId: alert.alertId || alert._id })
      });

      // Dispatch simulated SOS
      await fetch(`${API_BASE}/api/v1/alerts/dispatch-sos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId: alert.alertId || alert._id,
          coords: { lat: 13.0827, lng: 80.2707 }
        })
      });
    } catch {
      // Offline fallback
    }
  };

  const handleConfirmSafe = async () => {
    setIsSubmitting(true);
    try {
      if (alert?.alertId || alert?._id) {
        await fetch(`${API_BASE}/api/v1/alerts/acknowledge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alertId: alert.alertId || alert._id,
            acknowledgedBy: 'patient',
            actionTaken: selectedAction
          })
        });
      }
      if (onAcknowledge) {
        onAcknowledge(selectedAction);
      }
    } catch {
      if (onAcknowledge) {
        onAcknowledge(selectedAction);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!alert) return null;

  const isCritical = alert.severity === 'CRITICAL';
  const isHypo = alert.alertType?.includes('HYPO') || alert.glucose < 70;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-2xl border-2 shadow-2xl overflow-hidden bg-white text-slate-900 transition-all ${
          isHypo ? 'border-rose-600' : 'border-amber-500'
        }`}
      >
        {/* Pulsing Emergency Header */}
        <div
          className={`px-6 py-4 flex items-center justify-between text-white ${
            isHypo
              ? 'bg-rose-600 animate-pulse'
              : 'bg-amber-600'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Siren className="w-6 h-6 text-white" />
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold opacity-90 block">
                {isCritical ? 'CRITICAL EMERGENCY PROTOCOL' : 'CLINICAL ALERT'}
              </span>
              <h2 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                {alert.title || (isHypo ? 'CRITICAL HYPOGLYCEMIA ALERT' : 'GLUCOSE CRISIS ALERT')}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute Siren' : 'Mute Siren'}
              className="p-1.5 rounded-lg bg-black/20 hover:bg-black/30 text-white transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className="p-1.5 rounded-lg bg-black/20 hover:bg-black/30 text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Glucose Readout & Countdown Gauge */}
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Current Glucose Reading
              </span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${
                  isHypo ? 'text-rose-600' : 'text-amber-600'
                }`}>
                  {alert.glucose}
                </span>
                <span className="text-sm font-bold text-slate-500">mg/dL</span>
                {alert.rateOfChange !== undefined && (
                  <span className="text-xs font-mono text-slate-500 ml-1">
                    ({alert.rateOfChange > 0 ? '+' : ''}{alert.rateOfChange} mg/dL/min)
                  </span>
                )}
              </div>
            </div>

            {/* Circular Countdown Display */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Escalation In
              </span>
              <div
                className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border-3 font-mono font-black ${
                  countdown <= 15
                    ? 'border-rose-600 text-rose-600 animate-ping'
                    : countdown <= 30
                    ? 'border-amber-500 text-amber-600'
                    : 'border-indigo-600 text-indigo-700'
                }`}
              >
                <span className="text-xl leading-none">{countdown}</span>
                <span className="text-[9px] font-sans font-bold">SEC</span>
              </div>
            </div>
          </div>

          {/* Action Guidance */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Immediate Action Protocol:
            </h4>
            <p className="text-xs text-slate-700 bg-rose-50/60 border border-rose-200 p-3 rounded-lg leading-relaxed">
              {alert.actionProtocol ||
                'Consume 15g to 20g of fast-acting simple carbohydrates (4 oz fruit juice, 3-4 glucose tablets) immediately. Recheck blood glucose in 15 minutes.'}
            </p>
          </div>

          {/* Multi-Stage Escalation Tracker Status */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <span className="font-semibold text-slate-700 block">
              Emergency Escalation Status:
            </span>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className={`p-2 rounded-lg border font-semibold ${
                currentStage >= 1
                  ? 'bg-rose-100 border-rose-300 text-rose-900'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}>
                Stage 1: Patient
              </div>
              <div className={`p-2 rounded-lg border font-semibold ${
                currentStage >= 2
                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}>
                Stage 2: Caregiver
              </div>
              <div className={`p-2 rounded-lg border font-semibold ${
                currentStage >= 3
                  ? 'bg-rose-600 border-rose-700 text-white'
                  : 'bg-white border-slate-200 text-slate-400'
              }`}>
                Stage 3: SOS EMS
              </div>
            </div>
          </div>

          {/* Action Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Confirm Action Taken:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSelectedAction('consumed_15g_carbs')}
                className={`p-2.5 rounded-lg border text-left font-medium transition-all ${
                  selectedAction === 'consumed_15g_carbs'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                Consumed 15g Fast Carbs
              </button>
              <button
                type="button"
                onClick={() => setSelectedAction('safe_rechecking')}
                className={`p-2.5 rounded-lg border text-left font-medium transition-all ${
                  selectedAction === 'safe_rechecking'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                I Am Safe / Rechecking
              </button>
            </div>
          </div>

          {/* Primary Acknowledge Button */}
          <div className="pt-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmSafe}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Canceling Escalation...' : 'I AM SAFE — ACKNOWLEDGE ALERT'}
            </button>
          </div>

          {/* Simulation Disclaimer Footer */}
          <p className="text-[10px] text-center text-slate-400 font-medium pt-1">
            SIMULATION ONLY: No actual emergency services (911/112) are contacted. Educational engineering prototype.
          </p>
        </div>
      </div>
    </div>
  );
}
