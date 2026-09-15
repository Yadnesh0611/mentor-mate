"use client";

import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  BookOpen,
  Brain,
  Target,
  Clock,
  CheckCircle2,
  Folder,
  FileText,
  Lightbulb,
  Check,
  ChevronRight,
  Shield,
  Zap,
  Quote,
  Search,
  MessageSquare,
  HelpCircle,
  Eye,
  Layers,
  BarChart3
} from 'lucide-react';

interface LandingPageProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export function LandingPage({ onOpenAuth }: LandingPageProps) {
  const [activeFeatureTab, setActiveFeatureTab] = useState<'materials' | 'grounded' | 'mentor' | 'retention'>('materials');
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setFaqOpen(prev => prev === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-[#faf9f5] text-stone-900 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
      
      {/* 1. FLOATING GLASSMORPHIC NAVIGATION BAR */}
      <header className="sticky top-3 z-50 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto rounded-2xl border border-stone-200/80 bg-white/80 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs transition-all">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Mentor Mate" className="h-9 w-auto max-w-[140px] rounded-xl object-contain shadow-2xs" />
            <div className="hidden sm:block">
              <span className="text-sm font-bold tracking-tight text-stone-900">Mentor Mate</span>
              <span className="text-[10px] text-stone-400 font-medium ml-2 border-l border-stone-200 pl-2">
                Your Academic Companion
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-stone-600">
            <a href="#solutions" className="hover:text-stone-900 transition-colors">What It Solves</a>
            <a href="#features" className="hover:text-stone-900 transition-colors">Platform Capabilities</a>
            <a href="#how-it-works" className="hover:text-stone-900 transition-colors">How It Works</a>
            <a href="#faq" className="hover:text-stone-900 transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onOpenAuth('login')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-100/80 transition-all cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => onOpenAuth('register')}
              className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 group cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="pt-16 sm:pt-24 pb-16 px-4 text-center relative overflow-hidden">
        {/* Subtle Ambient Background Glows */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-amber-100/50 via-orange-50/40 to-sky-100/40 blur-3xl -z-10 rounded-full pointer-events-none" />

        <div className="max-w-3xl mx-auto relative z-10 space-y-6">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-stone-200/90 bg-white/90 backdrop-blur-xs text-stone-700 text-xs font-medium shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Built for genuine understanding, not shortcuts</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-900 leading-[1.15]">
            Study with clarity. <br />
            <span className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-600 bg-clip-text text-transparent">
              Walk into exams confident.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-stone-600 max-w-2xl mx-auto leading-relaxed">
            No more late-night panic, scattered lecture PDFs, or cramming only to forget everything next week.
            Mentor Mate organizes your course materials, pinpoints what needs practice, and guides your thinking step by step.
          </p>

          {/* Call to Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => onOpenAuth('register')}
              className="w-full sm:w-auto px-7 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Start Studying Free</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <a
              href="#features"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-stone-50 border border-stone-200/90 text-stone-700 text-xs sm:text-sm font-medium transition-all shadow-2xs flex items-center justify-center gap-2"
            >
              <span>Explore Capabilities</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            </a>
          </div>

          {/* Trust points */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-[11px] font-medium text-stone-500">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Works with your college syllabus & notes
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Patient guidance, not just code dumps
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Zero technical setup required
            </span>
          </div>
        </div>
      </section>

      {/* 3. PLATFORM CAPABILITIES (AUTHENTIC FEATURE EXPLORER) */}
      <section id="features" className="py-12 px-4 max-w-5xl mx-auto w-full">
        <div className="text-center mb-8 space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            Core Modules
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            Everything You Need For Focused Academic Success
          </h2>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Explore the four interconnected tools designed to take you from initial notes to exam mastery.
          </p>

          {/* Feature Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
            {[
              { id: 'materials', label: '1. Study Material OCR & Folders', icon: BookOpen },
              { id: 'grounded', label: '2. Direct Note Q&A & Citations', icon: Search },
              { id: 'mentor', label: '3. Socratic 1-on-1 Mentor', icon: Brain },
              { id: 'retention', label: '4. Practice & Spaced Review', icon: Clock },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFeatureTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    activeFeatureTab === tab.id
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200 hover:bg-stone-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Feature Display Window */}
        <div className="rounded-2xl border border-stone-200/90 bg-white shadow-lg overflow-hidden transition-all">
          <div className="px-4 py-3 border-b border-stone-200/80 bg-stone-50/70 flex items-center justify-between text-xs text-stone-500">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
              <span className="font-medium text-stone-700 ml-2">
                {activeFeatureTab === 'materials' && 'Course Materials • High-Accuracy Multimodal OCR'}
                {activeFeatureTab === 'grounded' && 'Ask Your Notes • Grounded Answers & Verifiable Citations'}
                {activeFeatureTab === 'mentor' && 'Ask Mentor • Patient Socratic Dialogue'}
                {activeFeatureTab === 'retention' && 'Memory Guard • Active Recall & Timely Review'}
              </span>
            </div>
            <span className="text-[11px] text-stone-400 font-mono">Platform Feature</span>
          </div>

          <div className="p-6 sm:p-8 bg-[#faf9f5]/50">
            {/* FEATURE 1: STUDY MATERIALS & OCR */}
            {activeFeatureTab === 'materials' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-xs">
                      <FileText className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-stone-900">Any Document Format</h4>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Upload PDFs, PowerPoint slides, Word docs, and photos of blackboard diagrams or notebook pages.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-800 flex items-center justify-center font-bold text-xs">
                      <Eye className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-stone-900">Side-by-Side Verification</h4>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Inspect extracted notes next to your original document. Verify formulas and edit any line before saving.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      <Folder className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-stone-900">Study Unit Grouping</h4>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Bundle lecture notes, syllabus outlines, and past question papers together under custom unit folders.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-stone-200/90 text-xs text-stone-600 leading-relaxed flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Handwriting Recognition:</strong> Enhanced local contrast enhancement combined with multimodal vision models extracts text accurately from handwritten notes and diagrams.
                  </span>
                </div>
              </div>
            )}

            {/* FEATURE 2: GROUNDED QA & CITATIONS */}
            {activeFeatureTab === 'grounded' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-800 flex items-center justify-center font-bold text-xs">
                      <Search className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-stone-900">Unit-Wide Search</h4>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Ask questions across an entire folder. It searches your notes, textbook references, and syllabus simultaneously.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-xs">
                      <Quote className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-stone-900">Verifiable Citations</h4>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Every statement points directly to the exact page, slide, or section of your course materials.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      <Zap className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-stone-900">Citation Toggle</h4>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Keep answers clean and clutter-free, or expand source cards whenever you need to check proof.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-stone-200/90 text-xs text-stone-600 leading-relaxed flex items-center gap-3">
                  <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Strict Grounding:</strong> If an answer isn't supported by your notes, Mentor Mate explicitly informs you instead of hallucinating made-up facts.
                  </span>
                </div>
              </div>
            )}

            {/* FEATURE 3: SOCRATIC MENTOR */}
            {activeFeatureTab === 'mentor' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-xs">
                      <Brain className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-stone-900">Patient 1-on-1 Guidance</h4>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Prompts your thinking with clarifying questions and intuitive analogies instead of just giving answers away.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-800 flex items-center justify-center font-bold text-xs">
                      <Lightbulb className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-stone-900">Step-by-Step Problem Solving</h4>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Stuck on a derivation or programming bug? Work through each step until the core concept truly clicks.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-800 flex items-center justify-center font-bold text-xs">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-stone-900">Never Judgemental</h4>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Ask as many basic or repeat questions as you need. Your mentor adapts to your pace without frustration.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-stone-200/90 text-xs text-stone-600 leading-relaxed flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Long-Term Conceptual Mastery:</strong> Socratic questioning builds genuine reasoning skills, ensuring you can solve varied problems on exam day.
                  </span>
                </div>
              </div>
            )}

            {/* FEATURE 4: RETENTION & PRACTICE */}
            {activeFeatureTab === 'retention' && (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-800 flex items-center justify-center font-bold text-xs">
                      <Target className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-stone-900">Targeted Diagnostic Practice</h4>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Practice questions tailored to your syllabus that highlight which topics you have mastered and where gaps remain.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      <Clock className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-stone-900">Spaced Review Prompts</h4>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Timely recall notifications prompt you to review key points right before they fade from memory.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs space-y-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-xs">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-stone-900">Clear Study Recommendations</h4>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                      Focus your study time on high-impact concepts instead of aimlessly re-reading material you already know.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white border border-stone-200/90 text-xs text-stone-600 leading-relaxed flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Zero Last-Minute Cramming:</strong> Consistent 3-minute reviews throughout the semester mean you walk into finals relaxed and prepared.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. REAL STUDENT PROBLEMS & HOW WE SOLVE THEM */}
      <section id="solutions" className="py-20 px-4 max-w-5xl mx-auto w-full">
        <div className="text-center mb-14 space-y-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Why Studying Feels Stressful vs. How Mentor Mate Solves It
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
            Built Directly For The Real Challenges Of Studying
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 max-w-xl mx-auto leading-relaxed">
            Most study tools either dump answers without teaching you, or leave you drowning in PDFs.
            Here is how Mentor Mate transforms your daily preparation:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Note Disorganization */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-stone-200/90 shadow-2xs hover:shadow-xs transition-shadow space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase text-amber-800 tracking-wide">Problem: Disorganized Materials</span>
                <h3 className="text-sm sm:text-base font-bold text-stone-900">Scattered PDFs, Slides & Photos</h3>
              </div>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Lectures on one drive, syllabus in email, handwritten notes on your phone. You waste precious study time hunting for which slide covered what topic.
            </p>
            <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/60 space-y-1.5 text-xs">
              <div className="font-semibold text-amber-950 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-amber-700" />
                <span>Mentor Mate Solution: Unified Study Units</span>
              </div>
              <p className="text-stone-600 text-[11px] leading-relaxed">
                Drop your PDFs, images of notes, and slides into grouped Study Units. Ask questions across the whole unit and get answers with exact slide and page citations.
              </p>
            </div>
          </div>

          {/* Card 2: Late Night Block */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-stone-200/90 shadow-2xs hover:shadow-xs transition-shadow space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-200/80 text-sky-800 flex items-center justify-center shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase text-sky-800 tracking-wide">Problem: Getting Stuck</span>
                <h3 className="text-sm sm:text-base font-bold text-stone-900">Hitting a Wall at 11 PM</h3>
              </div>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              When a derivation or concept doesn't make sense, generic chatbots either dump the final answer or write walls of jargon that don't help you actually learn.
            </p>
            <div className="p-3.5 rounded-xl bg-sky-50/50 border border-sky-200/60 space-y-1.5 text-xs">
              <div className="font-semibold text-sky-950 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-sky-700" />
                <span>Mentor Mate Solution: Socratic Step-by-Step Hints</span>
              </div>
              <p className="text-stone-600 text-[11px] leading-relaxed">
                Your mentor asks gentle clarifying questions, gives intuitive analogies, and guides you to the "aha!" moment so you understand the logic deeply.
              </p>
            </div>
          </div>

          {/* Card 3: False Confidence & Blind Spots */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-stone-200/90 shadow-2xs hover:shadow-xs transition-shadow space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 flex items-center justify-center shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase text-emerald-800 tracking-wide">Problem: Blind Spots</span>
                <h3 className="text-sm sm:text-base font-bold text-stone-900">Not Knowing What You Don't Know</h3>
              </div>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Re-reading notes gives you an illusion of mastery. You feel prepared until you open the actual exam and discover the exact corner cases you overlooked.
            </p>
            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/60 space-y-1.5 text-xs">
              <div className="font-semibold text-emerald-950 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                <span>Mentor Mate Solution: Diagnostic Practice</span>
              </div>
              <p className="text-stone-600 text-[11px] leading-relaxed">
                Questions calibrate to your syllabus. You see which topics are solid and receive recommendations for concepts that need a recap.
              </p>
            </div>
          </div>

          {/* Card 4: Cramming and Forgetting */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white border border-stone-200/90 shadow-2xs hover:shadow-xs transition-shadow space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-800 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase text-rose-800 tracking-wide">Problem: The Forgetting Curve</span>
                <h3 className="text-sm sm:text-base font-bold text-stone-900">Cramming and Post-Exam Amnesia</h3>
              </div>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Studying 8 hours the night before ruins your sleep and vanishes from memory days later, forcing you to re-learn everything from scratch for finals.
            </p>
            <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200/60 space-y-1.5 text-xs">
              <div className="font-semibold text-rose-950 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-rose-700" />
                <span>Mentor Mate Solution: Timely Spaced Prompts</span>
              </div>
              <p className="text-stone-600 text-[11px] leading-relaxed">
                3-minute revision prompts arrive right before your brain forgets a concept. By final exam week, you're relaxed because you already know it cold.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 5. HOW IT WORKS (THE 4 STEP JOURNEY) */}
      <section id="how-it-works" className="py-16 px-4 bg-stone-100/50 border-y border-stone-200/80">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Simple Workflow</span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
              From Overwhelmed to Fully Prepared in 4 Steps
            </h2>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              You don't need to change how your professor teaches or rebuild your notes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-3">
              <div className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h4 className="text-xs font-bold text-stone-900">Upload Your Materials</h4>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Drop in PDFs, slides, or handwritten notebook photos. Group them into a subject folder like "Unit 1: Thermodynamics".
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-3">
              <div className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h4 className="text-xs font-bold text-stone-900">Gauge Your Understanding</h4>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Take a quick diagnostic test based on your syllabus to identify which topics need immediate focus.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-3">
              <div className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h4 className="text-xs font-bold text-stone-900">Work Through Doubts</h4>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Chat with your mentor for patient step-by-step guidance whenever you hit an equation or concept you can't crack.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs space-y-3">
              <div className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold text-xs">
                4
              </div>
              <h4 className="text-xs font-bold text-stone-900">Lock It In</h4>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Receive spaced 2-minute review cues throughout the semester. Walk into test day with calm, genuine mastery.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 6. FREQUENTLY ASKED QUESTIONS */}
      <section id="faq" className="py-16 px-4 max-w-3xl mx-auto w-full">
        <div className="text-center mb-10 space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">Got Questions?</span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "Does Mentor Mate just give me the answer or teach me how to solve it?",
              a: "Mentor Mate is built as a patient mentor, not a cheat engine. When you ask a question, it prompts your reasoning, points out underlying concepts from your notes, and guides you to the solution step by step so you truly understand it for exams."
            },
            {
              q: "Can I upload photos of handwritten notes or diagrams from class?",
              a: "Yes! Mentor Mate processes images (JPG, PNG), scanned PDFs, lecture slides, and text notes. You can inspect the extracted text side-by-side with your image, make any quick edits, and start practicing immediately."
            },
            {
              q: "How does it determine which topics need review?",
              a: "When you take short diagnostic quizzes on your uploaded study units, Mentor Mate tracks your answers against the concepts in your syllabus. It highlights areas needing a recap and suggests timely reviews before material is forgotten."
            },
            {
              q: "Is it completely free for students?",
              a: "Yes. You can sign up, create your study units, upload your course materials, and access your mentor and diagnostic practice without any paywalls."
            }
          ].map((item, idx) => (
            <div key={idx} className="rounded-xl border border-stone-200/90 bg-white overflow-hidden shadow-2xs">
              <button
                type="button"
                onClick={() => toggleFaq(idx)}
                className="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-semibold text-stone-900 hover:bg-stone-50/50 transition-colors cursor-pointer"
              >
                <span>{item.q}</span>
                <span className="text-stone-400 text-base leading-none ml-2">
                  {faqOpen === idx ? '−' : '+'}
                </span>
              </button>
              {faqOpen === idx && (
                <div className="px-4 pb-4 pt-1 text-xs text-stone-600 leading-relaxed border-t border-stone-100 bg-stone-50/30">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 7. FINAL CALL TO ACTION */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto rounded-3xl border border-stone-200 bg-gradient-to-b from-white to-stone-50/80 p-8 sm:p-14 text-center shadow-lg relative overflow-hidden">
          {/* Subtle warm glow inside banner */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-100/60 rounded-full blur-3xl -z-10 pointer-events-none" />

          <div className="max-w-xl mx-auto space-y-5">
            <img src="/logo.png" alt="Mentor Mate" className="h-20 w-auto max-w-[220px] rounded-2xl object-contain mx-auto shadow-sm" />

            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 leading-tight">
              Ready to replace exam stress with genuine confidence?
            </h2>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Create your account in 30 seconds. Upload your first lecture notes or syllabus unit and see the difference immediately.
            </p>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => onOpenAuth('register')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs sm:text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Create Your Study Space</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => onOpenAuth('login')}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs sm:text-sm font-semibold transition-all shadow-2xs cursor-pointer"
              >
                Sign In to Existing Account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8. ACADEMIC FOOTER */}
      <footer className="mt-auto border-t border-stone-200/80 bg-white py-8 px-4 text-xs text-stone-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Mentor Mate" className="h-8 w-auto max-w-[120px] rounded-lg object-contain" />
            <span className="text-stone-900 font-semibold text-xs">Mentor Mate</span>
            <span className="text-stone-400">•</span>
            <span className="text-[11px] text-stone-500">Personalized Academic Support</span>
          </div>

          <div className="text-[11px] text-stone-400 text-center sm:text-right">
            Designed with care for students who want genuine clarity and lasting mastery.
          </div>
        </div>
      </footer>

    </div>
  );
}
