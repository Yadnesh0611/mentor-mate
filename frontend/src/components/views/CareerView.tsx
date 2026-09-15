"use client";

import React, { useEffect, useState } from 'react';
import { api, IndustryTrack, CareerReadinessResponse } from '@/lib/api';
import {
  Briefcase,
  Building2,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Target,
  FileCode,
  Layers,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  BookOpen
} from 'lucide-react';

interface Props {
  onNavigateToStudy?: () => void;
}

export function CareerView({ onNavigateToStudy }: Props) {
  const [tracks, setTracks] = useState<IndustryTrack[]>([]);
  const [selectedTrackId, setSelectedTrackId] = useState<string>('google_swe');
  const [readiness, setReadiness] = useState<CareerReadinessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTracksAndReadiness(selectedTrackId);
  }, [selectedTrackId]);

  const fetchTracksAndReadiness = async (trackId: string) => {
    try {
      setLoading(true);
      setError(null);
      const [tracksData, readinessData] = await Promise.all([
        api.getIndustryTracks(),
        api.getCareerReadiness(trackId)
      ]);
      setTracks(tracksData.tracks);
      setReadiness(readinessData);
    } catch (err: any) {
      setError(err.message || 'Failed to load industry benchmarks');
    } finally {
      setLoading(false);
    }
  };

  const selectedTrack = tracks.find(t => t.id === selectedTrackId) || readiness?.track;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-2 rounded-xl bg-stone-900 text-white shadow-2xs">
              <Briefcase className="w-5 h-5 text-amber-300" />
            </div>
            <h1 className="text-xl font-bold text-stone-900">Industry Career Compass</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
              Verified Hiring Rubrics
            </span>
          </div>
          <p className="text-xs text-stone-500 max-w-2xl leading-relaxed">
            Discover what Google, Amazon, Microsoft, and top quant firms demand in technical interview rounds.
            We map your actual syllabus mastery against real industry hiring bars.
          </p>
        </div>

        {/* Company Quick Track Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {tracks.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTrackId(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border shrink-0 ${
                selectedTrackId === t.id
                  ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                  : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
              }`}
            >
              <span>{t.company}</span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {/* 2. Main Company Track Breakdown & Live Readiness Radar */}
      {selectedTrack && readiness && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Target Company Profile & Hiring Criteria */}
          <div className="lg:col-span-7 space-y-6">
            {/* Company Profile Card */}
            <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-stone-700" />
                    <h2 className="text-base font-bold text-stone-900">{selectedTrack.company}</h2>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-stone-700">
                      {selectedTrack.difficulty_tier} Bar
                    </span>
                  </div>
                  <p className="text-xs font-medium text-stone-600 mt-0.5">{selectedTrack.role}</p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-stone-400 font-medium block">Benchmark Bar</span>
                  <span className="text-sm font-bold text-stone-900">{readiness.hiring_bar_threshold}% Mastery</span>
                </div>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed bg-stone-50/80 p-3.5 rounded-xl border border-stone-200/60">
                {selectedTrack.summary}
              </p>

              {/* Hiring Criteria Weights */}
              <div className="space-y-3 pt-1">
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-stone-500" />
                  <span>Interview Weightage & Topic Focus</span>
                </h3>

                <div className="space-y-2.5">
                  {selectedTrack.hiring_criteria.map((crit, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-stone-200/80 bg-white hover:border-stone-300 transition-all space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-stone-800">
                        <span>{crit.domain}</span>
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-bold">
                          {crit.weight_percent}%
                        </span>
                      </div>
                      <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-stone-900 h-full rounded-full"
                          style={{ width: `${crit.weight_percent}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-stone-500">{crit.focus}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verified Interviewer Rubric Insight */}
              <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Lightbulb className="w-4 h-4 text-amber-700" />
                  <span>Real Engineering Rubric Tip for {selectedTrack.company}</span>
                </div>
                <p className="text-xs leading-relaxed text-amber-900">
                  {selectedTrack.interviewer_tip}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Live Student Readiness & Skill Gap Analysis */}
          <div className="lg:col-span-5 space-y-6">
            {/* Readiness Score Card */}
            <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Your Company Readiness</h3>
                  <p className="text-[11px] text-stone-500">Calculated from your diagnostic quizzes & notes</p>
                </div>
                <div className="p-2 rounded-xl bg-amber-50 text-amber-800">
                  <Award className="w-5 h-5" />
                </div>
              </div>

              <div className="text-center p-5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
                <div className="text-4xl font-black text-stone-900 tracking-tight">
                  {readiness.readiness_score}%
                </div>
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold">
                  {readiness.is_interview_ready ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Ready for {selectedTrack.company} Bar
                    </span>
                  ) : (
                    <span className="text-amber-700 flex items-center gap-1">
                      <Zap className="w-4 h-4" /> Target: Reach 85% Benchmark
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-500 max-w-xs mx-auto">
                  {readiness.recommended_action}
                </p>
              </div>

              {/* Topic-by-Topic Skill Gaps */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Rubric Topic Mastery
                </h4>

                <div className="space-y-2">
                  {readiness.skill_gaps.map((gap, idx) => {
                    const isReady = gap.status === 'Ready';
                    const isDev = gap.status === 'Developing';

                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-stone-900 block truncate">{gap.topic}</span>
                          <span className="text-[10px] text-stone-500">
                            Current: <strong className="text-stone-800">{gap.current_mastery}%</strong> / Req: {gap.required_benchmark}%
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                            isReady
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isDev
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {gap.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              {onNavigateToStudy && (
                <button
                  onClick={onNavigateToStudy}
                  className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Practice High-Yield Topics Now</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
