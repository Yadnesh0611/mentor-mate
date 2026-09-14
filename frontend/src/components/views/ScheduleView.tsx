"use client";

import React, { useEffect, useState } from 'react';
import {
  api,
  ScheduleRecord,
  SchedulePlan,
  ScheduleDay,
  ScheduleTask
} from '@/lib/api';
import {
  Calendar as CalendarIcon,
  BookOpen,
  Sparkles,
  Layers,
  Clock,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ChevronRight,
  List,
  CalendarDays,
  Target,
  GraduationCap,
  Download,
  AlertCircle,
  FileText,
  Zap,
  TrendingUp,
  History,
  Trash2
} from 'lucide-react';

const PRESET_FIELDS = [
  "Artificial Intelligence & Machine Learning (AIML)",
  "Artificial Intelligence & Data Science (AIDS)",
  "Cybersecurity & Digital Forensics",
  "Cloud Computing & DevOps",
  "Full-Stack Software Engineering",
  "Data Science & Big Data Analytics",
  "Internet of Things (IoT) & Robotics",
  "Blockchain & Distributed Systems"
];

const TIME_RANGES = [
  { id: '3_days', label: '3 Days', desc: 'Intensive Sprint' },
  { id: '1_week', label: '1 Week', desc: '7-Day Comprehensive' },
  { id: '2_weeks', label: '2 Weeks', desc: '14-Day Roadmap' },
  { id: '1_month', label: '1 Month', desc: '30-Day Mastery' },
];

export function ScheduleView() {
  const [activeTab, setActiveTab] = useState<'resource' | 'general'>('general');
  const [timeRange, setTimeRange] = useState<'3_days' | '1_week' | '2_weeks' | '1_month'>('1_week');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedField, setSelectedField] = useState<string>("Artificial Intelligence & Machine Learning (AIML)");
  const [customFieldInput, setCustomFieldInput] = useState<string>("");
  const [isCustomField, setIsCustomField] = useState<boolean>(false);

  const [currentSchedule, setCurrentSchedule] = useState<SchedulePlan | null>(null);
  const [currentRecord, setCurrentRecord] = useState<ScheduleRecord | null>(null);
  const [savedHistory, setSavedHistory] = useState<ScheduleRecord[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load existing saved schedule on mount (never disappears on reload)
  useEffect(() => {
    loadSavedSchedule();
    loadHistory();
  }, []);

  const loadSavedSchedule = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getLatestSchedule();
      if (res && res.has_schedule && res.schedule) {
        setCurrentRecord(res);
        setCurrentSchedule(res.schedule);
        if (res.mode) setActiveTab(res.mode);
        if (res.time_range) setTimeRange(res.time_range as any);
        if (res.field_of_study) {
          if (PRESET_FIELDS.includes(res.field_of_study)) {
            setSelectedField(res.field_of_study);
            setIsCustomField(false);
          } else {
            setIsCustomField(true);
            setCustomFieldInput(res.field_of_study);
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to load saved schedule:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const records = await api.getAllSchedules();
      setSavedHistory(records);
    } catch (err) {
      console.error("Failed to fetch schedule history:", err);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      setError(null);
      setSuccessMessage(null);

      const field = isCustomField ? (customFieldInput.trim() || selectedField) : selectedField;

      const res = await api.generateSchedule({
        mode: activeTab,
        time_range: timeRange,
        field_of_study: field
      });

      if (res && res.schedule) {
        setCurrentRecord(res);
        setCurrentSchedule(res.schedule);
        setSuccessMessage("Schedule successfully generated and saved to your account!");
        loadHistory();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      console.error("Error generating schedule:", err);
      setError(err?.message || "Failed to generate schedule. Please retry.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteSchedule = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this saved schedule?")) return;
    try {
      await api.deleteSchedule(id);
      if (currentRecord?.schedule_id === id || currentRecord?.id === id) {
        setCurrentRecord(null);
        setCurrentSchedule(null);
      }
      loadHistory();
    } catch (err) {
      console.error("Failed to delete schedule:", err);
    }
  };

  const handleSelectFromHistory = (rec: ScheduleRecord) => {
    setCurrentRecord(rec);
    setCurrentSchedule(rec.schedule);
    if (rec.mode) setActiveTab(rec.mode);
    if (rec.time_range) setTimeRange(rec.time_range as any);
    if (rec.field_of_study) {
      if (PRESET_FIELDS.includes(rec.field_of_study)) {
        setSelectedField(rec.field_of_study);
        setIsCustomField(false);
      } else {
        setIsCustomField(true);
        setCustomFieldInput(rec.field_of_study);
      }
    }
    setShowHistory(false);
  };

  const exportScheduleAsJSON = () => {
    if (!currentSchedule) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentSchedule, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `study_schedule_${currentSchedule.mode}_${currentSchedule.time_range}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getTaskTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'study':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">Study</span>;
      case 'revision':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">Revision</span>;
      case 'practice':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Practice</span>;
      case 'project':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">Project</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-700 border border-stone-200">{type}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] text-stone-500 gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-stone-800" />
        <span className="text-xs font-medium">Retrieving your saved study schedule...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              AI Adaptive Planner
            </span>
            <span className="text-xs text-stone-400">• Automatically Saved</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 mt-1">Study Schedule & Roadmap</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Generates real, customized learning schedules based on your target field (e.g. AIML, AIDS, Cybersecurity) or your uploaded course notes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedHistory.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-3 py-2 rounded-xl text-xs font-medium border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <History className="w-3.5 h-3.5 text-stone-500" />
              <span>Saved Schedules ({savedHistory.length})</span>
            </button>
          )}

          {currentSchedule && (
            <button
              onClick={exportScheduleAsJSON}
              className="px-3 py-2 rounded-xl text-xs font-medium border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 flex items-center gap-1.5 transition-all shadow-2xs"
              title="Download schedule as JSON"
            >
              <Download className="w-3.5 h-3.5 text-stone-500" />
              <span>Export</span>
            </button>
          )}
        </div>
      </div>

      {/* History Drawer / Modal */}
      {showHistory && (
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/90 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-stone-600" />
              Previously Saved Study Schedules
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-xs text-stone-500 hover:text-stone-800 font-medium"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {savedHistory.map((rec) => (
              <div
                key={rec.id}
                onClick={() => handleSelectFromHistory(rec)}
                className="p-3 rounded-xl border border-stone-200 bg-white hover:border-stone-900/40 hover:shadow-xs transition-all cursor-pointer relative group flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                      {rec.mode === 'resource' ? 'Resource Notes' : 'Field Curriculum'}
                    </span>
                    <button
                      onClick={(e) => handleDeleteSchedule(rec.id!, e)}
                      className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-600 transition-opacity p-1"
                      title="Delete saved plan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="text-xs font-bold text-stone-900 mt-2 line-clamp-1">
                    {rec.title || rec.schedule?.title || "Study Plan"}
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">
                    {rec.field_of_study || rec.schedule?.field_of_study || "General Study"}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-stone-400 border-t border-stone-100 pt-1.5 mt-1">
                  <span>{rec.time_range?.replace('_', ' ')}</span>
                  <span>{rec.created_at ? new Date(rec.created_at).toLocaleDateString() : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Configuration Card */}
      <div className="p-5 md:p-6 rounded-2xl border border-stone-200/90 bg-white shadow-2xs space-y-6">
        {/* Step 1: Mode Selection */}
        <div>
          <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider block mb-2">
            1. Select Schedule Generator Source
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setActiveTab('general')}
              className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 ${
                activeTab === 'general'
                  ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                  : 'border-stone-200 hover:border-stone-300 bg-stone-50/50 text-stone-800'
              }`}
            >
              <div className={`p-2 rounded-lg ${activeTab === 'general' ? 'bg-white/15 text-white' : 'bg-stone-200/70 text-stone-700'}`}>
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold">Field of Study / Career Goal</div>
                <div className={`text-[11px] mt-0.5 leading-relaxed ${activeTab === 'general' ? 'text-stone-300' : 'text-stone-500'}`}>
                  Custom study plan based on your field (e.g., AIML, AIDS, Cybersecurity, Full-Stack) and topics you need more practice with.
                </div>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('resource')}
              className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 ${
                activeTab === 'resource'
                  ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                  : 'border-stone-200 hover:border-stone-300 bg-stone-50/50 text-stone-800'
              }`}
            >
              <div className={`p-2 rounded-lg ${activeTab === 'resource' ? 'bg-white/15 text-white' : 'bg-stone-200/70 text-stone-700'}`}>
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold">From Uploaded Study Notes</div>
                <div className={`text-[11px] mt-0.5 leading-relaxed ${activeTab === 'resource' ? 'text-stone-300' : 'text-stone-500'}`}>
                  Built directly from your uploaded class notes, PDFs, and textbook chapters.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Step 2: Field of Study Selection (if general mode) */}
        {activeTab === 'general' && (
          <div className="pt-2 border-t border-stone-100 space-y-3">
            <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider block">
              2. Specify Your Field of Study / Goal
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {PRESET_FIELDS.map((field) => {
                const isSelected = !isCustomField && selectedField === field;
                return (
                  <button
                    key={field}
                    onClick={() => {
                      setSelectedField(field);
                      setIsCustomField(false);
                    }}
                    className={`p-2.5 rounded-xl text-left border text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-stone-900 bg-stone-100 text-stone-900 font-semibold ring-1 ring-stone-900'
                        : 'border-stone-200 hover:border-stone-300 bg-white text-stone-600'
                    }`}
                  >
                    <div className="line-clamp-2">{field}</div>
                  </button>
                );
              })}
            </div>

            {/* Custom Field Input */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <button
                onClick={() => setIsCustomField(true)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  isCustomField
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                }`}
              >
                Other Goal / Custom Field
              </button>
              {isCustomField && (
                <input
                  type="text"
                  placeholder="e.g. Artificial Intelligence, Embedded Systems, Bio-Informatics..."
                  value={customFieldInput}
                  onChange={(e) => setCustomFieldInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              )}
            </div>
          </div>
        )}

        {/* Step 3: Time Range Option */}
        <div className="pt-2 border-t border-stone-100 space-y-2">
          <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider block">
            {activeTab === 'general' ? '3.' : '2.'} Choose Time Range
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {TIME_RANGES.map((r) => {
              const isSelected = timeRange === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setTimeRange(r.id as any)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                      : 'border-stone-200 hover:border-stone-300 bg-white text-stone-800'
                  }`}
                >
                  <div className="text-xs font-bold">{r.label}</div>
                  <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                    {r.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-stone-500">
            {currentRecord?.created_at && (
              <span>Last saved: {new Date(currentRecord.created_at).toLocaleString()}</span>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating Your Study Schedule...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>{currentSchedule ? "Regenerate Schedule" : "Generate Study Schedule"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Display Generated Schedule */}
      {currentSchedule && (
        <div className="space-y-4">
          {/* Header Bar & View Mode Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-stone-100 text-stone-700">
                  {currentSchedule.mode === 'resource' ? 'Resource-Based' : 'Field Curriculum'}
                </span>
                <span className="text-xs font-medium text-stone-500">• {currentSchedule.total_days} Days Total</span>
              </div>
              <h2 className="text-base font-bold text-stone-900 mt-1">{currentSchedule.title}</h2>
              {currentSchedule.summary && (
                <p className="text-xs text-stone-600 mt-1 max-w-3xl leading-relaxed">
                  {currentSchedule.summary}
                </p>
              )}
            </div>

            {/* List vs Calendar Toggle */}
            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 self-start sm:self-auto">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>

              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Calendar Grid</span>
              </button>
            </div>
          </div>

          {/* LIST VIEW */}
          {viewMode === 'list' && (
            <div className="space-y-3">
              {currentSchedule.days.map((day: ScheduleDay) => (
                <div
                  key={day.day_number}
                  className="p-5 rounded-2xl border border-stone-200/90 bg-white shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-stone-100 pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-stone-900 text-white font-bold text-xs flex items-center justify-center">
                        {day.day_number}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-stone-900">{day.day_label}</h3>
                        <div className="text-[11px] text-stone-500 font-medium">Focus: {day.focus_area}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span>{day.estimated_hours} Hours Total</span>
                    </div>
                  </div>

                  {/* Tasks List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                    {day.tasks.map((task: ScheduleTask, idx: number) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/60 flex flex-col justify-between gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-stone-900 line-clamp-1">
                              {task.task_title}
                            </span>
                            {getTaskTypeBadge(task.task_type)}
                          </div>
                          <p className="text-[11px] text-stone-600 leading-relaxed">
                            {task.details}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-stone-400 border-t border-stone-200/50 pt-1.5 mt-1">
                          <span className="flex items-center gap-1 font-medium text-stone-500">
                            <Clock className="w-3 h-3" />
                            {task.duration_minutes} mins
                          </span>
                          <span className="text-stone-400 font-mono">#{idx + 1}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CALENDAR GRID VIEW */}
          {viewMode === 'calendar' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {currentSchedule.days.map((day: ScheduleDay) => (
                <div
                  key={day.day_number}
                  className="p-4 rounded-2xl border border-stone-200/90 bg-white shadow-2xs flex flex-col justify-between gap-3 hover:border-stone-900/40 transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                      <span className="text-xs font-bold text-stone-900">Day {day.day_number}</span>
                      <span className="text-[10px] font-medium text-stone-500 px-2 py-0.5 rounded-full bg-stone-100">
                        {day.estimated_hours}h
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-stone-800 line-clamp-2">
                      {day.focus_area}
                    </h4>

                    <div className="space-y-1.5 pt-1">
                      {day.tasks.map((task, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-stone-50 border border-stone-100 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-stone-900 line-clamp-1">{task.task_title}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-stone-400 mt-1">
                            <span>{task.task_type}</span>
                            <span>{task.duration_minutes}m</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-[10px] text-stone-400 text-center border-t border-stone-100 pt-2">
                    {day.tasks.length} Action Items
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
