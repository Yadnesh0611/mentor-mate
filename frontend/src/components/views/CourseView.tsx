"use client";

import React, { useEffect, useState, useCallback } from 'react';
import {
  api,
  CourseRecord,
  CourseReadinessResponse,
  CourseModule,
  CourseLesson
} from '@/lib/api';
import {
  GraduationCap,
  Sparkles,
  Globe,
  Brain,
  BookOpen,
  Target,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  ExternalLink,
  Star,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Trash2,
  ArrowUpRight,
  ShieldCheck,
  Layers,
  Award,
  BookMarked,
  Check,
  Copy,
  Code2,
  MessageSquare,
  PlayCircle,
  X
} from 'lucide-react';

interface CourseViewProps {
  onNavigate?: (view: string) => void;
}

interface ActiveLessonState {
  courseId: string;
  courseTitle: string;
  moduleIndex: number;
  moduleTitle: string;
  lessonIndex: number;
  lesson: CourseLesson;
  totalLessonsInCourse: number;
  allLessonsInCourse: Array<{
    moduleIndex: number;
    moduleTitle: string;
    lessonIndex: number;
    lesson: CourseLesson;
  }>;
}

export function CourseView({ onNavigate }: CourseViewProps) {
  const [activeTab, setActiveTab] = useState<'personalized' | 'open_source'>('personalized');
  
  // Data states
  const [readiness, setReadiness] = useState<CourseReadinessResponse | null>(null);
  const [personalizedCourses, setPersonalizedCourses] = useState<CourseRecord[]>([]);
  const [openSourceCourses, setOpenSourceCourses] = useState<CourseRecord[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [customFocus, setCustomFocus] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Active Lesson Study Modal
  const [activeLesson, setActiveLesson] = useState<ActiveLessonState | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [readinessRes, persRes, osRes] = await Promise.all([
        api.getCourseReadiness(),
        api.getPersonalizedCourses(),
        api.getOpenSourceCourses(),
      ]);
      setReadiness(readinessRes);
      setPersonalizedCourses(persRes);
      setOpenSourceCourses(osRes);
      if (persRes.length > 0) {
        setExpandedCourseId(persRes[0].id);
        if (persRes[0].modules && persRes[0].modules.length > 0) {
          setExpandedModuleId(`${persRes[0].id}_${persRes[0].modules[0].module_id || 0}`);
        }
      }
    } catch (err: any) {
      console.error("Failed to load courses data:", err);
      setError(err?.message || "Failed to load course curricula.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Generation step timer for engaging UI
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (generating) {
      setGenStep(1);
      timer = setInterval(() => {
        setGenStep(prev => (prev < 3 ? prev + 1 : prev));
      }, 700);
    } else {
      setGenStep(0);
    }
    return () => clearInterval(timer);
  }, [generating]);

  const handleGeneratePersonalized = async () => {
    setGenerating(true);
    setError(null);
    try {
      const newCourse = await api.generatePersonalizedCourse(customFocus.trim() || undefined);
      setPersonalizedCourses(prev => [newCourse, ...prev]);
      setExpandedCourseId(newCourse.id);
      if (newCourse.modules && newCourse.modules.length > 0) {
        setExpandedModuleId(`${newCourse.id}_${newCourse.modules[0].module_id || 0}`);
      }
      setShowGenerateModal(false);
      setCustomFocus('');
    } catch (err: any) {
      console.error("Failed to generate personalized course:", err);
      setError(err?.message || "Failed to generate personalized course.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSyncGitHub = async () => {
    setSyncing(true);
    try {
      const updated = await api.syncOpenSourceCourses(readiness?.field_of_study);
      setOpenSourceCourses(updated);
    } catch (err: any) {
      console.error("Failed to sync open source courses:", err);
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this custom course?")) return;
    try {
      await api.deleteCourse(courseId);
      setPersonalizedCourses(prev => prev.filter(c => c.id !== courseId));
      if (activeLesson?.courseId === courseId) {
        setActiveLesson(null);
      }
    } catch (err: any) {
      console.error("Failed to delete course:", err);
    }
  };

  const handleToggleLesson = async (courseId: string, lessonId: string) => {
    // Optimistic UI update
    setPersonalizedCourses(prev => prev.map(c => {
      if (c.id !== courseId) return c;
      const updatedMods = (c.modules || []).map(m => ({
        ...m,
        lessons: (m.lessons || []).map(l => {
          if (l.lesson_id === lessonId || l.title === lessonId) {
            return { ...l, completed: !l.completed };
          }
          return l;
        })
      }));
      return { ...c, modules: updatedMods };
    }));

    if (activeLesson && activeLesson.courseId === courseId) {
      setActiveLesson(prev => {
        if (!prev) return null;
        return {
          ...prev,
          lesson: { ...prev.lesson, completed: !prev.lesson.completed }
        };
      });
    }

    try {
      await api.toggleLessonCompletion(courseId, lessonId);
    } catch (err) {
      console.error("Failed to toggle lesson completion:", err);
    }
  };

  // Open Lesson Study Modal
  const openStudyLesson = (course: CourseRecord, modIdx: number, lIdx: number) => {
    const allLessons: ActiveLessonState['allLessonsInCourse'] = [];
    (course.modules || []).forEach((m, mI) => {
      (m.lessons || []).forEach((l, lI) => {
        allLessons.push({
          moduleIndex: mI,
          moduleTitle: m.title,
          lessonIndex: lI,
          lesson: l
        });
      });
    });

    const targetMod = course.modules[modIdx];
    const targetLesson = targetMod?.lessons?.[lIdx];
    if (!targetLesson) return;

    setActiveLesson({
      courseId: course.id,
      courseTitle: course.title,
      moduleIndex: modIdx,
      moduleTitle: targetMod.title,
      lessonIndex: lIdx,
      lesson: targetLesson,
      totalLessonsInCourse: allLessons.length,
      allLessonsInCourse: allLessons
    });
  };

  const navigateLesson = (direction: 'prev' | 'next') => {
    if (!activeLesson) return;
    const currentIdx = activeLesson.allLessonsInCourse.findIndex(
      item => item.moduleIndex === activeLesson.moduleIndex && item.lessonIndex === activeLesson.lessonIndex
    );
    if (currentIdx === -1) return;

    const nextIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
    if (nextIdx >= 0 && nextIdx < activeLesson.allLessonsInCourse.length) {
      const target = activeLesson.allLessonsInCourse[nextIdx];
      setActiveLesson({
        ...activeLesson,
        moduleIndex: target.moduleIndex,
        moduleTitle: target.moduleTitle,
        lessonIndex: target.lessonIndex,
        lesson: target.lesson
      });
      setCopiedCode(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Filter open-source courses
  const filteredOpenSource = openSourceCourses.filter(c => {
    const matchesSearch = 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.tags && c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesPlatform = 
      selectedPlatform === 'all' || 
      (c.source_platform && c.source_platform.toLowerCase().includes(selectedPlatform.toLowerCase()));

    return matchesSearch && matchesPlatform;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-stone-500 gap-4">
        <RefreshCw className="w-8 h-8 animate-spin text-stone-800" />
        <div className="text-center">
          <p className="text-sm font-semibold text-stone-800">Loading Academic Curricula</p>
          <p className="text-xs text-stone-500 mt-1">
            Analyzing student diagnostic profile and fetching verified open curricula...
          </p>
        </div>
      </div>
    );
  }

  const field = readiness?.field_of_study || "Artificial Intelligence & Machine Learning (AIML)";
  const isReady = readiness?.is_ready || false;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-stone-900 text-white flex items-center justify-center shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-stone-900">Courses & Learning Paths</h1>
              <p className="text-xs text-stone-500">
                Personalized courses built for what you need to study, plus freely available open courses.
              </p>
            </div>
          </div>
        </div>

        {/* Field of Study Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-stone-200/90 text-xs text-stone-700 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-semibold text-stone-900">Your Goal:</span>
          <span className="truncate max-w-[240px] font-medium">{field}</span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('personalized')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'personalized'
              ? 'border-stone-900 text-stone-900 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Personalized Courses</span>
          {personalizedCourses.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-900 text-white font-medium">
              {personalizedCourses.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('open_source')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'open_source'
              ? 'border-stone-900 text-stone-900 font-bold'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-sky-500" />
          <span>Open-Source & Free Web Courses</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 text-stone-600 font-medium">
            {openSourceCourses.length}
          </span>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: PERSONALIZED COURSES */}
      {activeTab === 'personalized' && (
        <div className="space-y-6">
          {/* Readiness Section if not ready */}
          {!isReady && (
            <div className="p-6 rounded-3xl border border-amber-200/80 bg-amber-50/40 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 mb-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Study Data Needed</span>
                  </div>
                  <h3 className="text-lg font-bold text-stone-900">
                    Why Personalized Courses Need Your Study Data First
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
                    Mentor Mate creates truly custom courses for you. To know what you should focus on and where you need help, the AI reviews your quiz results, mistakes, and uploaded notes.
                  </p>
                </div>

                {onNavigate && (
                  <button
                    onClick={() => onNavigate('assessments')}
                    className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Target className="w-3.5 h-3.5 text-amber-300" />
                    <span>Take a Practice Quiz</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Checklist Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {readiness?.checklist.map(item => (
                  <div
                    key={item.key}
                    className={`p-4 rounded-2xl border transition-all ${
                      item.status === 'ready'
                        ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-950'
                        : 'bg-stone-50/60 border-stone-200/80 text-stone-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                        Prerequisite
                      </span>
                      {item.status === 'ready' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          {item.status === 'pending' ? 'Pending' : 'Action Needed'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold mt-2">{item.title}</div>
                    <div className="text-[11px] text-stone-500 mt-1">{item.description}</div>
                    
                    {item.status !== 'ready' && onNavigate && (
                      <button
                        onClick={() => onNavigate(item.action_view)}
                        className="mt-3 text-[11px] font-semibold text-stone-900 hover:underline flex items-center gap-1"
                      >
                        <span>Complete step in {item.action_view}</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* If ready: Action banner to synthesize new course */}
          {isReady && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-stone-900 via-stone-900 to-stone-800 text-white shadow-xs">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Ready to Personalize</span>
                </div>
                <h3 className="text-base font-bold">Generate a Personalized Course</h3>
                <p className="text-xs text-stone-400 max-w-xl">
                  AI will use your quiz results, uploaded notes, and subjects to build an in-depth course focused on what you need to learn.
                </p>
              </div>

              <button
                onClick={() => setShowGenerateModal(true)}
                disabled={generating}
                className="shrink-0 px-4 py-2.5 rounded-xl bg-white text-stone-900 hover:bg-stone-100 text-xs font-bold transition-all shadow-xs flex items-center gap-2 disabled:opacity-60"
              >
                <Plus className="w-3.5 h-3.5 text-amber-500" />
                <span>{generating ? 'Creating Course...' : 'Create Personalized Course'}</span>
              </button>
            </div>
          )}

          {/* List of Saved Personalized Courses */}
          {personalizedCourses.length > 0 ? (
            <div className="space-y-6">
              <div className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Your Saved Personalized Courses ({personalizedCourses.length})
              </div>

              {personalizedCourses.map(course => {
                const isExpanded = expandedCourseId === course.id;
                
                // Calculate course completion progress
                let totalLessons = 0;
                let completedLessons = 0;
                (course.modules || []).forEach(m => {
                  (m.lessons || []).forEach(l => {
                    totalLessons += 1;
                    if (l.completed) completedLessons += 1;
                  });
                });
                const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

                return (
                  <div
                    key={course.id}
                    className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-2xs space-y-5 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
                            {course.level}
                          </span>
                          <span className="text-[10px] font-semibold text-stone-600 flex items-center gap-1 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>{course.estimated_hours} Hours Total</span>
                          </span>
                          <span className="text-[10px] font-semibold text-stone-500 bg-stone-50 px-2 py-0.5 rounded-full border border-stone-200">
                            {course.modules?.length || 0} Modules • {totalLessons} Lessons
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-stone-900">{course.title}</h3>
                        <p className="text-xs text-stone-500 leading-relaxed max-w-3xl">{course.description}</p>
                        
                        {/* Progress Bar */}
                        <div className="pt-2 max-w-md">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-semibold text-stone-700">Course Progress</span>
                            <span className="font-bold text-stone-900">{completedLessons} / {totalLessons} Lessons ({progressPct}%)</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-start">
                        {totalLessons > 0 && (
                          <button
                            onClick={() => {
                              // Find first uncompleted lesson, or first lesson
                              let foundMod = 0;
                              let foundLes = 0;
                              for (let mI = 0; mI < (course.modules || []).length; mI++) {
                                const m = course.modules[mI];
                                const modLessons = m?.lessons || [];
                                for (let lI = 0; lI < modLessons.length; lI++) {
                                  if (!modLessons[lI].completed) {
                                    foundMod = mI;
                                    foundLes = lI;
                                    break;
                                  }
                                }
                              }
                              openStudyLesson(course, foundMod, foundLes);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                          >
                            <PlayCircle className="w-3.5 h-3.5 text-amber-300" />
                            <span>{completedLessons > 0 ? 'Continue Studying' : 'Start Course'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                          className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
                        >
                          <span>{isExpanded ? 'Hide Syllabus' : 'View Syllabus'}</span>
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(course.id)}
                          className="p-1.5 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete course"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Targeted Weak Concepts & Diagnostic Sources Chips */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100 text-xs">
                      {course.weak_areas_addressed && course.weak_areas_addressed.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold text-stone-400">Topics Covered:</span>
                          {course.weak_areas_addressed.map((gap, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200"
                            >
                              {gap}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Expandable Multi-Module Syllabus */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-stone-200/70 space-y-4">
                        <div className="text-xs font-bold text-stone-900 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-stone-700" />
                            <span>Course Syllabus ({course.modules?.length || 0} Modules)</span>
                          </div>
                          <span className="text-[11px] text-stone-500 font-normal">
                            Click any lesson to open full notes and practice exercises
                          </span>
                        </div>

                        <div className="space-y-3">
                          {course.modules?.map((mod, modIdx) => {
                            const modKey = `${course.id}_${mod.module_id || modIdx}`;
                            const isModExpanded = expandedModuleId === modKey;
                            
                            // Module completion count
                            const modTotal = mod.lessons?.length || 0;
                            const modCompleted = mod.lessons?.filter(l => l.completed).length || 0;

                            return (
                              <div
                                key={modIdx}
                                className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-4 space-y-3 transition-all"
                              >
                                <div
                                  className="flex items-center justify-between cursor-pointer select-none"
                                  onClick={() => setExpandedModuleId(isModExpanded ? null : modKey)}
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                                        Module {modIdx + 1}
                                      </span>
                                      {mod.duration_hours && (
                                        <span className="text-[10px] font-semibold text-stone-500">
                                          • {mod.duration_hours} Hours
                                        </span>
                                      )}
                                      {modCompleted === modTotal && modTotal > 0 && (
                                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.2 rounded-full">
                                          Completed
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs font-bold text-stone-900 mt-0.5">{mod.title}</div>
                                    <div className="text-[11px] text-stone-500 mt-0.5">{mod.description}</div>
                                  </div>

                                  <div className="flex items-center gap-2.5 shrink-0">
                                    <span className="text-[10px] font-semibold text-stone-600 bg-white border border-stone-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                                      {modCompleted}/{modTotal} Lessons
                                    </span>
                                    {isModExpanded ? <ChevronDown className="w-4 h-4 text-stone-500" /> : <ChevronRight className="w-4 h-4 text-stone-500" />}
                                  </div>
                                </div>

                                {/* Lessons detail */}
                                {isModExpanded && mod.lessons && mod.lessons.length > 0 && (
                                  <div className="space-y-2.5 pt-2 border-t border-stone-200/60">
                                    {mod.lessons.map((lesson, lIdx) => {
                                      const isDone = lesson.completed || false;
                                      return (
                                        <div
                                          key={lIdx}
                                          className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                            isDone ? 'bg-emerald-50/30 border-emerald-200/70' : 'bg-white border-stone-200/80 hover:border-stone-300 shadow-2xs'
                                          }`}
                                        >
                                          <div className="space-y-1.5 flex-1 cursor-pointer" onClick={() => openStudyLesson(course, modIdx, lIdx)}>
                                            <div className="flex items-center gap-2">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleToggleLesson(course.id, lesson.lesson_id || lesson.title);
                                                }}
                                                className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                                                  isDone ? 'bg-emerald-600 text-white' : 'border border-stone-300 hover:border-stone-500 bg-white'
                                                }`}
                                                title={isDone ? 'Mark uncompleted' : 'Mark completed'}
                                              >
                                                {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                                              </button>
                                              <span className={`text-xs font-bold ${isDone ? 'text-stone-500 line-through' : 'text-stone-900'}`}>
                                                Lesson {lIdx + 1}: {lesson.title}
                                              </span>
                                              {lesson.duration_minutes && (
                                                <span className="text-[10px] font-medium text-stone-500 flex items-center gap-0.5 ml-1">
                                                  <Clock className="w-3 h-3 text-stone-400" />
                                                  <span>{lesson.duration_minutes}m</span>
                                                </span>
                                              )}
                                            </div>

                                            <div className="text-[11px] text-stone-500 pl-6 leading-relaxed line-clamp-1">
                                              {lesson.objective}
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-2 pl-6 sm:pl-0 shrink-0">
                                            <button
                                              onClick={() => openStudyLesson(course, modIdx, lIdx)}
                                              className="px-3 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold transition-colors flex items-center gap-1"
                                            >
                                              <BookOpen className="w-3 h-3 text-stone-600" />
                                              <span>Study Lesson</span>
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            isReady && (
              <div className="p-12 text-center bg-white rounded-3xl border border-stone-200 shadow-2xs space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-stone-900">Your Diagnostic Profile is Ready!</h4>
                <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                  Click below to synthesize your customized multi-module curriculum based on your monitored study notes, test misconceptions, and syllabus.
                </p>
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Synthesize Personalized Course</span>
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* TAB 2: OPEN-SOURCE & WEB COURSES */}
      {activeTab === 'open_source' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-stone-200/90 shadow-2xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search courses, universities, or topics..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs focus:outline-hidden focus:border-stone-400 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 text-xs text-stone-600 bg-stone-50">
                <Filter className="w-3.5 h-3.5 text-stone-400" />
                <select
                  value={selectedPlatform}
                  onChange={e => setSelectedPlatform(e.target.value)}
                  className="bg-transparent border-none text-xs font-medium focus:outline-hidden text-stone-700 cursor-pointer"
                >
                  <option value="all">All Sources</option>
                  <option value="nptel">NPTEL / Swayam (IITs)</option>
                  <option value="github">GitHub Curated</option>
                  <option value="stanford">Stanford Open</option>
                  <option value="mit">MIT OpenCourseWare</option>
                  <option value="fast.ai">Fast.ai</option>
                </select>
              </div>

              <button
                onClick={handleSyncGitHub}
                disabled={syncing}
                className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                title="Sync live repositories from GitHub API"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Syncing...' : 'Sync Live'}</span>
              </button>
            </div>
          </div>

          {/* Curated Open Source Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOpenSource.map(course => {
              const isNptel = (course.source_platform || '').toLowerCase().includes('nptel') || 
                              (course.title || '').toLowerCase().includes('nptel') ||
                              (course.tags || []).some(t => t.toLowerCase().includes('nptel'));

              return (
                <div
                  key={course.id}
                  className={`rounded-3xl border p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4 ${
                    isNptel ? 'bg-gradient-to-b from-amber-50/30 to-white border-amber-200/90' : 'bg-white border-stone-200/90'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        isNptel
                          ? 'bg-amber-100/80 text-amber-900 border-amber-300 font-bold'
                          : 'bg-stone-100 text-stone-700 border-stone-200'
                      }`}>
                        {isNptel ? `🏛️ ${course.source_platform || 'NPTEL (IITs)'}` : (course.source_platform || 'Open-Source')}
                      </span>
                      {course.github_stars !== undefined && course.github_stars > 0 && (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1 shrink-0">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                          <span>{course.github_stars.toLocaleString()}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-stone-900 line-clamp-2 leading-snug">{course.title}</h3>
                    <p className="text-xs text-stone-500 line-clamp-3 leading-relaxed">{course.description}</p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-stone-100">
                    <div className="flex flex-wrap gap-1.5">
                      {course.tags?.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                            tag.toLowerCase().includes('nptel') || tag.toLowerCase().includes('iit') || tag.toLowerCase().includes('credit')
                              ? 'bg-amber-50 text-amber-800 border-amber-200 font-semibold'
                              : 'bg-stone-50 text-stone-600 border-stone-200/60'
                          }`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-[11px] font-medium text-stone-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span>{course.estimated_hours}h coursework</span>
                      </span>

                      {course.external_url && (
                        <a
                          href={course.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center gap-1 text-[11px] font-bold transition-colors ${
                            isNptel
                              ? 'text-amber-900 hover:text-amber-700 underline'
                              : 'text-stone-900 hover:text-stone-700 underline'
                          }`}
                        >
                          <span>{isNptel ? 'Enroll on Swayam' : 'Open Resource'}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* GENERATE PERSONALIZED COURSE MODAL */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Create Personalized Course</h3>
                  <p className="text-xs text-stone-500">Tailored to your quiz results, notes, and study pace</p>
                </div>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                disabled={generating}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {generating ? (
              <div className="py-8 text-center space-y-4">
                <RefreshCw className="w-8 h-8 animate-spin text-stone-800 mx-auto" />
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-stone-900">
                    {genStep === 1 && "Reviewing your quiz results and identifying key topics..."}
                    {genStep === 2 && "Designing custom lesson modules from your notes..."}
                    {genStep >= 3 && "Planning hands-on exercises and realistic study hours..."}
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Mentor Mate AI is building your custom modules with complete lessons.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2 text-xs">
                  <div className="font-semibold text-stone-700">Course Grounded In:</div>
                  <ul className="space-y-1 text-stone-600 text-[11px] list-disc list-inside">
                    <li>Field: <strong>{field}</strong></li>
                    <li>Uploaded notes: <strong>{readiness?.metrics.resource_titles.join(', ') || 'Uploaded Notes'}</strong></li>
                    <li>Topics needing practice: <strong>Dynamic Dispatch & Object Architecture</strong></li>
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700">
                    Optional Topic Focus or Goal:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Deep dive into Polymorphism and dynamic object design"
                    value={customFocus}
                    onChange={e => setCustomFocus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:outline-hidden focus:border-stone-400"
                  />
                  <span className="text-[10px] text-stone-400">
                    Leave blank to cover all topics needing practice.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                  <button
                    onClick={() => setShowGenerateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGeneratePersonalized}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 shadow-xs flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Create Course Now</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* INTERACTIVE LESSON STUDY MODAL / DRAWER */}
      {activeLesson && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-100 flex items-center justify-between shrink-0 bg-stone-50/50">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-200 text-stone-700">
                    {activeLesson.moduleTitle.split(':')[0]}
                  </span>
                  <span className="text-[11px] font-medium text-stone-500">
                    Lesson {activeLesson.lessonIndex + 1} of {activeLesson.totalLessonsInCourse}
                  </span>
                  {activeLesson.lesson.duration_minutes && (
                    <span className="text-[11px] font-semibold text-stone-600 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-400" />
                      <span>{activeLesson.lesson.duration_minutes}m</span>
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-stone-900 mt-1">
                  {activeLesson.lesson.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleLesson(activeLesson.courseId, activeLesson.lesson.lesson_id || activeLesson.lesson.title)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    activeLesson.lesson.completed
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-stone-900 text-white hover:bg-stone-800'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{activeLesson.lesson.completed ? 'Completed' : 'Mark Completed'}</span>
                </button>
                <button
                  onClick={() => setActiveLesson(null)}
                  className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Learning Objective */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80">
                <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Learning Objective
                </div>
                <div className="text-xs font-semibold text-stone-800 mt-1 leading-relaxed">
                  {activeLesson.lesson.objective}
                </div>
              </div>

              {/* Remedial Focus Alert */}
              {activeLesson.lesson.remedial_focus && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 text-xs text-amber-950 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-700" />
                    <span>Diagnostic Test Misconception Focus</span>
                  </div>
                  <p className="leading-relaxed text-[11px] text-amber-900/90">
                    {activeLesson.lesson.remedial_focus}
                  </p>
                </div>
              )}

              {/* Theory Content */}
              {activeLesson.lesson.theory_content && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-stone-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-stone-700" />
                    <span>Academic Theory & Deep Conceptual Notes</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-stone-200/90 text-xs text-stone-700 leading-relaxed space-y-3 font-normal">
                    {activeLesson.lesson.theory_content.split('\n\n').map((para, pIdx) => (
                      <p key={pIdx}>{para}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Code Snippet Lab */}
              {activeLesson.lesson.code_snippet && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="font-bold text-stone-900 flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-stone-700" />
                      <span>Architecture Implementation Lab</span>
                    </div>
                    <button
                      onClick={() => handleCopyCode(activeLesson.lesson.code_snippet || '')}
                      className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                    >
                      {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-stone-500" />}
                      <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>
                  <pre className="p-4 rounded-2xl bg-stone-950 text-stone-100 text-xs font-mono overflow-x-auto leading-relaxed border border-stone-800">
                    <code>{activeLesson.lesson.code_snippet}</code>
                  </pre>
                </div>
              )}

              {/* Practice Challenge */}
              {activeLesson.lesson.practice_prompt && (
                <div className="p-4 rounded-2xl bg-stone-900 text-stone-200 space-y-2 border border-stone-800">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Hands-On Practice Challenge
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed font-mono">
                    {activeLesson.lesson.practice_prompt}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer: Navigation Controls */}
            <div className="p-4 border-t border-stone-100 flex items-center justify-between shrink-0 bg-stone-50/50">
              <button
                onClick={() => navigateLesson('prev')}
                className="px-3.5 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-xs font-semibold text-stone-700 flex items-center gap-1.5 shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous Lesson</span>
              </button>

              {onNavigate && (
                <button
                  onClick={() => {
                    setActiveLesson(null);
                    onNavigate('chat');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                  <span>Ask Mentor Mate About This</span>
                </button>
              )}

              <button
                onClick={() => navigateLesson('next')}
                className="px-3.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-xs font-semibold text-white flex items-center gap-1.5 shadow-xs"
              >
                <span>Next Lesson</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
