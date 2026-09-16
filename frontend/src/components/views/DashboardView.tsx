"use client";

import React, { useEffect, useState } from 'react';
import { api, DashboardData, ResourceItem, StudyFolder } from '@/lib/api';
import {
  Brain,
  Flame,
  Clock,
  BookOpen,
  Target,
  Sparkles,
  ArrowRight,
  RefreshCw,
  GraduationCap,
  FileText,
  ImageIcon,
  Search,
  CheckCircle2,
  Folder,
  MessageSquare,
  Edit3,
  Calendar,
  X,
  Check,
  AlertTriangle,
  Briefcase,
  Heart
} from 'lucide-react';


interface Props {
  onNavigate: (view: string, resourceId?: string, folderId?: string) => void;
}

export function DashboardView({ onNavigate }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentResources, setRecentResources] = useState<ResourceItem[]>([]);
  const [folders, setFolders] = useState<StudyFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Profile modal state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editGoalText, setEditGoalText] = useState('');
  const [editEducationTier, setEditEducationTier] = useState('');
  const [editBoard, setEditBoard] = useState('');
  const [editDailyHours, setEditDailyHours] = useState(3.5);
  const [editDaysToExam, setEditDaysToExam] = useState<string>('');
  const [savingProfile, setSavingProfile] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [dashRes, resList, folderList] = await Promise.all([
        api.getDashboard(),
        api.listResources().catch(() => [] as ResourceItem[]),
        api.listFolders().catch(() => [] as StudyFolder[])
      ]);
      setData(dashRes);
      setRecentResources(resList.slice(0, 3));
      setFolders(folderList);

      // Prepopulate edit modal
      if (dashRes?.student) {
        setEditName(dashRes.student.name || '');
        setEditGoalText(dashRes.student.goal || '');
        setEditEducationTier(dashRes.student.education_tier || 'Class 10 (10th Boards)');
        setEditDailyHours(dashRes.student.daily_available_hours || 3.5);
        setEditDaysToExam(dashRes.student.days_to_exam != null ? String(dashRes.student.days_to_exam) : '');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load your study overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const days = editDaysToExam.trim() !== '' ? parseInt(editDaysToExam.trim(), 10) : null;
      await api.updateProfile({
        name: editName.trim() || undefined,
        goal: editGoalText.trim() || undefined,
        education_tier: editEducationTier.trim() || undefined,
        board_or_university: editBoard.trim() || undefined,
        daily_available_hours: editDailyHours,
        days_to_exam: days
      });
      setIsEditingProfile(false);
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Unable to update study profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-stone-500 gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-stone-700" />
        <span className="text-xs font-medium">Loading your study overview...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
        {error || 'Unable to load study overview.'}
        <button
          onClick={fetchDashboardData}
          className="ml-4 underline font-medium text-rose-800 hover:text-rose-900"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { student, metrics, priority_focus, recent_assessments } = data;

  const isImage = (type?: string) => type && ['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(type.toLowerCase());
  const isPdf = (type?: string) => type && type.toLowerCase() === 'pdf';

  // Smart study flow: determine current guided next action
  const getGuidedNextStep = () => {
    if (metrics.resource_count === 0) {
      return {
        stepNumber: '1',
        title: 'Step 1: Upload Your Course Materials',
        description: 'Add your lecture slides, syllabus, or handwritten notes to unlock AI tutoring and practice tests.',
        buttonText: 'Upload Materials',
        action: 'resources'
      };
    }
    if (metrics.assessments_completed === 0) {
      return {
        stepNumber: '2',
        title: 'Step 2: Take Your Initial Diagnostic Quiz',
        description: `Gauge your baseline understanding in ${student.goal || 'your subject'} to identify strong areas and topics to focus on.`,
        buttonText: 'Start Diagnostic Quiz',
        action: 'assessments'
      };
    }
    if (metrics.due_revisions_count > 0) {
      return {
        stepNumber: '3',
        title: `${metrics.due_revisions_count} Topics Due for Spaced Review`,
        description: 'Strengthen your memory before key concepts fade. A quick 3-minute review locks them into long-term retention.',
        buttonText: 'Start Timely Review',
        action: 'revision'
      };
    }
    if (priority_focus) {
      const topicName = priority_focus.concept_name || priority_focus.title || 'Key Topics';
      return {
        stepNumber: 'Next',
        title: `Practice Focus: ${topicName}`,
        description: priority_focus.reason || 'Work through a set of targeted questions to strengthen your mastery.',
        buttonText: 'Practice This Topic',
        action: priority_focus.action || 'assessments'
      };
    }
    return {
      stepNumber: 'Next',
      title: 'Continue Daily Study Practice',
      description: 'Ask doubts from your notes, review key concepts with your mentor, or test your readiness.',
      buttonText: 'Open Study Mentor',
      action: 'mentor'
    };
  };

  const nextStep = getGuidedNextStep();

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. TOP WELCOME & STUDY PACING BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs">
        <div className="flex items-start gap-4">
          <img src="/logo.png" alt="Mentor Mate" className="h-12 w-auto max-w-[160px] rounded-xl object-contain shadow-2xs shrink-0 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Student Space</span>
              <span className="text-stone-300">•</span>
              <span className="text-xs text-stone-600">{student.education_tier || 'Academic Degree'}</span>
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                Welcome back, {student.name}
              </h1>
              <button
                onClick={() => setIsEditingProfile(true)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-all border border-stone-200/60 hover:border-stone-300 shadow-2xs group flex items-center gap-1"
                title="Edit Student Profile (Name, Goal, Daily Target, Education Tier)"
              >
                <Edit3 className="w-3.5 h-3.5 text-stone-500 group-hover:text-stone-900" />
                <span className="text-[10px] font-medium text-stone-500 group-hover:text-stone-900 hidden sm:inline">Edit Profile</span>
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-500 mt-1 flex-wrap">
              <span>Goal: <strong className="text-stone-800 font-medium">{student.goal || 'General Mastery'}</strong></span>
              <span>•</span>
              <span>Daily Target: <strong className="text-stone-800 font-medium">{student.daily_available_hours} hours</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Study Streak */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 shadow-2xs">
            <Flame className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <div className="text-[10px] font-medium text-amber-700 uppercase tracking-wider">Study Streak</div>
              <div className="text-sm font-bold text-stone-900">{student.streak_days || 1} Days</div>
            </div>
          </div>

          {/* Exam Countdown or Self-Paced Badge */}
          {student.days_to_exam != null && student.days_to_exam > 0 ? (
            <div
              onClick={() => setIsEditingProfile(true)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-900 shadow-2xs cursor-pointer hover:bg-blue-100/70 transition-colors"
              title="Click to adjust exam date"
            >
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <div className="text-[10px] font-medium text-blue-700 uppercase tracking-wider">Exam In</div>
                <div className="text-sm font-bold text-stone-900">{student.days_to_exam} Days</div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingProfile(true)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-700 shadow-2xs cursor-pointer hover:bg-stone-100 transition-colors"
              title="Click to set an exam target date"
            >
              <Clock className="w-4 h-4 text-stone-500 shrink-0" />
              <div>
                <div className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">Study Pacing</div>
                <div className="text-xs font-semibold text-stone-800 flex items-center gap-1">
                  <span>Self-Paced</span>
                  <span className="text-[10px] text-stone-400 underline">+ Set Date</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. FOUR KEY METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium text-stone-600">Overall Mastery</span>
            <Brain className="w-4 h-4 text-stone-700" />
          </div>
          <div className="text-2xl font-bold text-stone-900">
            {metrics.average_mastery_percent !== null ? `${metrics.average_mastery_percent}%` : '--'}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            {metrics.average_mastery_percent !== null ? 'Evaluated across practice quizzes' : 'Take a quiz to calculate baseline'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium text-stone-600">Quizzes Completed</span>
            <Target className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-stone-900">
            {metrics.assessments_completed}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            Practice questions evaluated
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium text-stone-600">Reviews Due Today</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-stone-900">
            {metrics.due_revisions_count} Topics
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            Scheduled to strengthen retention
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-medium text-stone-600">Course Materials</span>
            <BookOpen className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-stone-900">
            {metrics.resource_count} Documents
          </div>
          <div className="text-[11px] text-stone-400 mt-1">
            Indexed for questions & citations
          </div>
        </div>

      </div>

      {/* FORGETTING CURVE & MEMORY DECAY ALERT CARD (IF CONCEPTS ARE FADING) */}
      {data?.at_risk_revisions && data.at_risk_revisions.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-rose-50/50 border border-amber-300/80 shadow-2xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/70 pb-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-300 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-stone-900">
                    Memory Reminder • Topics to Review
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-200 text-amber-900 uppercase tracking-wider">
                    {data.at_risk_revisions.length} Topic{data.at_risk_revisions.length > 1 ? 's' : ''} Fading
                  </span>
                </div>
                <p className="text-xs text-amber-900/80 mt-0.5">
                  These topics were learned a while ago and your memory might be fading. Take a quick 2-minute review now to keep them fresh!
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('revision')}
              className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-all self-start sm:self-center"
            >
              <span>Quick Revision</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {data.at_risk_revisions.slice(0, 3).map((item) => (
              <div
                key={item.id}
                onClick={() => onNavigate('revision')}
                className="p-3 rounded-xl bg-white/95 hover:bg-white border border-amber-200/90 text-xs cursor-pointer shadow-2xs transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-stone-900 truncate">
                    {item.title}
                  </span>
                  <span className="text-[11px] font-bold text-amber-700 shrink-0">
                    {item.retention_percent}% Retained
                  </span>
                </div>

                <div className="w-full bg-amber-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(8, item.retention_percent))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-stone-500">
                  <span className="capitalize">{item.revision_type === 'field_curriculum' ? 'Field Curriculum' : 'Study Notes'}</span>
                  <span className="text-amber-800 font-medium">{item.days_since_reviewed}d since study</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. RECOMMENDED NEXT ACTION (SMART STUDY GUIDANCE) */}
      <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">

        <div>
          <div className="flex items-center gap-1.5 text-amber-800 text-xs font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Recommended Next Step</span>
          </div>
          <h3 className="text-base font-bold text-stone-900">
            {nextStep.title}
          </h3>
          <p className="text-xs text-stone-600 mt-0.5 max-w-2xl">
            {nextStep.description}
          </p>
        </div>

        <button
          onClick={() => onNavigate(nextStep.action)}
          className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <span>{nextStep.buttonText}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4. MAIN CONTENT: RECENT MATERIALS (LEFT) & QUICK STUDY TOOLS (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Recent Course Materials & Study Units */}
        <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-stone-600" />
                <span>Your Study Materials</span>
              </h3>
              <button
                onClick={() => onNavigate('resources')}
                className="text-xs text-stone-500 hover:text-stone-900 font-medium transition-colors"
              >
                View All ({metrics.resource_count}) →
              </button>
            </div>

            {recentResources.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400 border border-dashed border-stone-200 rounded-xl p-6 bg-stone-50/50">
                <FileText className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="font-medium text-stone-700">No study materials uploaded yet</p>
                <p className="text-[11px] text-stone-400 mt-1">Upload lecture slides, notes, or past papers to start asking questions.</p>
                <button
                  onClick={() => onNavigate('resources')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors"
                >
                  Upload First Document
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentResources.map((res) => {
                  const folder = folders.find(f => f.id === res.folder_id);
                  return (
                    <div
                      key={res.id}
                      className="p-3 rounded-xl bg-stone-50/80 hover:bg-stone-100/70 border border-stone-200/70 flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white border border-stone-200 text-stone-700 shadow-2xs shrink-0">
                          {isImage(res.file_type) ? (
                            <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-stone-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-stone-900 truncate">
                            {res.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-0.5">
                            {folder ? (
                              <span className="inline-flex items-center gap-1 text-stone-600 font-medium">
                                <Folder className="w-3 h-3 text-amber-600" />
                                <span>{folder.name}</span>
                              </span>
                            ) : (
                              <span>General</span>
                            )}
                            <span>•</span>
                            <span className="uppercase">{res.file_type}</span>
                            {res.is_verified && (
                              <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                                <Check className="w-3 h-3" />
                                <span>Verified</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onNavigate('resource-ai', res.id, res.folder_id || undefined)}
                        className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-stone-200/80 border border-stone-200 text-xs font-medium text-stone-700 hover:text-stone-900 transition-colors shrink-0 shadow-2xs flex items-center gap-1 cursor-pointer"
                        title="Ask questions to this document"
                      >
                        <Search className="w-3 h-3 text-stone-500" />
                        <span>Ask Notes</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs">
            <span className="text-stone-500 text-[11px]">Group documents into Study Units for combined queries.</span>
            <button
              onClick={() => onNavigate('resources')}
              className="text-xs font-semibold text-stone-800 hover:text-stone-900 underline"
            >
              Organize Units
            </button>
          </div>
        </div>

        {/* Right Column: Quick Study Tools */}
        <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-900 mb-1">Your Study Tools</h3>
            <p className="text-xs text-stone-500 mb-4">
              Jump directly to any part of your learning workspace:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            <button
              onClick={() => onNavigate('resources')}
              className="p-3.5 rounded-xl bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-200/70 text-left transition-all group cursor-pointer shadow-2xs"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-100/80 text-emerald-800 flex items-center justify-center mb-2">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-stone-900 flex items-center justify-between">
                <span>1. Study Notes</span>
                <ArrowRight className="w-3 h-3 text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">Upload notes & get instant solutions</div>
            </button>

            <button
              onClick={() => onNavigate('mentor')}
              className="p-3.5 rounded-xl bg-sky-50/50 hover:bg-sky-50 border border-sky-200/70 text-left transition-all group cursor-pointer shadow-2xs"
            >
              <div className="w-7 h-7 rounded-lg bg-sky-100/80 text-sky-800 flex items-center justify-center mb-2">
                <Brain className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-stone-900 flex items-center justify-between">
                <span>2. Study Mentor</span>
                <ArrowRight className="w-3 h-3 text-sky-700 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">Socratic tutor for deep concept mastery</div>
            </button>

            <button
              onClick={() => onNavigate('career')}
              className="p-3.5 rounded-xl bg-amber-50/50 hover:bg-amber-50 border border-amber-200/70 text-left transition-all group cursor-pointer shadow-2xs"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-100/80 text-amber-800 flex items-center justify-center mb-2">
                <Briefcase className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-stone-900 flex items-center justify-between">
                <span>3. Career Radar</span>
                <ArrowRight className="w-3 h-3 text-amber-700 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">What Google, Amazon & top firms expect</div>
            </button>

            <button
              onClick={() => onNavigate('wellbeing')}
              className="p-3.5 rounded-xl bg-rose-50/50 hover:bg-rose-50 border border-rose-200/70 text-left transition-all group cursor-pointer shadow-2xs"
            >
              <div className="w-7 h-7 rounded-lg bg-rose-100/80 text-rose-800 flex items-center justify-center mb-2">
                <Heart className="w-4 h-4" />
              </div>
              <div className="text-xs font-semibold text-stone-900 flex items-center justify-between">
                <span>4. Well-Being Shield</span>
                <ArrowRight className="w-3 h-3 text-rose-700 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-[11px] text-stone-500 mt-0.5">Burnout check-in & 2-min breath reset</div>
            </button>

          </div>
        </div>

      </div>

      {/* 5. RECENT PRACTICE ACTIVITY (QUIZ HISTORY OR CALL TO ACTION) */}
      <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
            <Target className="w-4 h-4 text-stone-600" />
            <span>Recent Practice Activity</span>
          </h3>
          {recent_assessments.length > 0 && (
            <button
              onClick={() => onNavigate('progress')}
              className="text-xs text-stone-500 hover:text-stone-900 font-medium transition-colors"
            >
              Full Progress Report →
            </button>
          )}
        </div>

        {recent_assessments.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-400 bg-stone-50/50 rounded-xl border border-stone-100 p-6 flex flex-col items-center justify-center">
            <p className="text-stone-600 font-medium">No practice quizzes completed yet</p>
            <p className="text-[11px] text-stone-400 mt-1 max-w-md">
              Take a short 5-minute quiz to evaluate your baseline strengths and generate your topic roadmap.
            </p>
            <button
              onClick={() => onNavigate('assessments')}
              className="mt-3 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition-colors shadow-2xs"
            >
              Take 5-Min Diagnostic Quiz
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recent_assessments.map((item, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-stone-50/80 border border-stone-200/60 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-stone-800">{item.title}</div>
                  <div className="text-[11px] text-stone-500 mt-0.5">Proficiency: {item.proficiency_tier}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-700">{item.percentage}%</div>
                  <div className="text-[11px] text-stone-400">{item.score}/{item.total} correct</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. MODAL: EDIT STUDENT PROFILE (NAME, GOAL, DAILY TARGET, TIER, EXAM) */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-stone-900 text-white">
                  <Edit3 className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Edit Student Profile</h3>
                  <p className="text-[11px] text-stone-500">Update your name, study targets, and academic goals</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-stone-700 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Yadnesh"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-900 transition-colors"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Primary Study Goal / Career Target
                </label>
                <input
                  type="text"
                  value={editGoalText}
                  onChange={(e) => setEditGoalText(e.target.value)}
                  placeholder="e.g. Software Engineer @ Google, AI/ML Specialist, GATE 2026"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-900 transition-colors"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {['AI/ML Engineer', 'Full Stack SWE', 'Quant Trading', 'GATE Exam', 'Semester Finals'].map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setEditGoalText(g)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors"
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-bold uppercase tracking-wider text-[10px] mb-1">
                  Education Tier / Academic Level
                </label>
                <input
                  type="text"
                  value={editEducationTier}
                  onChange={(e) => setEditEducationTier(e.target.value)}
                  placeholder="e.g. B.Tech Computer Science (Final Year), Class 12 Boards"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-900 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Daily Target (Hours)
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    max="16"
                    step="0.5"
                    value={editDailyHours}
                    onChange={(e) => setEditDailyHours(parseFloat(e.target.value) || 2.0)}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-900 transition-colors"
                  />
                  <div className="flex gap-1 mt-1.5">
                    {[2, 3.5, 5, 8].map((h) => (
                      <button
                        type="button"
                        key={h}
                        onClick={() => setEditDailyHours(h)}
                        className={`text-[10px] px-2 py-0.5 rounded-md transition-colors ${
                          editDailyHours === h
                            ? 'bg-stone-900 text-white font-bold'
                            : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                        }`}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-stone-700 font-bold uppercase tracking-wider text-[10px] mb-1">
                    Days to Exam / Deadline
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={editDaysToExam}
                    onChange={(e) => setEditDaysToExam(e.target.value)}
                    placeholder="e.g. 45 (or leave empty)"
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-stone-900 focus:bg-white focus:outline-none focus:border-stone-900 transition-colors"
                  />
                  <span className="text-[10px] text-stone-400 mt-1 block">Blank = Self-Paced</span>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-3.5 py-2 rounded-xl text-stone-600 hover:bg-stone-100 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-amber-300" />
                  <span>{savingProfile ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
