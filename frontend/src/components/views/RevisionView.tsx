"use client";

import React, { useEffect, useState } from 'react';
import {
  api,
  RevisionItemOut,
  ResourceItem,
  StudyFolder,
  AtRiskConceptOut
} from '@/lib/api';
import { MathRenderer } from '@/components/MathRenderer';
import {
  GraduationCap,
  FileText,
  Layers,
  Network,
  Zap,
  BookOpen,
  CheckCircle2,
  Clock,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  RotateCcw,
  AlertTriangle,
  Flame,
  Check,
  X,
  ChevronRight,
  Send
} from 'lucide-react';

interface MermaidViewerProps {
  chart: string;
}

function MermaidViewer({ chart }: MermaidViewerProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const renderChart = async () => {
      if (!chart || !chart.trim()) return;
      const sanitized = chart
        .replace(/^```mermaid\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();

      const id = `mermaid-rev-${Math.random().toString(36).substring(2, 9)}`;
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          suppressErrorRendering: true,
          theme: 'neutral',
          fontFamily: 'inherit',
          securityLevel: 'loose',
        });
        const { svg: renderedSvg } = await mermaid.render(id, sanitized);
        if (isMounted) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err: any) {
        if (typeof document !== 'undefined') {
          document.querySelectorAll(`[id^="d${id}"], [id^="dmermaid"]`).forEach((el) => el.remove());
        }
        if (isMounted) {
          setError(err?.message || 'Mind map rendering preview.');
        }
      }
    };
    renderChart();
    return () => {
      isMounted = false;
      if (typeof document !== 'undefined') {
        document.querySelectorAll('[id^="dmermaid"]').forEach((el) => el.remove());
      }
    };
  }, [chart]);

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600 font-mono whitespace-pre-wrap">
        <div className="text-stone-700 font-semibold mb-2 font-sans flex items-center gap-1.5">
          <Network className="w-4 h-4 text-stone-600" />
          <span>Mind Map Structure</span>
        </div>
        {chart}
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-2">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-xs">Generating visual conceptual map...</span>
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto p-4 rounded-xl bg-white border border-stone-200/80 flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function RevisionView() {
  // Dual-type tab: 'field_curriculum' (Type 1) vs 'study_material' (Type 2)
  const [activeTab, setActiveTab] = useState<'field_curriculum' | 'study_material'>('field_curriculum');

  // Format mode: 'flashcards' | 'mindmap' | 'speed_quiz' | 'takeaways'
  const [activeFormat, setActiveFormat] = useState<'flashcards' | 'mindmap' | 'speed_quiz' | 'takeaways'>('flashcards');

  // Revision queue and active item
  const [items, setItems] = useState<RevisionItemOut[]>([]);
  const [activeItem, setActiveItem] = useState<RevisionItemOut | null>(null);
  const [decayAlerts, setDecayAlerts] = useState<AtRiskConceptOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  // Form states for generating revision
  const [topicInput, setTopicInput] = useState('');
  const [customFocus, setCustomFocus] = useState('');
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [folders, setFolders] = useState<StudyFolder[]>([]);

  // Flashcards state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [deckCompleted, setDeckCompleted] = useState(false);

  // Speed Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [revItems, alerts, resList, folderList] = await Promise.all([
        api.getRevisionItems(),
        api.getDecayAlerts().catch(() => [] as AtRiskConceptOut[]),
        api.listResources().catch(() => [] as ResourceItem[]),
        api.listFolders().catch(() => [] as StudyFolder[])
      ]);
      setItems(revItems);
      setDecayAlerts(alerts);
      setResources(resList);
      setFolders(folderList);

      if (resList.length > 0 && !selectedResourceId) {
        setSelectedResourceId(resList[0].id);
      }

      // Pick first item matching current tab if available
      const tabMatch = revItems.find(i => i.revision_type === activeTab);
      if (tabMatch) {
        setActiveItem(tabMatch);
      } else if (revItems.length > 0) {
        setActiveItem(revItems[0]);
      } else {
        setActiveItem(null);
      }
    } catch (err: any) {
      console.error('Failed to load revision items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When changing tabs, select an appropriate active item
  const handleTabChange = (tab: 'field_curriculum' | 'study_material') => {
    setActiveTab(tab);
    setCardIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setDeckCompleted(false);
    setQuizAnswers({});
    setQuizSubmitted(false);

    const match = items.find(i => i.revision_type === tab);
    if (match) {
      setActiveItem(match);
    }
  };

  // Select a specific revision item
  const handleSelectItem = (item: RevisionItemOut) => {
    setActiveItem(item);
    setActiveTab(item.revision_type);
    setCardIndex(0);
    setIsFlipped(false);
    setShowHint(false);
    setDeckCompleted(false);
    setQuizAnswers({});
    setQuizSubmitted(false);
  };

  // Generate new revision materials
  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (generating) return;

    try {
      setGenerating(true);
      const reqPayload = activeTab === 'field_curriculum'
        ? {
            revision_type: 'field_curriculum' as const,
            topic_or_subject: topicInput.trim() || undefined,
            custom_focus: customFocus.trim() || undefined,
          }
        : {
            revision_type: 'study_material' as const,
            resource_id: selectedResourceId || undefined,
            folder_id: selectedFolderId || undefined,
            custom_focus: customFocus.trim() || undefined,
          };

      const newItem = await api.generateRevision(reqPayload);
      setTopicInput('');
      setCustomFocus('');
      await fetchData();
      setActiveItem(newItem);
      setCardIndex(0);
      setIsFlipped(false);
      setShowHint(false);
      setDeckCompleted(false);
      setQuizAnswers({});
      setQuizSubmitted(false);
    } catch (err: any) {
      alert(err.message || 'Failed to generate revision materials.');
    } finally {
      setGenerating(false);
    }
  };

  // Rate flashcard recall (Ebbinghaus spaced repetition)
  const handleCardRating = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!activeItem || submittingRating) return;
    try {
      setSubmittingRating(true);
      await api.completeRevisionReview(activeItem.id, {
        difficulty_rating: rating,
      });

      // Refresh items in background
      const updated = await api.getRevisionItems();
      setItems(updated);
      const current = updated.find(i => i.id === activeItem.id);
      if (current) setActiveItem(current);

      // Advance to next card if available, else finish deck
      const totalCards = activeItem.flashcards?.length || 0;
      if (cardIndex < totalCards - 1) {
        setCardIndex(prev => prev + 1);
        setIsFlipped(false);
        setShowHint(false);
      } else {
        setDeckCompleted(true);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record recall rating.');
    } finally {
      setSubmittingRating(false);
    }
  };

  // Submit Speed Quiz
  const handleQuizSubmit = async () => {
    if (!activeItem || !activeItem.speed_quiz || activeItem.speed_quiz.length === 0) return;
    setQuizSubmitted(true);

    let correct = 0;
    activeItem.speed_quiz.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correct_answer) {
        correct++;
      }
    });
    const score = correct / activeItem.speed_quiz.length;

    try {
      await api.completeRevisionReview(activeItem.id, { score });
      const updated = await api.getRevisionItems();
      setItems(updated);
      const current = updated.find(i => i.id === activeItem.id);
      if (current) setActiveItem(current);
    } catch (err: any) {
      console.warn('Could not record quiz score:', err);
    }
  };

  const filteredItems = items.filter(i => i.revision_type === activeTab);
  const flashcards = activeItem?.flashcards || [];
  const currentCard = flashcards[cardIndex] || null;
  const speedQuiz = activeItem?.speed_quiz || [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] text-stone-500 gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-stone-700" />
        <span className="text-xs font-medium">Loading your revision and memory retention schedule...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & MEMORY DECAY BANNER */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
              <span>Smart Review & Flashcards</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 border border-stone-300 text-stone-700">
                Adaptive Memory
              </span>
            </h1>
            <p className="text-xs text-stone-500 mt-0.5 max-w-2xl">
              Review and remember what you learn with smart flashcards, quick quizzes, and summaries based on your subjects and notes.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium">
            <div className="px-3 py-1.5 rounded-xl bg-white border border-stone-200/90 text-stone-700 shadow-2xs">
              Due for Review: <strong className="text-stone-900">{items.filter(i => (i.retention_estimate || 1.0) <= 0.70).length}</strong> Topics
            </div>
          </div>
        </div>

        {/* At-Risk Warning Alert if any items are fading */}
        {decayAlerts.length > 0 && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50/80 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start sm:items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <div className="text-xs font-bold text-amber-900 flex items-center gap-2">
                  <span>Memory Refresh Needed:</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-semibold">
                    {decayAlerts.length} Topic{decayAlerts.length > 1 ? 's' : ''} Fading
                  </span>
                </div>
                <div className="text-xs text-amber-800 mt-0.5">
                  You might be forgetting <strong>{decayAlerts.map(a => a.title).slice(0, 2).join(', ')}</strong>{decayAlerts.length > 2 ? ` and ${decayAlerts.length - 2} more` : ''}. Take a quick review to refresh your memory!
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                const atRiskMatch = items.find(i => i.id === decayAlerts[0].id);
                if (atRiskMatch) handleSelectItem(atRiskMatch);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-medium text-xs shadow-2xs shrink-0 cursor-pointer transition-all self-start sm:self-center"
            >
              Review Fading Topic
            </button>
          </div>
        )}
      </div>

      {/* 2. DUAL-TYPE NAVIGATION TABS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => handleTabChange('field_curriculum')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'field_curriculum'
              ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
              : 'bg-white text-stone-700 border-stone-200/90 hover:border-stone-300 hover:bg-stone-50/80'
          }`}
        >
          <div className="flex items-center gap-2.5 mb-1.5">
            <GraduationCap className={`w-5 h-5 ${activeTab === 'field_curriculum' ? 'text-amber-400' : 'text-stone-700'}`} />
            <span className="text-sm font-bold tracking-tight">Curriculum & Syllabus Topics</span>
          </div>
          <p className={`text-xs leading-relaxed ${activeTab === 'field_curriculum' ? 'text-stone-300' : 'text-stone-500'}`}>
            Review core subjects and key topics from your overall course syllabus.
          </p>
        </button>

        <button
          onClick={() => handleTabChange('study_material')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'study_material'
              ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
              : 'bg-white text-stone-700 border-stone-200/90 hover:border-stone-300 hover:bg-stone-50/80'
          }`}
        >
          <div className="flex items-center gap-2.5 mb-1.5">
            <FileText className={`w-5 h-5 ${activeTab === 'study_material' ? 'text-blue-400' : 'text-stone-700'}`} />
            <span className="text-sm font-bold tracking-tight">My Uploaded Notes</span>
          </div>
          <p className={`text-xs leading-relaxed ${activeTab === 'study_material' ? 'text-stone-300' : 'text-stone-500'}`}>
            Review flashcards, quizzes, and summaries created directly from your uploaded notes and slides.
          </p>
        </button>
      </div>

      {/* 3. TOPIC SYNTHESIS BAR (GENERATE NEW SET) */}
      <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
              {activeTab === 'field_curriculum' ? 'Create New Curriculum Review Set' : 'Create New Notes Review Set'}
            </h3>
          </div>
          <span className="text-[11px] text-stone-400">Includes flashcards, quick quiz, mind map, and key takeaways</span>
        </div>

        <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {activeTab === 'field_curriculum' ? (
            <>
              <div className="md:col-span-6">
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  Topic / Concept to Revise
                </label>
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="e.g., Polymorphism, Binary Search Trees, Normalization"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all"
                />
              </div>

              <div className="md:col-span-4">
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  Specific Focus (Optional)
                </label>
                <input
                  type="text"
                  value={customFocus}
                  onChange={(e) => setCustomFocus(e.target.value)}
                  placeholder="e.g., Runtime vtables and code examples"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all"
                />
              </div>
            </>
          ) : (
            <>
              <div className="md:col-span-6">
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  Source Study Document / Folder
                </label>
                {resources.length > 0 ? (
                  <select
                    value={selectedResourceId}
                    onChange={(e) => setSelectedResourceId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all"
                  >
                    {resources.map((res) => (
                      <option key={res.id} value={res.id}>
                        {res.title} ({res.subject || 'Notes'})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-stone-500 py-2">
                    No uploaded notes found. Upload a PDF or lecture document in Course Materials first!
                  </div>
                )}
              </div>

              <div className="md:col-span-4">
                <label className="block text-[11px] font-medium text-stone-600 mb-1">
                  Specific Focus in Notes (Optional)
                </label>
                <input
                  type="text"
                  value={customFocus}
                  onChange={(e) => setCustomFocus(e.target.value)}
                  placeholder="e.g., Chapter 3 algorithms only"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all"
                />
              </div>
            </>
          )}

          <div className="md:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={generating || (activeTab === 'study_material' && resources.length === 0)}
              className="w-full py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Generate Set</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick topic suggestion pills for field curriculum */}
        {activeTab === 'field_curriculum' && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-medium text-stone-400">Quick Curriculum Topics:</span>
            {['Object Oriented Programming', 'Polymorphism & Dispatch', 'Encapsulation & Access Modifiers', 'Recursion & Call Stacks', 'Data Structures & Trees'].map(pill => (
              <button
                key={pill}
                type="button"
                onClick={() => setTopicInput(pill)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 transition-colors cursor-pointer"
              >
                {pill}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. MAIN WORKSPACE & SCHEDULED QUEUE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center: Interactive Multi-Format Viewer (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {activeItem ? (
            <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-6">
              {/* Item Top Metadata */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200/80 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200 text-stone-700">
                      {activeItem.revision_type === 'field_curriculum' ? 'Course Topic' : 'Uploaded Notes'}
                    </span>
                    <span className="text-xs text-stone-500 font-medium">
                      Source: {activeItem.source_context || 'curriculum'}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-stone-900">
                    {activeItem.topic_title || activeItem.concept_name || 'Topic'}
                  </h2>
                </div>

                <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                  <div className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Flame className={`w-3.5 h-3.5 ${(activeItem.retention_estimate || 1.0) <= 0.70 ? 'text-amber-600' : 'text-emerald-600'}`} />
                    <span>{((activeItem.retention_estimate || 1.0) * 100).toFixed(0)}% Memory Strength</span>
                  </div>
                  <div className="text-[11px] text-stone-400">
                    Review every ~{Math.round(activeItem.stability_days_s || 3)} days • {activeItem.review_count || 0} reviews completed
                  </div>
                </div>
              </div>

              {/* Multi-Format Selector Buttons */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-100 border border-stone-200 text-xs">
                <button
                  onClick={() => setActiveFormat('flashcards')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeFormat === 'flashcards'
                      ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-stone-700" />
                  <span>Flashcards ({flashcards.length})</span>
                </button>

                <button
                  onClick={() => setActiveFormat('mindmap')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeFormat === 'mindmap'
                      ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Network className="w-3.5 h-3.5 text-stone-700" />
                  <span>Mind Map</span>
                </button>

                <button
                  onClick={() => setActiveFormat('speed_quiz')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeFormat === 'speed_quiz'
                      ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>Speed Quiz ({speedQuiz.length})</span>
                </button>

                <button
                  onClick={() => setActiveFormat('takeaways')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeFormat === 'takeaways'
                      ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Takeaways</span>
                </button>
              </div>

              {/* FORMAT 1: INTERACTIVE FLIP FLASHCARDS */}
              {activeFormat === 'flashcards' && (
                <div className="space-y-4">
                  {deckCompleted ? (
                    <div className="p-8 rounded-2xl bg-stone-50 border border-stone-200 text-center space-y-4 shadow-2xs">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
                        <Check className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-stone-900">Flashcard Deck Completed!</h3>
                        <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                          Great job! All {flashcards.length} cards have been reviewed. Your next spaced review has been scheduled in ~{Math.round(activeItem.stability_days_s || 3)} days.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                        <button
                          onClick={() => {
                            setCardIndex(0);
                            setIsFlipped(false);
                            setShowHint(false);
                            setDeckCompleted(false);
                          }}
                          className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Review Deck Again</span>
                        </button>
                        {speedQuiz.length > 0 && (
                          <button
                            onClick={() => setActiveFormat('speed_quiz')}
                            className="px-4 py-2 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span>Take Speed Quiz</span>
                          </button>
                        )}
                        <button
                          onClick={() => setActiveFormat('mindmap')}
                          className="px-4 py-2 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Network className="w-3.5 h-3.5 text-stone-600" />
                          <span>View Mind Map</span>
                        </button>
                      </div>
                    </div>
                  ) : currentCard ? (
                    <div className="space-y-4">
                      {/* Card Area */}
                      <div
                        onClick={() => setIsFlipped(!isFlipped)}
                        className={`min-h-[220px] p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                          isFlipped
                            ? 'bg-amber-50/50 border-amber-200/90 shadow-xs'
                            : 'bg-stone-50/60 border-stone-200/90 hover:bg-stone-50 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs text-stone-400">
                          <span className="font-semibold uppercase tracking-wider text-[10px]">
                            {isFlipped ? 'Answer & Explanation' : 'Question / Concept'}
                          </span>
                          <span>Click to Flip Card 🔄</span>
                        </div>

                        <div className="py-4 text-center">
                          <div className={`text-sm font-semibold leading-relaxed ${isFlipped ? 'text-stone-900' : 'text-stone-800'}`}>
                            <MathRenderer content={isFlipped ? currentCard.back : currentCard.front} />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-200/60">
                          <span className="text-stone-400 text-[11px]">
                            Card {cardIndex + 1} of {flashcards.length}
                          </span>
                          {currentCard.hint && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowHint(!showHint);
                              }}
                              className="text-[11px] text-amber-700 hover:text-amber-800 font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <HelpCircle className="w-3 h-3" />
                              <span>{showHint ? 'Hide Hint' : 'Show Hint'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {showHint && currentCard.hint && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <div className="flex-1">
                            <span className="font-semibold mr-1">Hint:</span>
                            <MathRenderer content={currentCard.hint} className="inline-block" />
                          </div>
                        </div>
                      )}

                      {/* Card Nav Buttons */}
                      <div className="flex items-center justify-between">
                        <button
                          disabled={cardIndex === 0}
                          onClick={() => {
                            setCardIndex(prev => prev - 1);
                            setIsFlipped(false);
                            setShowHint(false);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 text-xs font-medium text-stone-700 flex items-center gap-1.5 cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Previous</span>
                        </button>

                        <button
                          disabled={cardIndex >= flashcards.length - 1}
                          onClick={() => {
                            setCardIndex(prev => prev + 1);
                            setIsFlipped(false);
                            setShowHint(false);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 disabled:opacity-40 text-xs font-medium text-stone-700 flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Next</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Ebbinghaus Recall Rating Bar */}
                      <div className="pt-4 border-t border-stone-200/80 space-y-2">
                        <div className="text-[11px] font-semibold text-stone-500 text-center uppercase tracking-wider">
                          Rate Your Recall (Calibrates Spaced Repetition Stability)
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <button
                            disabled={submittingRating}
                            onClick={() => handleCardRating('again')}
                            className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 text-xs font-medium text-center transition-all cursor-pointer"
                          >
                            <div className="font-bold">Again</div>
                            <div className="text-[10px] text-rose-600">Forgotten</div>
                          </button>
                          <button
                            disabled={submittingRating}
                            onClick={() => handleCardRating('hard')}
                            className="p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-medium text-center transition-all cursor-pointer"
                          >
                            <div className="font-bold">Hard</div>
                            <div className="text-[10px] text-amber-600">Difficult</div>
                          </button>
                          <button
                            disabled={submittingRating}
                            onClick={() => handleCardRating('good')}
                            className="p-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-medium text-center transition-all cursor-pointer"
                          >
                            <div className="font-bold">Good</div>
                            <div className="text-[10px] text-blue-600">Remembered</div>
                          </button>
                          <button
                            disabled={submittingRating}
                            onClick={() => handleCardRating('easy')}
                            className="p-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-medium text-center transition-all cursor-pointer"
                          >
                            <div className="font-bold">Easy</div>
                            <div className="text-[10px] text-emerald-600">Mastered</div>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-stone-400 text-xs">
                      No flashcards generated for this item yet. Click &quot;Generate Set&quot; above to synthesize!
                    </div>
                  )}
                </div>
              )}

              {/* FORMAT 2: MERMAID MIND MAP */}
              {activeFormat === 'mindmap' && (
                <div className="space-y-3">
                  <div className="text-xs text-stone-500">
                    Visual conceptual tree highlighting dependencies, relationships, and hierarchy.
                  </div>
                  {activeItem.mindmap_code ? (
                    <MermaidViewer chart={activeItem.mindmap_code} />
                  ) : (
                    <div className="p-8 text-center text-stone-400 text-xs rounded-xl bg-stone-50 border border-stone-200">
                      No mind map code available for this concept. Generate a new revision set above.
                    </div>
                  )}
                </div>
              )}

              {/* FORMAT 3: SPEED QUIZ */}
              {activeFormat === 'speed_quiz' && (
                <div className="space-y-4">
                  {speedQuiz.length > 0 ? (
                    <div className="space-y-4">
                      {speedQuiz.map((q, qIdx) => {
                        const selected = quizAnswers[qIdx];
                        const isAnswered = Boolean(selected);
                        return (
                          <div key={qIdx} className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3">
                            <div className="text-xs font-bold text-stone-900 flex items-start gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 text-[10px] shrink-0">
                                Q{qIdx + 1}
                              </span>
                              <div className="flex-1">
                                <MathRenderer content={q.question} />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                              {q.options.map((opt, optIdx) => {
                                const isChosen = selected === opt;
                                const isCorrect = q.correct_answer === opt;
                                let btnClasses = "p-2.5 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer flex items-center justify-between ";

                                if (!quizSubmitted) {
                                  btnClasses += isChosen
                                    ? "border-stone-900 bg-stone-900 text-white"
                                    : "border-stone-200 bg-white text-stone-700 hover:bg-stone-100";
                                } else {
                                  if (isCorrect) {
                                    btnClasses += "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold";
                                  } else if (isChosen && !isCorrect) {
                                    btnClasses += "border-rose-500 bg-rose-50 text-rose-900";
                                  } else {
                                    btnClasses += "border-stone-200 bg-white text-stone-400";
                                  }
                                }

                                return (
                                  <button
                                    key={optIdx}
                                    type="button"
                                    onClick={() => {
                                      if (!quizSubmitted) {
                                        setQuizAnswers(prev => ({ ...prev, [qIdx]: opt }));
                                      }
                                    }}
                                    className={btnClasses}
                                  >
                                    <div className="flex-1">
                                      <MathRenderer content={opt} className="inline-block" />
                                    </div>
                                    {quizSubmitted && isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" />}
                                    {quizSubmitted && isChosen && !isCorrect && <X className="w-3.5 h-3.5 text-rose-600 shrink-0 ml-2" />}
                                  </button>
                                );
                              })}
                            </div>

                            {quizSubmitted && (
                              <div className="p-2.5 rounded-lg bg-stone-100 border border-stone-200/80 text-[11px] text-stone-600 leading-relaxed">
                                <strong className="block mb-0.5">Explanation:</strong>
                                <MathRenderer content={q.explanation} />
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {!quizSubmitted ? (
                        <button
                          onClick={handleQuizSubmit}
                          disabled={Object.keys(quizAnswers).length === 0}
                          className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-400" />
                          <span>Submit Speed Quiz</span>
                        </button>
                      ) : (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium text-center">
                          ✓ Quiz completed! Your memory strength has been updated.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-stone-400 text-xs">
                      No speed quiz generated for this item yet. Click &quot;Generate Set&quot; above to create one!
                    </div>
                  )}
                </div>
              )}

              {/* FORMAT 4: KEY TAKEAWAYS */}
              {activeFormat === 'takeaways' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 text-xs text-stone-700 leading-relaxed">
                    {activeItem.quick_summary ? (
                      <MathRenderer content={activeItem.quick_summary} />
                    ) : (
                      <span className="text-stone-400">No summary takeaways available for this concept.</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl border border-stone-200/90 bg-white shadow-2xs space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-base font-semibold text-stone-900">Ready to Revise</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                Choose a topic above to create a review set, or select an item from the sidebar to start reviewing!
              </p>
            </div>
          )}
        </div>

        {/* Right Sidebar: Scheduled Queue & At-Risk Items (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-stone-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                  {activeTab === 'field_curriculum' ? 'Topics to Review' : 'Notes Topics'} ({filteredItems.length})
                </h3>
              </div>
              <span className="text-[10px] text-stone-400">Needs Review First</span>
            </div>

            {filteredItems.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-xs">
                No items in this queue yet. Use the top bar to create new review sets!
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[58vh] overflow-y-auto pr-1">
                {filteredItems.map((item) => {
                  const retentionPercent = ((item.retention_estimate || 1.0) * 100).toFixed(0);
                  const isSelected = activeItem?.id === item.id;
                  const isAtRisk = (item.retention_estimate || 1.0) <= 0.70;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectItem(item)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'border-stone-900 bg-stone-100 text-stone-900 font-semibold shadow-2xs'
                          : isAtRisk
                          ? 'border-amber-200/90 bg-amber-50/40 text-stone-800 hover:bg-amber-50/70'
                          : 'border-stone-200/80 bg-stone-50/60 text-stone-700 hover:bg-stone-100/60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold truncate max-w-[160px]">
                          {item.topic_title || item.concept_name || 'Topic'}
                        </span>
                        <span className={`text-[11px] font-bold ${isAtRisk ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {retentionPercent}%
                        </span>
                      </div>

                      {/* Memory decay bar */}
                      <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden mb-1.5">
                        <div
                          className={`h-full rounded-full ${
                            isAtRisk ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, Number(retentionPercent)))}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-stone-400">
                        <span>Review in ~{Math.round(item.stability_days_s || 3)} days</span>
                        <span className="capitalize">{item.source_context || 'curriculum'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

