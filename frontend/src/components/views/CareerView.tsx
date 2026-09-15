"use client";

import React, { useEffect, useState, useMemo } from 'react';
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
  BookOpen,
  Search,
  Filter,
  Check,
  Compass
} from 'lucide-react';

interface Props {
  onNavigateToStudy?: () => void;
}

export function CareerView({ onNavigateToStudy }: Props) {
  const [tracks, setTracks] = useState<IndustryTrack[]>([]);
  const [sectors, setSectors] = useState<string[]>(['All']);
  const [selectedSector, setSelectedSector] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTrackId, setSelectedTrackId] = useState<string>('google_swe');
  const [readiness, setReadiness] = useState<CareerReadinessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load initial track catalog
  useEffect(() => {
    fetchInitialTracks();
  }, []);

  // Fetch readiness whenever selectedTrackId changes
  useEffect(() => {
    if (selectedTrackId) {
      fetchReadiness(selectedTrackId);
    }
  }, [selectedTrackId]);

  const fetchInitialTracks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getIndustryTracks();
      setTracks(data.tracks);
      if (data.sectors && data.sectors.length > 0) {
        setSectors(data.sectors);
      }
      if (data.tracks.length > 0 && !selectedTrackId) {
        setSelectedTrackId(data.tracks[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load industry benchmarks');
    } finally {
      setLoading(false);
    }
  };

  const fetchReadiness = async (trackId: string) => {
    try {
      const readinessData = await api.getCareerReadiness(trackId);
      setReadiness(readinessData);
    } catch (err: any) {
      console.error('Failed to calculate readiness:', err);
    }
  };

  // Filtered tracks based on sector and search query
  const filteredTracks = useMemo(() => {
    return tracks.filter(t => {
      const matchSector = selectedSector === 'All' || t.sector?.toLowerCase() === selectedSector.toLowerCase();
      if (!matchSector) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.company.toLowerCase().includes(q) ||
        t.role.toLowerCase().includes(q) ||
        (t.sector && t.sector.toLowerCase().includes(q)) ||
        t.key_topics.some(top => top.toLowerCase().includes(q)) ||
        t.hiring_criteria.some(c => c.domain.toLowerCase().includes(q) || c.focus.toLowerCase().includes(q))
      );
    });
  }, [tracks, selectedSector, searchQuery]);

  const selectedTrack = tracks.find(t => t.id === selectedTrackId) || readiness?.track || tracks[0];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="p-2 rounded-xl bg-stone-900 text-white shadow-2xs">
                <Compass className="w-5 h-5 text-amber-300" />
              </div>
              <h1 className="text-xl font-bold text-stone-900">Industry Career Compass & Hiring Rubrics</h1>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
                Top 100+ Enterprise Rubrics
              </span>
            </div>
            <p className="text-xs text-stone-500 max-w-3xl leading-relaxed">
              Explore authentic hiring bars across Big Tech, Quant/HFT, AI Research Labs, Cloud Infra, Cybersecurity, Semiconductors, and High-Growth Unicorns. We calibrate your actual syllabus mastery against real technical interview rounds.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Sectors</span>
              <span className="text-sm font-bold text-stone-900">{sectors.length - 1} Fields</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Companies</span>
              <span className="text-sm font-bold text-stone-900">{tracks.length} Top Rubrics</span>
            </div>
          </div>
        </div>

        {/* 2. Search & Sector Navigation Bar */}
        <div className="pt-2 border-t border-stone-100 flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full md:w-80 shrink-0">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company, role, skill (e.g. CUDA, DP, Rust, OS)..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-50/80 border border-stone-200 text-stone-900 text-xs placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-[10px] text-stone-400 hover:text-stone-700"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sector Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 scrollbar-none">
            {sectors.map((sec) => {
              const isSelected = selectedSector.toLowerCase() === sec.toLowerCase();
              return (
                <button
                  key={sec}
                  onClick={() => setSelectedSector(sec)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border shrink-0 ${
                    isSelected
                      ? 'bg-stone-900 text-white border-stone-900 shadow-2xs font-semibold'
                      : 'bg-stone-50 text-stone-600 border-stone-200/80 hover:bg-stone-100'
                  }`}
                >
                  {sec}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {/* 3. Company Quick Selection Grid */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-stone-500 px-1">
          <span>Showing <strong>{filteredTracks.length}</strong> of <strong>{tracks.length}</strong> top companies</span>
          {selectedTrack && (
            <span className="text-[11px] text-stone-500">
              Selected: <strong className="text-stone-900">{selectedTrack.company}</strong> ({selectedTrack.role})
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {filteredTracks.map((t) => {
            const isSelected = selectedTrackId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTrackId(t.id)}
                className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between gap-1.5 ${
                  isSelected
                    ? 'bg-stone-900 text-white border-stone-900 shadow-md ring-2 ring-stone-900/10'
                    : 'bg-white text-stone-800 border-stone-200/90 hover:border-stone-400 hover:bg-stone-50/60 shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className={`font-bold text-xs truncate ${isSelected ? 'text-white' : 'text-stone-900'}`}>
                    {t.company}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-300 shrink-0" />}
                </div>

                <div className="space-y-0.5">
                  <span className={`text-[10px] block truncate ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                    {t.role.split('(')[0]}
                  </span>
                  <div className="flex items-center gap-1 pt-0.5">
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                        isSelected
                          ? 'bg-stone-800 text-stone-200'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {t.difficulty_tier}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Main Company Track Breakdown & Live Readiness Radar */}
      {selectedTrack && readiness && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
          {/* Left Column: Target Company Profile & Hiring Criteria */}
          <div className="lg:col-span-7 space-y-6">
            {/* Company Profile Card */}
            <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Building2 className="w-5 h-5 text-stone-700" />
                    <h2 className="text-lg font-bold text-stone-900">{selectedTrack.company}</h2>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-stone-700">
                      {selectedTrack.difficulty_tier} Bar
                    </span>
                    {selectedTrack.sector && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-800">
                        {selectedTrack.sector}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-stone-600 mt-1">{selectedTrack.role}</p>
                </div>

                <div className="text-right shrink-0">
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
                  <span>Interview Weightage & Core Focus Areas</span>
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
                          className="bg-stone-900 h-full rounded-full transition-all duration-500"
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
                  <p className="text-[11px] text-stone-500">Calculated strictly from your actual quiz attempts</p>
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
                  {readiness.readiness_score === 0 || readiness.assessed_topics_count === 0 ? (
                    <span className="text-stone-500 flex items-center gap-1">
                      <HelpCircle className="w-4 h-4 text-stone-400" /> Untested: 0 / {readiness.total_topics_count || readiness.skill_gaps.length} Topics Assessed
                    </span>
                  ) : readiness.is_interview_ready ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Ready for {selectedTrack.company} Bar
                    </span>
                  ) : (
                    <span className="text-amber-700 flex items-center gap-1">
                      <Zap className="w-4 h-4" /> Target: Reach {readiness.hiring_bar_threshold}% Benchmark
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-600 max-w-xs mx-auto leading-relaxed">
                  {readiness.recommended_action}
                </p>
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" /> 100% Genuine Data — Zero Synthetic Baselines
                  </span>
                </div>
              </div>

              {/* Topic-by-Topic Skill Gaps */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Rubric Topic Mastery
                  </h4>
                  <span className="text-[11px] text-stone-400">
                    {readiness.assessed_topics_count || 0}/{readiness.total_topics_count || readiness.skill_gaps.length} Tested
                  </span>
                </div>

                <div className="space-y-2">
                  {readiness.skill_gaps.map((gap, idx) => {
                    const isUntested = gap.status === 'Untested';
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
                            {isUntested ? (
                              <span className="text-stone-400">Current: <strong className="text-stone-600">0.0% (Unassessed)</strong> / Req: {gap.required_benchmark}%</span>
                            ) : (
                              <span>Current: <strong className="text-stone-800">{gap.current_mastery}%</strong> / Req: {gap.required_benchmark}%</span>
                            )}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                            isUntested
                              ? 'bg-stone-100 text-stone-600 border border-stone-200'
                              : isReady
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
                  <span>
                    {readiness.assessed_topics_count === 0
                      ? `Take Diagnostic Quiz for ${selectedTrack.company}`
                      : `Practice High-Yield Topics for ${selectedTrack.company}`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

