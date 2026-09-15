"use client";

import React, { useState, useEffect } from 'react';
import { api, User } from '@/lib/api';
import { AuthModal } from '@/components/AuthModal';
import { LandingPage } from '@/components/LandingPage';
import { DashboardView } from '@/components/views/DashboardView';
import { ResourcesView } from '@/components/views/ResourcesView';
import { ResourceAiChatView } from '@/components/views/ResourceAiChatView';
import { AskMentorView } from '@/components/views/AskMentorView';
import { AssessmentView } from '@/components/views/AssessmentView';
import { RevisionView } from '@/components/views/RevisionView';
import { ProgressView } from '@/components/views/ProgressView';
import { ScheduleView } from '@/components/views/ScheduleView';
import { CourseView } from '@/components/views/CourseView';
import { CareerView } from '@/components/views/CareerView';
import { WellbeingView } from '@/components/views/WellbeingView';
import {
  Brain,
  Sparkles,
  BookOpen,
  Target,
  Clock,
  BarChart3,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Database,
  Cpu,
  Layers,
  CheckCircle2,
  FileCode2,
  Terminal,
  Compass,
  GraduationCap,
  Calendar,
  BookMarked,
  Briefcase,
  Heart
} from 'lucide-react';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [activeView, setActiveView] = useState<'dashboard' | 'resources' | 'mentor' | 'assessments' | 'revision' | 'progress' | 'schedule' | 'courses' | 'career' | 'wellbeing'>('dashboard');
  const [targetResourceId, setTargetResourceId] = useState<string | undefined>(undefined);
  const [targetFolderId, setTargetFolderId] = useState<string | undefined>(undefined);
  const [initialNotesTab, setInitialNotesTab] = useState<'materials' | 'solutions'>('materials');
  const [checkingAuth, setCheckingAuth] = useState(true);


  useEffect(() => {
    // Check if authenticated
    const token = api.getToken();
    if (token) {
      api.getCurrentUser()
        .then(u => setCurrentUser(u))
        .catch(() => {
          api.logout();
          setCurrentUser(null);
        })
        .finally(() => setCheckingAuth(false));
    } else {
      setCheckingAuth(false);
    }
  }, []);

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  const handleOpenAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleAskResource = (resourceId?: string, folderId?: string) => {
    setTargetResourceId(resourceId || undefined);
    setTargetFolderId(folderId || undefined);
    setInitialNotesTab('solutions');
    setActiveView('resources');
  };

  // If student is logged in, show the comprehensive Product Workspace
  if (currentUser) {
    return (
      <div className="min-h-screen bg-[#faf9f5] text-stone-900 flex flex-col font-sans selection:bg-stone-200">
        {/* Workspace Top Navigation Bar */}
        <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 backdrop-blur-md shadow-xs">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
            {/* Brand Logo */}
            <div className="flex items-center gap-2.5 cursor-pointer shrink-0" onClick={() => setActiveView('dashboard')}>
              <img src="/logo.png" alt="Mentor Mate" className="h-8 w-auto max-w-[120px] rounded-lg object-contain shadow-2xs" />
              <div className="hidden sm:block">
                <div className="text-sm font-semibold tracking-tight text-stone-900 flex items-center gap-1.5 leading-tight">
                  Mentor Mate
                </div>
                <div className="text-[10px] text-stone-500 leading-tight">Your Study Companion</div>
              </div>
            </div>

            {/* Navigation Items (Refined compact layout with zero overlap) */}
            <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1 overflow-x-auto py-1">
              {[
                { id: 'dashboard', label: 'Overview', icon: BarChart3 },
                { id: 'resources', label: 'Study Notes', icon: BookOpen },
                { id: 'mentor', label: 'Study Mentor', icon: Brain },
                { id: 'assessments', label: 'Practice Quiz', icon: Target },
                { id: 'revision', label: 'Smart Review', icon: Clock },
                { id: 'progress', label: 'My Progress', icon: Compass },
                { id: 'schedule', label: 'Schedule', icon: Calendar },
                { id: 'courses', label: 'Courses', icon: BookMarked },
                { id: 'career', label: 'Career Radar', icon: Briefcase },
                { id: 'wellbeing', label: 'Well-Being', icon: Heart },
              ].map(item => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'resources') {
                        setInitialNotesTab('materials');
                        setTargetResourceId(undefined);
                        setTargetFolderId(undefined);
                      }
                      setActiveView(item.id as any);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                      isActive
                        ? "bg-stone-900 text-white shadow-xs font-semibold"
                        : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Profile & Logout (Protected with shrink-0) */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden md:block text-right">
                <div className="text-xs font-semibold text-stone-800 leading-tight">{currentUser.name}</div>
                <div className="text-[10px] text-stone-500 leading-tight">{currentUser.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl bg-stone-100 hover:bg-rose-50 hover:text-rose-600 text-stone-600 border border-stone-200/60 transition-colors shrink-0"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile & Tablet Navigation Scroll */}
          <div className="lg:hidden flex items-center gap-1 overflow-x-auto px-4 py-2 border-t border-stone-200/80 bg-stone-50/80 scrollbar-none">
            {[
              { id: 'dashboard', label: 'Overview' },
              { id: 'resources', label: 'Study Notes' },
              { id: 'mentor', label: 'Mentor' },
              { id: 'assessments', label: 'Quiz' },
              { id: 'revision', label: 'Review' },
              { id: 'progress', label: 'Progress' },
              { id: 'schedule', label: 'Schedule' },
              { id: 'courses', label: 'Courses' },
              { id: 'career', label: 'Career' },
              { id: 'wellbeing', label: 'Well-Being' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'resources') {
                    setInitialNotesTab('materials');
                    setTargetResourceId(undefined);
                    setTargetFolderId(undefined);
                  }
                  setActiveView(item.id as any);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap font-medium shrink-0 transition-all ${
                  activeView === item.id ? "bg-stone-900 text-white font-semibold" : "text-stone-600 hover:bg-stone-200/60"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        {/* Workspace Body */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
          {activeView === 'dashboard' && (
            <DashboardView
              onNavigate={(view, resId, folderId) => {
                if (resId || folderId || view === 'resource-ai' || view === 'resources') {
                  handleAskResource(resId, folderId);
                } else {
                  setActiveView(view as any);
                }
              }}
            />
          )}
          {activeView === 'resources' && (
            <ResourcesView
              initialTab={initialNotesTab}
              initialResourceId={targetResourceId}
              initialFolderId={targetFolderId}
              onNavigateToMentor={() => setActiveView('mentor')}
              onAskResource={handleAskResource}
            />
          )}
          {activeView === 'mentor' && <AskMentorView />}

          {activeView === 'assessments' && <AssessmentView />}
          {activeView === 'revision' && <RevisionView />}
          {activeView === 'progress' && <ProgressView onNavigate={(view) => setActiveView(view as any)} />}
          {activeView === 'schedule' && <ScheduleView />}
          {activeView === 'courses' && <CourseView onNavigate={(view) => setActiveView(view as any)} />}
          {activeView === 'career' && <CareerView onNavigateToStudy={() => setActiveView('assessments')} />}
          {activeView === 'wellbeing' && <WellbeingView onNavigateToSchedule={() => setActiveView('schedule')} />}
        </main>

      </div>
    );
  }

  // PUBLIC VISITOR: Completely Reformed Student-Centered Landing Page
  return (
    <>
      <LandingPage onOpenAuth={handleOpenAuth} />

      {/* Authentication & Onboarding Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
        onSuccess={(user) => {
          setCurrentUser(user);
          setActiveView('dashboard');
        }}
      />
    </>
  );
}

