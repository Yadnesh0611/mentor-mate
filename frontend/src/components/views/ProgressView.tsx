"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { api, PerformanceData, ConceptMasteryItem, AssessmentTrendItem } from '@/lib/api';
import {
  TrendingUp,
  Award,
  Target,
  CheckCircle2,
  RefreshCw,
  Brain,
  BookOpen,
  Calendar,
  Zap,
  Activity,
  Flame,
  Clock,
  ShieldCheck,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  Layers,
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface ProgressViewProps {
  onNavigate?: (view: string) => void;
}

export function ProgressView({ onNavigate }: ProgressViewProps) {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conceptFilter, setConceptFilter] = useState<'all' | 'Mastered' | 'Developing' | 'Needs Work'>('all');

  const fetchPerformance = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await api.getPerformance();
      setData(res);
    } catch (err: any) {
      console.error("Failed to load performance analytics:", err);
      setError(err?.message || "Failed to load performance diagnostics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-stone-500 gap-4">
        <div className="relative">
          <RefreshCw className="w-8 h-8 animate-spin text-stone-800" />
          <div className="absolute inset-0 rounded-full blur-md bg-stone-300/40 animate-pulse -z-10" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-stone-800">Loading Your Learning Progress</p>
          <p className="text-xs text-stone-500 mt-1">
            Gathering your quiz scores, review history, and study activity...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-lg mx-auto bg-white rounded-2xl border border-rose-200/80 shadow-xs text-center space-y-4 my-12">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-stone-900">Unable to Load Diagnostics</h3>
          <p className="text-xs text-stone-500 mt-1">{error || "Could not retrieve your learning progress data."}</p>
        </div>
        <button
          onClick={() => fetchPerformance(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-medium hover:bg-stone-800 transition-colors shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Loading</span>
        </button>
      </div>
    );
  }

  const { overall_mastery, proficiency_tier, tier_description, student, stats, assessment_trend, difficulty_breakdown, revisions_breakdown, concepts, domain_strengths, recommendations } = data;

  // Gauge calculation
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, overall_mastery)) / 100) * circumference;

  // Filtered concepts
  const filteredConcepts = concepts.filter(c => {
    if (conceptFilter === 'all') return true;
    return c.status === conceptFilter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">My Progress</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Up to Date
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Track your quiz scores, memory strength, and topic mastery across all your subjects.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 px-3.5 py-2 bg-white rounded-xl border border-stone-200/80 text-xs shadow-2xs">
            <div className="flex items-center gap-1.5 text-stone-600">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>Streak: <strong>{student.streak_days}d</strong></span>
            </div>
            <div className="h-3 w-px bg-stone-200" />
            <div className="flex items-center gap-1.5 text-stone-600">
              <Clock className="w-4 h-4 text-sky-500" />
              <span>Target: <strong>{student.daily_hours}h/day</strong></span>
            </div>
          </div>

          <button
            onClick={() => fetchPerformance(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-medium border border-stone-200 transition-colors shadow-2xs disabled:opacity-60"
            title="Refresh diagnostics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Hero Master Card: Composite Mastery Score & Four Pillars */}
      <div className="rounded-3xl border border-stone-200/90 bg-gradient-to-br from-white via-white to-stone-50/60 p-6 md:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-emerald-100/30 via-sky-100/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          {/* Gauge & Tier Badge */}
          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-center justify-center gap-6 text-center sm:text-left lg:text-center pr-0 lg:pr-6 border-b lg:border-b-0 lg:border-r border-stone-200/80 pb-6 lg:pb-0">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                {/* Background Circle */}
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="10"
                  className="text-stone-100"
                  fill="transparent"
                />
                {/* Value Circle */}
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="text-stone-900 transition-all duration-1000 ease-out"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black tracking-tight text-stone-900">
                  {overall_mastery}%
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                  Composite
                </span>
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-stone-900 text-white shadow-xs">
                <Award className="w-3.5 h-3.5 text-amber-300" />
                <span>{proficiency_tier}</span>
              </div>
              <p className="text-xs text-stone-500 mt-2 max-w-xs leading-relaxed">
                {tier_description}
              </p>
              {student.field_of_study && (
                <div className="mt-2.5 text-[11px] font-medium text-stone-700 bg-stone-100/80 px-2.5 py-1 rounded-lg inline-block border border-stone-200/60">
                  Goal: {student.field_of_study}
                </div>
              )}
            </div>
          </div>

          {/* Pillars Breakdown */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-stone-700" />
                <span>How Your Overall Score is Calculated</span>
              </h3>
              <span className="text-xs text-stone-400">Score Breakdown</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Pillar 1: Assessments */}
              <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs">
                      50%
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-stone-900">Practice Quizzes</div>
                      <div className="text-[11px] text-stone-500">
                        {stats.assessments_completed} completed ({stats.assessments_average_percent}% avg)
                      </div>
                    </div>
                  </div>
                  {stats.assessments_completed > 0 ? (
                    <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      Pending First Test
                    </span>
                  )}
                </div>
                <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, stats.assessments_average_percent || 0)}%` }}
                  />
                </div>
              </div>

              {/* Pillar 2: Revisions */}
              <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-xs">
                      25%
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-stone-900">Memory & Retention</div>
                      <div className="text-[11px] text-stone-500">
                        {stats.revisions_count} topics ({stats.average_retention_percent}% retention)
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                    Memory Tracking
                  </span>
                </div>
                <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, stats.average_retention_percent)}%` }}
                  />
                </div>
              </div>

              {/* Pillar 3: Knowledge Tracing */}
              <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      15%
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-stone-900">Topic Understanding</div>
                      <div className="text-[11px] text-stone-500">
                        {stats.mastered_concepts} / {stats.concepts_tracked} mastered
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    Concept Mastery
                  </span>
                </div>
                <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${stats.concepts_tracked > 0 ? (stats.mastered_concepts / stats.concepts_tracked) * 100 : 0}%`
                    }}
                  />
                </div>
              </div>

              {/* Pillar 4: Activity & Notes */}
              <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs">
                      10%
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-stone-900">Study Consistency</div>
                      <div className="text-[11px] text-stone-500">
                        {stats.resources_uploaded} notes • {stats.mentor_conversations} mentor sessions
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    Active Habit
                  </span>
                </div>
                <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (stats.resources_uploaded * 25) + (stats.mentor_conversations * 10))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6-Card Diagnostic Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-stone-500 flex items-center justify-between">
            <span>Quizzes</span>
            <Target className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="text-2xl font-bold text-stone-900 mt-1">
            {stats.assessments_completed}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">
            Avg: {stats.assessments_average_percent}%
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-stone-500 flex items-center justify-between">
            <span>Memory Health</span>
            <Clock className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="text-2xl font-bold text-stone-900 mt-1">
            {stats.average_retention_percent}%
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">
            {revisions_breakdown.high_retention} stable / {revisions_breakdown.at_risk} decaying
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-stone-500 flex items-center justify-between">
            <span>Tracked Topics</span>
            <Layers className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="text-2xl font-bold text-stone-900 mt-1">
            {stats.concepts_tracked}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">
            {stats.mastered_concepts} Mastered
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-stone-500 flex items-center justify-between">
            <span>Study Notes</span>
            <BookOpen className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="text-2xl font-bold text-stone-900 mt-1">
            {stats.resources_uploaded}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">
            Uploaded
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-stone-500 flex items-center justify-between">
            <span>Study Sessions</span>
            <Brain className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="text-2xl font-bold text-stone-900 mt-1">
            {stats.mentor_conversations}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">
            With Academic AI
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-2xs">
          <div className="text-[11px] font-medium text-stone-500 flex items-center justify-between">
            <span>AI Schedules</span>
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="text-2xl font-bold text-stone-900 mt-1">
            {stats.schedules_created}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">
            Generated & Active
          </div>
        </div>
      </div>

      {/* Graphical Section 1: Assessment Trend & Trajectory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Assessment Chart or Baseline Guide */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-stone-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-stone-700" />
                <span>Quiz Score History</span>
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                See how your quiz scores and performance improve over time.
              </p>
            </div>
            {stats.assessments_completed > 0 && (
              <span className="text-xs font-semibold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg">
                {stats.assessments_completed} Tests Recorded
              </span>
            )}
          </div>

          {stats.assessments_completed > 0 && assessment_trend.length > 0 ? (
            /* Real SVG Line Chart */
            <div className="space-y-4 pt-2">
              <div className="h-48 w-full relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="500" y2="20" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="0" y1="70" x2="500" y2="70" stroke="#f1f5f9" strokeDasharray="3 3" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="#f1f5f9" strokeDasharray="3 3" />

                  {/* Area fill */}
                  {(() => {
                    const points = assessment_trend.map((t, idx) => {
                      const x = (idx / Math.max(1, assessment_trend.length - 1)) * 480 + 10;
                      const y = 140 - (t.percentage / 100) * 120;
                      return `${x},${y}`;
                    });
                    const areaPoints = `10,140 ${points.join(' ')} 490,140`;
                    return (
                      <>
                        <polygon points={areaPoints} fill="url(#scoreGradient)" />
                        <polyline
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3"
                          points={points.join(' ')}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {assessment_trend.map((t, idx) => {
                          const x = (idx / Math.max(1, assessment_trend.length - 1)) * 480 + 10;
                          const y = 140 - (t.percentage / 100) * 120;
                          return (
                            <g key={idx}>
                              <circle cx={x} cy={y} r="5" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" />
                              <text x={x} y={y - 10} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f172a">
                                {t.percentage}%
                              </text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>

              {/* Assessment Chips List */}
              <div className="flex gap-2 overflow-x-auto pb-1 pt-2">
                {assessment_trend.map((t, idx) => (
                  <div key={idx} className="shrink-0 p-2.5 rounded-xl bg-stone-50 border border-stone-200/60 text-left min-w-[120px]">
                    <div className="text-[10px] text-stone-400 font-medium">{t.label}</div>
                    <div className="text-xs font-bold text-stone-800 truncate max-w-[130px]">{t.title}</div>
                    <div className="flex items-center justify-between text-[11px] mt-1">
                      <span className="font-semibold text-emerald-700">{t.percentage}%</span>
                      <span className="text-stone-500">{t.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Beautiful Empty Baseline State */
            <div className="p-6 rounded-2xl bg-stone-50/70 border border-stone-200/80 text-center space-y-4 my-2">
              <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 shadow-2xs text-stone-700 flex items-center justify-center mx-auto">
                <Target className="w-6 h-6 text-stone-800" />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="text-sm font-bold text-stone-900">No Quizzes Taken Yet</h4>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  Your study notes and review items are ready. Take your first practice quiz to see your score trends, test strengths, and improvement over time!
                </p>
              </div>

              {/* Difficulty Modes Preview */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-stone-200/80 text-stone-700 font-medium">
                  Adaptive AI Test
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-stone-200/80 text-stone-700 font-medium">
                  Foundational Recall
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-stone-200/80 text-stone-700 font-medium">
                  Intermediate Concept Check
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-stone-200/80 text-stone-700 font-medium">
                  Advanced Problem Solving
                </span>
              </div>

              {onNavigate && (
                <button
                  onClick={() => onNavigate('assessments')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all transform active:scale-98"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Start Practice Quiz Now</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Col: Memory Retention & Ebbinghaus Decay */}
        <div className="p-6 rounded-3xl bg-white border border-stone-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-stone-700" />
                <span>Memory Strength</span>
              </h3>
              <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                Retention Tracker
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Shows how well you remember the topics you have reviewed.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold text-stone-700 mb-1.5">
                  <span>Current Retention Rate</span>
                  <span className="text-stone-900 font-bold">{stats.average_retention_percent}%</span>
                </div>
                <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all duration-700"
                    style={{ width: `${Math.min(100, stats.average_retention_percent)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <div className="text-[10px] text-emerald-800 font-medium">High Retention</div>
                  <div className="text-lg font-bold text-emerald-950 mt-0.5">
                    {revisions_breakdown.high_retention}
                  </div>
                  <div className="text-[10px] text-emerald-700 mt-0.5">&gt;70% memory strength</div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                  <div className="text-[10px] text-amber-800 font-medium">At Risk / Review Due</div>
                  <div className="text-lg font-bold text-amber-950 mt-0.5">
                    {revisions_breakdown.at_risk}
                  </div>
                  <div className="text-[10px] text-amber-700 mt-0.5">&le;70% memory strength</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/60 text-xs text-stone-600 space-y-1.5">
                <div className="flex justify-between text-[11px]">
                  <span>Course Topics Reviewed:</span>
                  <span className="font-semibold text-stone-800">{revisions_breakdown.field_curriculum}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Uploaded Notes Reviewed:</span>
                  <span className="font-semibold text-stone-800">{revisions_breakdown.study_material}</span>
                </div>
              </div>
            </div>
          </div>

          {onNavigate && (
            <button
              onClick={() => onNavigate('revision')}
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200/80 text-stone-800 text-xs font-semibold transition-colors mt-4"
            >
              <span>Review Memory Flashcards & Mindmaps</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Graphical Section 2: Domain Strengths & Actionable Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Domain Strengths (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-white border border-stone-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-stone-700" />
                <span>Subject & Domain Mastery</span>
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Your understanding across each subject based on your quizzes and reviews.
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {domain_strengths.length > 0 ? (
              domain_strengths.map((ds, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-stone-800">{ds.domain}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-stone-400">{ds.concept_count} topic{ds.concept_count === 1 ? '' : 's'}</span>
                      <span className="font-bold text-stone-900">{ds.average_mastery}%</span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-stone-800 transition-all duration-500"
                      style={{ width: `${Math.min(100, ds.average_mastery)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl bg-stone-50 text-center text-xs text-stone-500">
                Register study notes or take a test to view domain-level mastery.
              </div>
            )}
          </div>
        </div>

        {/* Actionable Recommendations (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-white border border-stone-200/90 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Recommended Next Steps</span>
              </h3>
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Helpful Tips
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Tips to help you study more effectively.
            </p>

            <div className="mt-4 space-y-2.5">
              {recommendations && recommendations.length > 0 ? (
                recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 flex items-start gap-2.5 text-xs text-stone-700 leading-relaxed"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-stone-50 text-xs text-stone-500 text-center">
                  All systems optimal! Keep learning consistently.
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3">
            {onNavigate && (
              <>
                <button
                  onClick={() => onNavigate('assessments')}
                  className="px-3 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Practice Quiz</span>
                </button>
                <button
                  onClick={() => onNavigate('schedule')}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>AI Schedule</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Concept Deep Dive & BKT Knowledge Table */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-stone-200/90 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <Brain className="w-4 h-4 text-stone-700" />
              <span>Topic-by-Topic Mastery</span>
            </h3>
            <p className="text-[11px] text-stone-500 mt-0.5">
              See how well you understand each concept based on your quiz answers and reviews.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl">
            {(['all', 'Mastered', 'Developing', 'Needs Work'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setConceptFilter(filter)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  conceptFilter === filter
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {filter === 'all' ? 'All' : filter}
              </button>
            ))}
          </div>
        </div>

        {/* Concept Cards Grid */}
        {filteredConcepts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredConcepts.map(c => (
              <div
                key={c.concept_id}
                className="p-4 rounded-2xl border border-stone-200/80 bg-stone-50/40 hover:bg-white hover:border-stone-300 transition-all duration-200 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-stone-900 truncate" title={c.concept_name}>
                      {c.concept_name}
                    </h4>
                    <span className="text-[10px] text-stone-400 font-medium">
                      {c.subject} • {c.topic}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                      c.status === 'Mastered'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : c.status === 'Developing'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-stone-600 mb-1 font-medium">
                    <span>Mastery Level</span>
                    <span className="font-bold text-stone-900">{c.mastery_percent}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-stone-200/70 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        c.status === 'Mastered' ? 'bg-emerald-600' : c.status === 'Developing' ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, c.mastery_percent)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-stone-500 pt-0.5 border-t border-stone-200/50">
                  <span>Understanding: {c.mastery_percent}%</span>
                  <span>{c.total_attempts} attempt{c.total_attempts === 1 ? '' : 's'}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200/60">
            <p className="text-xs text-stone-500">No concepts match the selected filter ({conceptFilter}).</p>
          </div>
        )}
      </div>
    </div>
  );
}

