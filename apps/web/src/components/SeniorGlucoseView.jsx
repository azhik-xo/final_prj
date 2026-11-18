'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Phone,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Minus,
  HeartHandshake,
  Sparkles,
  Clock,
  User,
  ShieldCheck,
  Activity,
  Languages
} from 'lucide-react';

/**
 * Categorizes glucose level into plain-language clinical status, bilingual voice scripts, and visual tokens.
 * @param {number|null} glucose
 */
function getSeniorGlucoseStatus(glucose) {
  if (glucose === null || glucose === undefined) {
    return {
      category: 'waiting',
      title: 'CONNECTING SENSOR...',
      subtitle: 'Please wait while we receive your latest sugar reading.',
      textColor: 'text-slate-700',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-300',
      haloColor: 'ring-slate-200',
      badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
      icon: Clock,
      voiceStatus: 'Connecting sensor. Stand by for your reading.',
      voiceTamil: () => 'சென்சார் சர்க்கரை அளவை இணைக்கிறது. காத்திருக்கவும்.',
      voiceTamilPhonetic: () => 'Sensor sugar alavai connect seigiradhu. Kaathirukkavum.'
    };
  }

  if (glucose < 54) {
    return {
      category: 'very_low',
      title: 'VERY LOW SUGAR — ACT IMMEDIATELY',
      subtitle: 'Your sugar is dangerously low. Have sweet juice or sugar now and call your family.',
      textColor: 'text-rose-700',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-400',
      haloColor: 'ring-rose-400/40',
      badgeBg: 'bg-rose-600 text-white border-rose-700 animate-pulse',
      icon: AlertTriangle,
      voiceStatus: 'Very low sugar warning! Your glucose is dangerously low. Please have sweet fruit juice or sugar immediately and sit down safely.',
      voiceTamil: (val) => `அவசர எச்சரிக்கை! சர்க்கரை அளவு அபாயகரமான மிகக் குறைவாக உள்ளது (${val}). உடனே இனிப்பு குடிக்கவும், குடும்பத்தினரை அழைக்கவும்.`,
      voiceTamilPhonetic: (val) => `Emergency warning! Sugar alavu romba kuraivaaga ulladhu (${val}). Udanae sweets saappidavum, kudumbathinarai azhaikkavum.`
    };
  }

  if (glucose < 70) {
    return {
      category: 'low',
      title: 'LOW SUGAR WARNING — HAVE SWEETS NOW',
      subtitle: 'Your sugar has dropped below safe levels. Please have 1/2 cup of juice or fruit.',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-400',
      haloColor: 'ring-red-400/30',
      badgeBg: 'bg-red-600 text-white border-red-700',
      icon: AlertTriangle,
      voiceStatus: 'Low sugar alert! Your glucose has dropped below normal. Please have half a cup of sweet juice or glucose tablets now and rest quietly.',
      voiceTamil: (val) => `எச்சரிக்கை! உங்கள் சர்க்கரை அளவு குறைவாக உள்ளது (${val}). உடனே அரை டம்ளர் பழச்சாறு அல்லது இனிப்பு சாக்லேட் சாப்பிடவும். அமைதியாக உட்காருங்கள், படிக்கட்டுகளில் ஏற வேண்டாம்.`,
      voiceTamilPhonetic: (val) => `Warning! Ungal sugar alavu kuraivaaga ulladhu (${val}). Udanae half glass fruit juice alladhu sweet saappidavum. Amaithiyaaga utkaarungal.`
    };
  }

  if (glucose <= 180) {
    return {
      category: 'safe',
      title: 'YOUR SUGAR IS HEALTHY & SAFE',
      subtitle: 'Everything looks great! Your sugar is right in the ideal safe target zone.',
      textColor: 'text-emerald-800',
      bgColor: 'bg-emerald-50/70',
      borderColor: 'border-emerald-300',
      haloColor: 'ring-emerald-400/25',
      badgeBg: 'bg-emerald-600 text-white border-emerald-700',
      icon: CheckCircle2,
      voiceStatus: 'Your sugar is in the healthy safe zone. Keep up your normal routine and stay hydrated.',
      voiceTamil: (val) => `உங்கள் சர்க்கரை அளவு ${val}. இது சரியான மற்றும் ஆரோக்கியமான பாதுகாப்பான அளவில் உள்ளது. சர்க்கரை அளவு சீராக உள்ளது. ஒரு டம்ளர் நல்ல தண்ணீர் குடிக்கவும்.`,
      voiceTamilPhonetic: (val) => `Ungal sugar alavu ${val}. Idhu sariyaana safe zone-il ulladhu. Sugar calm and steady-aaga ulladhu. Oru glass thanneer kudiyungal.`
    };
  }

  if (glucose <= 250) {
    return {
      category: 'high',
      title: 'HIGH SUGAR ALERT — DRINK WATER & REST',
      subtitle: 'Your sugar is higher than usual. Drink a large glass of water and rest comfortably.',
      textColor: 'text-amber-800',
      bgColor: 'bg-amber-50/70',
      borderColor: 'border-amber-300',
      haloColor: 'ring-amber-400/30',
      badgeBg: 'bg-amber-600 text-white border-amber-700',
      icon: AlertCircle,
      voiceStatus: 'High sugar alert. Your sugar is elevated. Please drink a glass of fresh water, avoid sweets, and rest quietly.',
      voiceTamil: (val) => `கவனிக்கவும்! சர்க்கரை அளவு அதிகமாக உள்ளது (${val}). ஒன்று அல்லது இரண்டு டம்ளர் தண்ணீர் குடிக்கவும். இனிப்பு உணவுகளை தவிர்க்கவும், அமைதியாக ஓய்வெடுக்கவும்.`,
      voiceTamilPhonetic: (val) => `Kavanikkavum! Ungal sugar alavu adhiga-maaga ulladhu (${val}). Rendu glass thanneer kudiyungal. Sweets thavirkkavum, nandraaga rest edukkavum.`
    };
  }

  return {
    category: 'very_high',
    title: 'VERY HIGH SUGAR — REST & HYDRATE',
    subtitle: 'Your sugar is very high. Drink water, avoid carbohydrates, and contact your caregiver.',
    textColor: 'text-rose-800',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-400',
    haloColor: 'ring-rose-400/40',
    badgeBg: 'bg-rose-600 text-white border-rose-700 animate-pulse',
    icon: AlertCircle,
    voiceStatus: 'Very high sugar alert. Your glucose is significantly high. Drink plenty of fresh water and notify your caregiver.',
    voiceTamil: (val) => `எச்சரிக்கை! சர்க்கரை அளவு மிக அதிகமாக உள்ளது (${val}). நிறைய தண்ணீர் குடித்து ஓய்வெடுக்கவும், குடும்பத்தினருக்கு தெரிவிக்கவும்.`,
    voiceTamilPhonetic: (val) => `Warning! Sugar alavu romba adhiga-maaga ulladhu (${val}). Nariya thanneer kudithu rest edukkavum, family-ku theriya-paduthavum.`
  };
}

/**
 * Plain-language trend interpreter with bilingual narration text.
 * @param {number} rateOfChange
 * @param {string} trend
 */
function getSeniorTrend(rateOfChange, trend) {
  const roc = Number(rateOfChange || 0);

  if (roc <= -2.0) {
    return {
      text: 'Sugar is dropping quickly',
      detail: 'Falling fast — keep juice or sweets nearby',
      icon: ArrowDown,
      iconColor: 'text-rose-600 bg-rose-100',
      voiceText: 'Your sugar is dropping quickly.',
      voiceTamil: 'சர்க்கரை அளவு வேகமாக குறைகிறது.',
      voiceTamilPhonetic: 'Sugar alavu vegamaaga kuraigiradhu.'
    };
  }
  if (roc < -0.6) {
    return {
      text: 'Sugar is gently going down',
      detail: 'Gradual downward direction',
      icon: ArrowDown,
      iconColor: 'text-blue-600 bg-blue-100',
      voiceText: 'Your sugar is going down slowly.',
      voiceTamil: 'சர்க்கரை அளவு மெதுவாக குறைகிறது.',
      voiceTamilPhonetic: 'Sugar alavu medhuvaaga kuraigiradhu.'
    };
  }
  if (roc <= 0.6) {
    return {
      text: 'Sugar is calm and steady',
      detail: 'Stable without major changes',
      icon: Minus,
      iconColor: 'text-emerald-600 bg-emerald-100',
      voiceText: 'Your sugar is calm and steady.',
      voiceTamil: 'சர்க்கரை அளவு சீராக உள்ளது.',
      voiceTamilPhonetic: 'Sugar alavu seeraaga ulladhu.'
    };
  }
  if (roc <= 2.0) {
    return {
      text: 'Sugar is gently rising',
      detail: 'Gradual upward direction',
      icon: ArrowUp,
      iconColor: 'text-amber-600 bg-amber-100',
      voiceText: 'Your sugar is rising slowly.',
      voiceTamil: 'சர்க்கரை அளவு மெதுவாக உயர்கிறது.',
      voiceTamilPhonetic: 'Sugar alavu medhuvaaga uyar-giradhu.'
    };
  }
  return {
    text: 'Sugar is rising after food',
    detail: 'Climbing quickly — sip water and relax',
    icon: ArrowUp,
    iconColor: 'text-amber-700 bg-amber-100',
    voiceText: 'Your sugar is rising rapidly after food or activity.',
    voiceTamil: 'சர்க்கரை அளவு வேகமாக உயர்கிறது.',
    voiceTamilPhonetic: 'Sugar alavu vegamaaga uyar-giradhu.'
  };
}

/**
 * 3-step action checklist tailored to the patient's current sugar reading.
 * @param {string} category
 */
function getActionChecklist(category) {
  if (category === 'very_low' || category === 'low') {
    return [
      {
        step: 1,
        title: 'Have Fast Sugar Immediately',
        text: 'Drink 1/2 cup (120 ml) of sweet fruit juice or regular soda, or chew 3 to 4 glucose candies right now.'
      },
      {
        step: 2,
        title: 'Sit Down and Rest',
        text: 'Sit comfortably in a sturdy armchair. Please do not stand, walk stairs, or do any chores until you feel better.'
      },
      {
        step: 3,
        title: 'Check Again in 15 Minutes',
        text: 'Wait 15 minutes for your sugar to rise. If your reading stays below 70, have another sip of juice and call family.'
      }
    ];
  }

  if (category === 'high' || category === 'very_high') {
    return [
      {
        step: 1,
        title: 'Drink 1 to 2 Glasses of Fresh Water',
        text: 'Drinking clean plain water helps your body flush excess sugar safely and keeps you well hydrated.'
      },
      {
        step: 2,
        title: 'Avoid Sweets, Rice, and Soda',
        text: 'Do not eat sweet snacks, white bread, or sugary drinks until your sugar returns into the safe green zone.'
      },
      {
        step: 3,
        title: 'Relax and Notify Family if Needed',
        text: 'Rest quietly in a cool room. If your sugar stays high for over an hour, press the caregiver call button below.'
      }
    ];
  }

  return [
    {
      step: 1,
      title: 'Keep Up Your Healthy Routine',
      text: 'Your blood sugar is right where doctors want it to be. Continue taking your daily medications on schedule.'
    },
    {
      step: 2,
      title: 'Drink a Glass of Fresh Water',
      text: 'Staying hydrated keeps your energy up and supports your body throughout the day.'
    },
    {
      step: 3,
      title: 'Enjoy Your Regular Meals on Time',
      text: 'Eat your balanced meals and snacks at your customary times to maintain this wonderful steady sugar balance.'
    }
  ];
}

export default function SeniorGlucoseView({ reading, prediction, persona }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callStatus, setCallStatus] = useState(null);
  const [voiceLang, setVoiceLang] = useState('en'); // 'en' | 'ta'
  const [availableVoices, setAvailableVoices] = useState([]);
  const [hasNativeTamilVoice, setHasNativeTamilVoice] = useState(false);
  const [nativeTamilVoice, setNativeTamilVoice] = useState(null);

  // Restore voice language preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('glucoguard_voice_lang');
      if (savedLang === 'ta' || savedLang === 'en') {
        setVoiceLang(savedLang);
      }
    }
  }, []);

  const handleToggleVoiceLang = (lang) => {
    setVoiceLang(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('glucoguard_voice_lang', lang);
    }
  };

  // Asynchronous Voice Hydration & Detection
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const detectVoices = () => {
      const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
      setAvailableVoices(voices);

      const found = voices.find((v) => {
        const lang = (v.lang || '').toLowerCase();
        const name = (v.name || '').toLowerCase();
        return (
          lang === 'ta-in' ||
          lang === 'ta_in' ||
          lang.startsWith('ta') ||
          name.includes('tamil') ||
          name.includes('தமிழ்')
        );
      });

      if (found) {
        setHasNativeTamilVoice(true);
        setNativeTamilVoice(found);
      } else {
        setHasNativeTamilVoice(false);
        setNativeTamilVoice(null);
      }
    };

    detectVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = detectVoices;
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const glucose = reading ? reading.glucose : null;
  const roundedGlucose = glucose !== null ? Math.round(glucose) : null;
  const status = getSeniorGlucoseStatus(glucose);
  const trend = getSeniorTrend(reading?.rateOfChange, reading?.trend);
  const checklist = getActionChecklist(status.category);

  // Simplified AI forecast translation
  const aiForecastText = useMemo(() => {
    if (!prediction || !prediction.predictions || prediction.predictions.length === 0) {
      return 'AI Forecast: Monitoring your sugar patterns to predict your 30-minute outlook.';
    }

    const pred30 = prediction.predictions.find((p) => p.minutesAhead === 30) || prediction.predictions[0];
    const projectedVal = Math.round(pred30.projectedGlucose);

    if (prediction.breachWarning?.breachPredicted) {
      if (prediction.breachWarning.type === 'hypoglycemia') {
        const mins = prediction.breachWarning.estimatedTimeToBreachMinutes
          ? Math.round(prediction.breachWarning.estimatedTimeToBreachMinutes)
          : 20;
        return `AI Warning: Sugar projected to drop towards low levels (${projectedVal} mg/dL) in ~${mins} minutes. Keep fruit juice nearby.`;
      }
      return `AI Advisory: Sugar projected to climb towards ${projectedVal} mg/dL over the next 30 minutes. Sip fresh water and relax.`;
    }

    if (projectedVal < 70) {
      return `AI Forecast: Sugar may dip towards ${projectedVal} mg/dL in 30 minutes. Keep a sweet snack close by.`;
    }
    if (projectedVal > 180) {
      return `AI Forecast: Sugar expected to reach ~${projectedVal} mg/dL in 30 minutes. Stay hydrated and rest.`;
    }
    return `AI Forecast: Sugar projected to stay safe around ${projectedVal} mg/dL over the next 30 minutes.`;
  }, [prediction]);

  // Traffic light gauge pointer calculation (normalized 40 mg/dL to 300 mg/dL)
  const gaugePercent = useMemo(() => {
    if (glucose === null || glucose === undefined) return 50;
    const clamped = Math.max(40, Math.min(300, glucose));
    return ((clamped - 40) / (300 - 40)) * 100;
  }, [glucose]);

  // Multi-Tier Resilient TTS Audio Synthesis (English, Native Tamil & Universal Phonetic Tanglish)
  const handleSpeak = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert('Speech synthesis is not supported on this browser.');
      return;
    }

    // Chrome audio state recovery (unblock pipeline)
    window.speechSynthesis.cancel();
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    if (isSpeaking) {
      setIsSpeaking(false);
      return;
    }

    const val = roundedGlucose !== null ? `${roundedGlucose}` : '';

    const executeUtterance = (text, lang, rate, voice = null, isFallback = false) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.pitch = 1.0;
        if (voice) {
          utterance.voice = voice;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (e) => {
          console.warn('[SpeechSynthesis Error]', e);
          setIsSpeaking(false);
          // Tier 4: Automatic retry with phonetic Tanglish if native Tamil failed
          if (!isFallback && voiceLang === 'ta') {
            console.info('[SpeechSynthesis] Retrying with universal phonetic voice...');
            const phoneticStatus = status.voiceTamilPhonetic ? status.voiceTamilPhonetic(val) : '';
            const phoneticTrend = trend.voiceTamilPhonetic || '';
            const fallbackText = `${phoneticStatus} ${phoneticTrend}`.trim();
            executeUtterance(fallbackText, 'en-US', 0.82, null, true);
          }
        };

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('[SpeechSynthesis Trigger Error]', err);
        setIsSpeaking(false);
      }
    };

    if (voiceLang === 'ta') {
      if (hasNativeTamilVoice && nativeTamilVoice) {
        // Tier 2: Native Tamil voice detected and bound
        const tamilStatusText = status.voiceTamil ? status.voiceTamil(val) : '';
        const tamilTrendText = trend.voiceTamil || '';
        const textToSpeak = `${tamilStatusText} ${tamilTrendText}`.trim();
        executeUtterance(textToSpeak, 'ta-IN', 0.85, nativeTamilVoice, false);
      } else {
        // Tier 3: Universal Phonetic Tamil (Tanglish) for standard Windows/Mac without Tamil TTS
        const phoneticStatus = status.voiceTamilPhonetic ? status.voiceTamilPhonetic(val) : '';
        const phoneticTrend = trend.voiceTamilPhonetic || '';
        const textToSpeak = `${phoneticStatus} ${phoneticTrend}`.trim();
        executeUtterance(textToSpeak, 'en-US', 0.82, null, true);
      }
    } else {
      // English Voice Readout
      const glucosePhrase = roundedGlucose !== null
        ? `Your current glucose reading is ${roundedGlucose} milligrams per deciliter.`
        : 'Sensor reading is currently standing by.';
      const textToSpeak = `${glucosePhrase} ${status.voiceStatus} ${trend.voiceText} ${checklist[0].title}: ${checklist[0].text}`;
      executeUtterance(textToSpeak, 'en-US', 0.88, null, false);
    }
  }, [roundedGlucose, status, trend, checklist, voiceLang, hasNativeTamilVoice, nativeTamilVoice, isSpeaking]);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Handle caregiver call simulation
  const handleSimulateCall = () => {
    setCallStatus('Connecting call to Sarah (Daughter)...');
    setTimeout(() => {
      setCallStatus('Simulated Call Connected: Sarah has been alerted of your sugar reading.');
      setTimeout(() => setCallStatus(null), 5000);
    }, 1500);
  };

  const StatusIcon = status.icon;
  const TrendIcon = trend.icon;

  return (
    <div className="space-y-6 mb-8">
      {/* 1. Senior Mode Header & Active Persona Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider uppercase text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  Senior &amp; Elder Accessibility View
                </span>
                <span className="text-xs text-slate-400 font-mono">ADR-008</span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                Easy-Read Sugar Monitor for {persona?.name ? persona.name.split('(')[0].trim() : 'Patient'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-600 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>Continuous Wireless Sensor: <strong>Active</strong></span>
          </div>
        </div>

        {/* 2. Giant Typography Glucose Display */}
        <div className={`mt-6 rounded-3xl border-2 p-6 sm:p-10 transition-all ${status.bgColor} ${status.borderColor} ring-8 ${status.haloColor} text-center`}>
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-extrabold uppercase tracking-wide shadow-sm border mb-4 ${status.badgeBg}">
            <StatusIcon className="w-4 h-4 shrink-0" />
            <span>{status.title}</span>
          </div>

          {/* Giant Number */}
          <div className="my-2 flex items-baseline justify-center gap-3 flex-wrap">
            <span
              data-testid="senior-glucose-value"
              className={`text-8xl sm:text-9xl md:text-[10rem] font-black tracking-tighter font-sans leading-none ${status.textColor}`}
            >
              {roundedGlucose !== null ? roundedGlucose : '--'}
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-600">
              mg/dL
            </span>
          </div>

          <p className="text-sm sm:text-base font-semibold text-slate-700 max-w-xl mx-auto mt-2">
            {status.subtitle}
          </p>

          <div className="mt-4 text-xs sm:text-sm text-slate-500 font-medium">
            Last checked: {reading?.timestamp ? new Date(reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Live'} · <span className="font-semibold text-emerald-800">source: simulation</span>
          </div>
        </div>

        {/* 3. Visual 3-Zone Traffic Light Gauge Bar */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">
              Visual Sugar Safety Gauge
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-600">
              Target Zone: <strong className="text-emerald-700">70 to 180 mg/dL</strong>
            </span>
          </div>

          {/* Gauge Bar */}
          <div className="relative pt-4 pb-2">
            {/* The Pointer Indicator */}
            <div
              className="absolute top-0 transition-all duration-500 ease-out -translate-x-1/2 flex flex-col items-center z-10"
              style={{ left: `${gaugePercent}%` }}
              data-testid="senior-gauge-pointer"
            >
              <div className="bg-slate-900 text-white text-[11px] font-extrabold px-2 py-0.5 rounded-md shadow-md whitespace-nowrap">
                {roundedGlucose !== null ? `${roundedGlucose} mg/dL` : 'Waiting'}
              </div>
              <div className="w-0 h-0 border-x-4 border-x-transparent border-t-6 border-t-slate-900 mt-0.5" />
            </div>

            {/* 3 Color Track Segments */}
            <div className="h-6 rounded-2xl overflow-hidden flex border border-slate-300 shadow-inner bg-slate-100">
              {/* Red Zone: Low <70 (represents 40-70 = 30/260 ~ 11.5%) */}
              <div className="w-[15%] bg-rose-500 flex items-center justify-center text-[10px] font-black text-white" title="Low Sugar: Under 70">
                LOW
              </div>
              {/* Green Zone: Safe 70-180 (represents 70-180 = 110/260 ~ 42.3%) */}
              <div className="w-[45%] bg-emerald-500 flex items-center justify-center text-[10px] font-black text-white" title="Healthy Safe Zone: 70 to 180">
                HEALTHY SAFE ZONE
              </div>
              {/* Amber Zone: High >180 (represents 180-300 = 120/260 ~ 46.2%) */}
              <div className="w-[40%] bg-amber-500 flex items-center justify-center text-[10px] font-black text-white" title="High Sugar: Over 180">
                HIGH
              </div>
            </div>

            {/* Threshold Labels */}
            <div className="flex justify-between text-[11px] font-bold text-slate-500 mt-2 px-1">
              <span>40 (Very Low)</span>
              <span className="text-rose-600">70 mg/dL</span>
              <span className="text-emerald-700">120 mg/dL (Ideal)</span>
              <span className="text-amber-600">180 mg/dL</span>
              <span>300+ (High)</span>
            </div>
          </div>
        </div>

        {/* 4. Plain-Language Trend & Resilient Audio Voice Readout Bar (TASK-M3-VOICE-FIX) */}
        <div className="mt-8 p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${trend.iconColor}`}>
              <TrendIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-slate-500">
                Sugar Movement Direction
              </div>
              <div className="text-base sm:text-lg font-extrabold text-slate-900">
                {trend.text}
              </div>
              <div className="text-xs text-slate-600">
                {trend.detail}
              </div>
            </div>
          </div>

          {/* Bilingual Voice Switcher & Large Audio Readout Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Language toggle: English vs தமிழ் */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="inline-flex rounded-2xl border border-slate-300 p-1 bg-white shadow-2xs items-center">
                <div className="px-2 text-slate-500 flex items-center gap-1.5 text-xs font-semibold">
                  <Languages className="w-4 h-4 text-indigo-600" />
                  <span className="hidden sm:inline">Voice:</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleVoiceLang('en')}
                  data-testid="toggle-voice-en"
                  aria-pressed={voiceLang === 'en'}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    voiceLang === 'en'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleVoiceLang('ta')}
                  data-testid="toggle-voice-ta"
                  aria-pressed={voiceLang === 'ta'}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    voiceLang === 'ta'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  தமிழ் (Tamil)
                </button>
              </div>

              {/* Status Indicator for Tamil Voice Mode */}
              {voiceLang === 'ta' && (
                <div
                  data-testid="tamil-voice-mode-badge"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-600"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${hasNativeTamilVoice ? 'bg-emerald-500' : 'bg-indigo-500'} animate-pulse`} />
                  <span>{hasNativeTamilVoice ? 'Native HD Voice' : 'Universal Voice Active'}</span>
                </div>
              )}
            </div>

            {/* Large Audio Voice Readout Button */}
            <button
              type="button"
              onClick={handleSpeak}
              data-testid="senior-voice-readout-button"
              aria-label={
                voiceLang === 'ta'
                  ? 'சர்க்கரை அளவை தமிழில் கேட்க'
                  : 'Listen to your current sugar reading and advice spoken aloud'
              }
              className={`inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm sm:text-base shadow-sm hover:shadow transition-all ${
                isSpeaking
                  ? 'bg-rose-600 hover:bg-rose-700 text-white ring-4 ring-rose-200'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white ring-4 ring-indigo-100'
              }`}
            >
              {isSpeaking ? (
                <>
                  <VolumeX className="w-5 h-5 shrink-0" />
                  <span>{voiceLang === 'ta' ? 'குரலை நிறுத்தவும்' : 'Stop Audio Voice'}</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-5 h-5 shrink-0" />
                  <span>
                    {voiceLang === 'ta'
                      ? 'சர்க்கரை அளவை தமிழில் கேட்க (Voice Readout)'
                      : 'Listen to Sugar Status (Voice Readout)'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 5. Simplified Plain-Language AI Forecast Summary */}
      <div className="bg-gradient-to-r from-indigo-50/80 via-purple-50/80 to-blue-50/80 rounded-3xl border border-indigo-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-white border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0 shadow-2xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                Simple AI 30-Minute Sugar Outlook
              </h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 font-mono">
                Predictive AI Guard
              </span>
            </div>
            <p className="text-sm sm:text-base text-slate-800 font-semibold mt-1 leading-relaxed">
              {aiForecastText}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Our AI forecaster continuously checks your readings to anticipate highs or lows before they happen.
            </p>
          </div>
        </div>
      </div>

      {/* 6. Actionable Checklist: "What Should I Do Right Now?" */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-100">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          <h3 className="text-lg sm:text-xl font-bold text-slate-900">
            What Should I Do Right Now? (3 Simple Steps)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {checklist.map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 flex flex-col justify-between hover:bg-slate-50 transition-colors"
            >
              <div>
                <div className="h-8 w-8 rounded-full bg-slate-900 text-white font-black text-sm flex items-center justify-center mb-3">
                  {item.step}
                </div>
                <h4 className="text-base font-extrabold text-slate-900 mb-1">
                  {item.title}
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                  {item.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Primary Family & Caregiver Contact Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Family &amp; Caregiver Support
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                Primary Contact: Sarah (Daughter)
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Phone: <strong className="text-slate-900 font-mono">+91 98765 43210</strong> · Available 24/7
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2">
            <button
              type="button"
              onClick={handleSimulateCall}
              data-testid="senior-caregiver-call-button"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all"
            >
              <Phone className="w-4 h-4 fill-current" />
              <span>Call Sarah for Help</span>
            </button>
            <span className="text-[11px] text-slate-400">
              Simulated Caregiver Assistance
            </span>
          </div>
        </div>

        {callStatus && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{callStatus}</span>
          </div>
        )}
      </div>

      {/* 8. Mandatory Non-Clinical Simulation Notice per ADR-007 */}
      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 text-amber-950 text-xs leading-relaxed flex items-start gap-3 shadow-2xs">
        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Non-Clinical Simulation Prototype Notice (ADR-007):</strong> This interface is an educational engineering simulation. Simulated telemetry values must not be used to administer medication, alter insulin regimens, or replace certified clinical healthcare advice.
        </div>
      </div>
    </div>
  );
}
