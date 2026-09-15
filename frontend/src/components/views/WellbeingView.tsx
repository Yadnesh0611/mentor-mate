"use client";

import React, { useEffect, useState, useRef } from 'react';
import { api, WellbeingStatusResponse, EmergencyResourcesResponse } from '@/lib/api';
import {
  Heart,
  Smile,
  Zap,
  Battery,
  BatteryCharging,
  BatteryLow,
  ShieldAlert,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  PhoneCall,
  Info,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Wind,
  ShieldCheck,
  Building,
  BrainCircuit,
  Compass
} from 'lucide-react';

interface Props {
  onNavigateToSchedule?: () => void;
}

export function WellbeingView({ onNavigateToSchedule }: Props) {
  const [status, setStatus] = useState<WellbeingStatusResponse | null>(null);
  const [resources, setResources] = useState<EmergencyResourcesResponse | null>(null);
  const [selectedState, setSelectedState] = useState<string>('focused');
  const [stressLevel, setStressLevel] = useState<number>(2.0);
  const [sleepHours, setSleepHours] = useState<number>(7.0);
  const [checkinSuccess, setCheckinSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Guided Breathing Animation State
  const [breathingMode, setBreathingMode] = useState<'sigh' | 'box'>('sigh');
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inhale1' | 'inhale2' | 'exhale' | 'hold1' | 'hold2'>('inhale1');
  const [breathSecondsLeft, setBreathSecondsLeft] = useState(90);
  const [cycleCount, setCycleCount] = useState(1);
  const [phaseInstruction, setPhaseInstruction] = useState('Press Start for Guided Breathing');

  const breathingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchWellbeingData();
  }, []);

  const fetchWellbeingData = async () => {
    try {
      setLoading(true);
      const [statusRes, resRes] = await Promise.all([
        api.getWellbeingStatus(),
        api.getEmergencyResources()
      ]);
      setStatus(statusRes);
      setResources(resRes);
      if (statusRes.latest_checkin) {
        setSelectedState(statusRes.latest_checkin.state);
        setStressLevel(statusRes.latest_checkin.stress_level);
        if (statusRes.latest_checkin.sleep_hours) {
          setSleepHours(statusRes.latest_checkin.sleep_hours);
        }
      }
    } catch (err) {
      console.error("Failed to load wellbeing data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.submitWellbeingCheckin({
        state: selectedState,
        stress_level: stressLevel,
        sleep_hours: sleepHours
      });
      setCheckinSuccess(true);
      await fetchWellbeingData();
      setTimeout(() => setCheckinSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to submit check-in:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Breathing Guide Loop
  useEffect(() => {
    if (!breathingActive) {
      if (breathingTimerRef.current) clearInterval(breathingTimerRef.current);
      return;
    }

    let currentPhase = 'inhale1';
    let phaseTime = 0;
    let totalSecs = breathingMode === 'sigh' ? 90 : 120;
    setBreathSecondsLeft(totalSecs);
    setCycleCount(1);

    const interval = setInterval(() => {
      phaseTime += 0.5;

      if (breathingMode === 'sigh') {
        // Physiological sigh: Inhale 1 (2.5s) -> Top-off Inhale (1.0s) -> Exhale (5.5s) = 9s cycle
        const cycleMod = phaseTime % 9;
        if (cycleMod < 2.5) {
          setBreathPhase('inhale1');
          setPhaseInstruction('Deep inhale through nose (80%)...');
        } else if (cycleMod < 3.5) {
          setBreathPhase('inhale2');
          setPhaseInstruction('Sharp top-off inhale to fill lungs!');
        } else {
          setBreathPhase('exhale');
          setPhaseInstruction('Slow, relaxed mouth exhale...');
        }
        setCycleCount(Math.floor(phaseTime / 9) + 1);
      } else {
        // Box breathing: Inhale 4s -> Hold 4s -> Exhale 4s -> Hold 4s = 16s cycle
        const cycleMod = phaseTime % 16;
        if (cycleMod < 4) {
          setBreathPhase('inhale1');
          setPhaseInstruction('Inhale slowly through nose (4s)...');
        } else if (cycleMod < 8) {
          setBreathPhase('hold1');
          setPhaseInstruction('Hold breath gently (4s)...');
        } else if (cycleMod < 12) {
          setBreathPhase('exhale');
          setPhaseInstruction('Exhale smoothly through mouth (4s)...');
        } else {
          setBreathPhase('hold2');
          setPhaseInstruction('Hold empty, stay calm (4s)...');
        }
        setCycleCount(Math.floor(phaseTime / 16) + 1);
      }

      setBreathSecondsLeft(prev => {
        if (prev <= 1) {
          setBreathingActive(false);
          setPhaseInstruction('Well done. Autonomic nervous system calmed.');
          return 0;
        }
        return prev - 0.5;
      });
    }, 500);

    breathingTimerRef.current = interval;
    return () => clearInterval(interval);
  }, [breathingActive, breathingMode]);

  const resetBreathing = () => {
    setBreathingActive(false);
    setBreathSecondsLeft(breathingMode === 'sigh' ? 90 : 120);
    setPhaseInstruction('Press Start for Guided Breathing');
    setCycleCount(1);
  };

  // Dynamic Visual Pacing Size for Breathing Circle
  const getCircleScale = () => {
    if (!breathingActive) return 'scale-100';
    if (breathPhase === 'inhale1') return 'scale-125 transition-all duration-2000 ease-out';
    if (breathPhase === 'inhale2') return 'scale-135 transition-all duration-700 ease-out';
    if (breathPhase === 'hold1' || breathPhase === 'hold2') return 'scale-125 transition-all duration-1000';
    if (breathPhase === 'exhale') return 'scale-90 transition-all duration-4000 ease-in-out';
    return 'scale-100';
  };

  const getCircleColor = () => {
    if (!breathingActive) return 'bg-stone-100 border-stone-200 text-stone-700';
    if (breathPhase === 'inhale1' || breathPhase === 'inhale2') return 'bg-sky-100 border-sky-300 text-sky-900';
    if (breathPhase === 'hold1' || breathPhase === 'hold2') return 'bg-amber-100 border-amber-300 text-amber-900';
    return 'bg-emerald-100 border-emerald-300 text-emerald-900';
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Header Banner */}
      <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-2 rounded-xl bg-stone-900 text-white shadow-2xs">
              <Heart className="w-5 h-5 text-rose-300" />
            </div>
            <h1 className="text-xl font-bold text-stone-900">Student Mental Well-Being & Burnout Shield</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800">
              Neurobiology-Backed
            </span>
          </div>
          <p className="text-xs text-stone-500 max-w-2xl leading-relaxed">
            High-pressure engineering campuses (BITS Pilani, IITs, NITs) create real cognitive fatigue and exam panic.
            Mentor Mate uses proven autonomic regulation and adaptive workload throttling to protect your health.
          </p>
        </div>

        {/* Current Burnout Risk Badge */}
        {status && (
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-right shrink-0">
            <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider block">
              Burnout Risk Indicator
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-md inline-block mt-1 ${
                status.burnout_risk === 'high'
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : status.burnout_risk === 'moderate'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              {status.burnout_risk.toUpperCase()} LOAD
            </span>
          </div>
        )}
      </div>

      {/* 2. Main Grid: Daily Check-In + Guided Breathing Tool */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Daily Energy & Pacing Check-in */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Daily Cognitive Energy Check-In</h3>
                <p className="text-[11px] text-stone-500">Mentor Mate dynamically adapts your study queue based on your state</p>
              </div>
              <div className="p-2 rounded-xl bg-stone-100 text-stone-700">
                <BrainCircuit className="w-4 h-4" />
              </div>
            </div>

            {checkinSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Pacing strategy updated! Your daily study schedule has been calibrated.</span>
              </div>
            )}

            <form onSubmit={handleCheckInSubmit} className="space-y-4">
              {/* Energy States */}
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-2">How are you feeling right now?</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'energized', label: '⚡ Energized', desc: 'Ready for deep challenges' },
                    { id: 'focused', label: '🎯 Focused', desc: 'Steady normal pace' },
                    { id: 'overwhelmed', label: '🌊 Overwhelmed', desc: 'Syllabus backlog panic' },
                    { id: 'exhausted', label: '🛑 Exhausted', desc: 'Severe cognitive fatigue' }
                  ].map(st => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedState(st.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedState === st.id
                          ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                          : 'bg-stone-50/70 hover:bg-stone-100 text-stone-800 border-stone-200/70'
                      }`}
                    >
                      <div className="text-xs font-bold">{st.label}</div>
                      <div className={`text-[10px] mt-0.5 ${selectedState === st.id ? 'text-stone-300' : 'text-stone-500'}`}>
                        {st.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stress Slider */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs font-medium text-stone-700">
                  <span>Current Academic Stress Level:</span>
                  <span className="font-bold text-stone-900">{stressLevel.toFixed(1)} / 5.0</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.5"
                  value={stressLevel}
                  onChange={(e) => setStressLevel(parseFloat(e.target.value))}
                  className="w-full accent-stone-900"
                />
                <div className="flex justify-between text-[10px] text-stone-400">
                  <span>1. Calm & In Control</span>
                  <span>3. Manageable</span>
                  <span>5. High Distress</span>
                </div>
              </div>

              {/* Sleep Hours Input */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700 block">Sleep Hours Last Night:</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="16"
                    step="0.5"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(parseFloat(e.target.value) || 0)}
                    className="w-24 px-3 py-1.5 text-xs rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:border-stone-500 text-stone-900 font-semibold"
                  />
                  <span className="text-[11px] text-stone-500">
                    {sleepHours < 6 ? '⚠️ Sleep debt directly reduces memory consolidation by up to 40%.' : '✓ Healthy restorative rest.'}
                  </span>
                </div>
              </div>

              {/* Adaptive Feedback */}
              {(selectedState === 'overwhelmed' || selectedState === 'exhausted' || stressLevel >= 4.0) && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="w-4 h-4 text-amber-700" />
                    <span>Automatic Backlog Protection Triggered</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-900">
                    Your daily study plan will compress into 2 critical topics only. No penalty streaks, zero backlog compounding.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-xs"
              >
                {submitting ? 'Updating Pacing...' : 'Record Status & Adapt Pacing'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Interactive Guided Breathing Reset */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-5 flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-stone-900">2-Minute Autonomic Reset</h3>
                <p className="text-[11px] text-stone-500">Stanford Neurobiology (Huberman Lab): Rapid parasympathetic calm</p>
              </div>

              {/* Protocol Switcher */}
              <div className="flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200">
                <button
                  onClick={() => { setBreathingMode('sigh'); resetBreathing(); }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    breathingMode === 'sigh' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500'
                  }`}
                >
                  Cyclic Sigh
                </button>
                <button
                  onClick={() => { setBreathingMode('box'); resetBreathing(); }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    breathingMode === 'box' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500'
                  }`}
                >
                  Box 4-4-4-4
                </button>
              </div>
            </div>

            {/* Visual Animated Breathing Circle */}
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative flex items-center justify-center">
                {/* Expanding circle */}
                <div
                  className={`w-36 h-36 rounded-full border-2 flex flex-col items-center justify-center p-4 shadow-sm ${getCircleScale()} ${getCircleColor()}`}
                >
                  <Wind className={`w-6 h-6 mb-1 ${breathingActive ? 'animate-pulse' : ''}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {breathingActive ? `Cycle ${cycleCount}` : 'Reset Ready'}
                  </span>
                  <span className="text-xs font-semibold">{Math.ceil(breathSecondsLeft)}s</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-bold text-stone-900 min-h-[20px] transition-all">
                  {phaseInstruction}
                </p>
                <p className="text-[10px] text-stone-500 max-w-xs mx-auto">
                  {breathingMode === 'sigh'
                    ? '2 quick nose inhales + 1 long slow mouth exhale'
                    : '4s Inhale • 4s Hold • 4s Exhale • 4s Hold'}
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setBreathingActive(!breathingActive)}
                  className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  {breathingActive ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Start Guided Reset</span>
                    </>
                  )}
                </button>

                <button
                  onClick={resetBreathing}
                  className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors"
                  title="Restart"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Verified Institutional Crisis Helplines & Advisory */}
      {resources && (
        <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-bold text-stone-900">Verified National & Student Support Helplines</h3>
            </div>
            <span className="text-[10px] font-semibold text-stone-500">24x7 Toll-Free & Confidential</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {resources.verified_helplines.map((hl, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-stone-50/70 border border-stone-200/80 hover:border-stone-300 transition-all flex flex-col justify-between space-y-2"
              >
                <div>
                  <h4 className="text-xs font-bold text-stone-900 truncate" title={hl.name}>{hl.name}</h4>
                  <p className="text-[10px] text-stone-500 mt-0.5">{hl.agency}</p>
                  <div className="mt-2 text-xs font-bold text-emerald-800 flex items-center gap-1">
                    <PhoneCall className="w-3 h-3" />
                    <span>{hl.contact}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-200/60 text-[10px] text-stone-400">
                  <span>{hl.availability} • {hl.languages}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Academic Clinical Disclaimer */}
          <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 text-[11px] text-stone-500 leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
            <span>
              <strong>Clinical Note:</strong> Mentor Mate provides cognitive study pacing, spaced memory scheduling, and evidence-based neurobiological relaxation guides. If you are experiencing acute distress, panic, or clinical depression, please reach out to professional counseling services or the national Tele-MANAS helpline (14416).
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
