"use client";

import React, { useEffect, useState, useRef } from 'react';
import {
  api,
  AssessmentItemOut,
  AssessmentAnswerOut,
  AssessmentConfigOptions,
  AssessmentStartRequest
} from '@/lib/api';
import {
  Target,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RefreshCw,
  Trophy,
  BookOpen,
  Sparkles,
  HelpCircle,
  FileText,
  Layers,
  Folder,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  GraduationCap,
  SlidersHorizontal,
  Code2,
  Zap,
  Gauge
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props {
  onNavigateToProgress?: () => void;
}

// Client-side Mermaid diagram visualizer
function MermaidDiagram({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>('');
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

      const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
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
          setError(err?.message || 'Visual render preview unavailable.');
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
      <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-mono text-stone-700 overflow-x-auto my-3">
        <div className="text-[10px] text-stone-400 font-sans mb-1 font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Code2 className="w-3.5 h-3.5 text-stone-500" />
          <span>Diagram Schema Definition</span>
        </div>
        <pre className="text-xs whitespace-pre-wrap leading-relaxed">{chart}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="h-32 flex items-center justify-center bg-stone-50/50 border border-stone-200/80 rounded-xl text-xs text-stone-400 animate-pulse my-3">
        <RefreshCw className="w-4 h-4 animate-spin mr-2 text-stone-500" />
        <span>Rendering diagram architecture...</span>
      </div>
    );
  }

  return (
    <div
      className="p-4 rounded-xl bg-white border border-stone-200/90 shadow-2xs flex justify-center overflow-x-auto my-3"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export function AssessmentView({ onNavigateToProgress }: Props) {
  // Pre-test configuration state
  const [configOptions, setConfigOptions] = useState<AssessmentConfigOptions | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Configuration selections
  const [selectedMode, setSelectedMode] = useState<'field_of_study' | 'folder' | 'resource' | 'weakness'>('field_of_study');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>(['mcq', 'short_answer', 'diagram']);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'adaptive' | 'foundational' | 'intermediate' | 'advanced'>('adaptive');
  const [numQuestions, setNumQuestions] = useState<number>(3);

  // Active test execution state
  const [isTestActive, setIsTestActive] = useState(false);
  const [generatingTest, setGeneratingTest] = useState(false);
  const [generationStep, setGenerationStep] = useState<number>(0);
  const [assessmentId, setAssessmentId] = useState<string>('');
  const [testTitle, setTestTitle] = useState<string>('');
  const [testSubject, setTestSubject] = useState<string>('');
  const [testDifficultyMode, setTestDifficultyMode] = useState<string>('adaptive');
  const [totalQuestions, setTotalQuestions] = useState(3);
  const [currentQuestion, setCurrentQuestion] = useState<AssessmentItemOut | null>(null);

  // Answering state
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [writtenAnswer, setWrittenAnswer] = useState<string>('');
  const [activeHintIndex, setActiveHintIndex] = useState<number>(-1);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AssessmentAnswerOut | null>(null);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [completed, setCompleted] = useState<boolean>(false);

  // Cycle loading steps while generating test
  useEffect(() => {
    let interval: any;
    if (generatingTest) {
      setGenerationStep(0);
      interval = setInterval(() => {
        setGenerationStep(prev => (prev + 1) % 3);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [generatingTest]);

  // Fetch student config options on load
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoadingConfig(true);
      const data = await api.getAssessmentConfigOptions();
      setConfigOptions(data);

      // Pre-select first folder if available
      if (data.folders && data.folders.length > 0) {
        setSelectedFolderId(data.folders[0].id);
      }
      if (data.resources && data.resources.length > 0) {
        setSelectedResourceId(data.resources[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load test config options:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleToggleQuestionType = (typeId: string) => {
    setSelectedQuestionTypes(prev => {
      if (prev.includes(typeId)) {
        if (prev.length === 1) return prev; // At least one type must be selected
        return prev.filter(t => t !== typeId);
      } else {
        return [...prev, typeId];
      }
    });
  };

  const handleStartTest = async () => {
    try {
      setGeneratingTest(true);
      setCompleted(false);
      setResult(null);
      setSelectedOptionIndex(null);
      setWrittenAnswer('');
      setActiveHintIndex(-1);
      setCorrectCount(0);

      const payload: AssessmentStartRequest = {
        mode: selectedMode,
        num_questions: numQuestions,
        question_types: selectedQuestionTypes,
        difficulty_mode: selectedDifficulty,
      };

      if (selectedMode === 'folder' && selectedFolderId) {
        payload.folder_id = selectedFolderId;
      } else if (selectedMode === 'resource' && selectedResourceId) {
        payload.resource_id = selectedResourceId;
      }

      const res = await api.startAssessment(payload);
      setAssessmentId(res.assessment_id);
      setTestTitle(res.title);
      setTestSubject(res.subject);
      setTestDifficultyMode(res.difficulty_mode || selectedDifficulty);
      setTotalQuestions(res.total_questions);
      setCurrentQuestion(res.current_question);
      setIsTestActive(true);
    } catch (err: any) {
      alert(err.message || 'Unable to generate test questions. Please verify your connection.');
    } finally {
      setGeneratingTest(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || submitting) return;

    if (currentQuestion.question_type === 'mcq' && selectedOptionIndex === null) {
      alert('Please select one of the multiple choice options.');
      return;
    }
    if (currentQuestion.question_type !== 'mcq' && !writtenAnswer.trim()) {
      alert('Please type your response before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.submitAssessmentAnswer(assessmentId, {
        item_id: currentQuestion.id,
        selected_index: selectedOptionIndex,
        text_response: writtenAnswer.trim() || undefined,
        response_time_ms: 15000,
      });

      setResult(res);
      if (res.is_correct) {
        setCorrectCount(prev => prev + 1);
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.8 } });
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit response.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (!result) return;
    if (result.is_complete || !result.next_question) {
      setCompleted(true);
      setIsTestActive(false);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } else {
      setCurrentQuestion(result.next_question);
      setResult(null);
      setSelectedOptionIndex(null);
      setWrittenAnswer('');
      setActiveHintIndex(-1);
    }
  };

  const handleResetToConfig = () => {
    setIsTestActive(false);
    setCompleted(false);
    setResult(null);
    setCurrentQuestion(null);
    loadConfig();
  };

  // 1. Loading State
  if (loadingConfig && !isTestActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-stone-500 gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-stone-700" />
        <span className="text-xs font-medium">Preparing test configurations...</span>
      </div>
    );
  }

  // 2. Completed Test Summary View
  if (completed) {
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    return (
      <div className="max-w-md mx-auto p-8 rounded-2xl border border-stone-200/90 bg-white text-center space-y-5 shadow-2xs">
        <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
          <Trophy className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-stone-900">Assessment Completed</h2>
          <p className="text-xs text-stone-500 mt-1">{testTitle}</p>
        </div>

        <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-around">
          <div>
            <div className="text-[11px] font-medium text-stone-500">Correct</div>
            <div className="text-xl font-bold text-stone-900">{correctCount} / {totalQuestions}</div>
          </div>
          <div className="w-px h-8 bg-stone-200" />
          <div>
            <div className="text-[11px] font-medium text-stone-500">Score</div>
            <div className="text-xl font-bold text-stone-900">{percentage}%</div>
          </div>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          Your quiz results, strengths, and review recommendations have been saved to your learning profile.
        </p>

        <div className="space-y-2 pt-2">
          <button
            onClick={handleResetToConfig}
            className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition-all shadow-xs flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Take Another Assessment</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Active Test Taking View
  if (isTestActive && currentQuestion) {
    const formatLabelMap: Record<string, { label: string; color: string }> = {
      mcq: { label: 'Multiple Choice', color: 'bg-blue-50 text-blue-800 border-blue-200' },
      short_answer: { label: 'Short Answer', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
      long_answer: { label: 'Detailed Analytical', color: 'bg-purple-50 text-purple-800 border-purple-200' },
      diagram: { label: 'Diagram Analysis', color: 'bg-amber-50 text-amber-800 border-amber-200' },
    };

    const currentFormat = formatLabelMap[currentQuestion.question_type] || formatLabelMap.mcq;

    return (
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Test Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
              <span>Question {currentQuestion.question_number} of {totalQuestions}</span>
              <span>•</span>
              <span className="truncate max-w-[280px]">{testTitle}</span>
            </div>
            <h2 className="text-lg font-bold text-stone-900 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Practice Test</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${currentFormat.color}`}>
                {currentFormat.label}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold bg-stone-100 text-stone-700 border-stone-200 capitalize flex items-center gap-1">
                {testDifficultyMode === 'adaptive' ? (
                  <>
                    <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                    <span>Adaptive</span>
                  </>
                ) : (
                  <span>{testDifficultyMode}</span>
                )}
              </span>
            </h2>
          </div>

          <button
            onClick={handleResetToConfig}
            className="text-xs text-stone-400 hover:text-stone-700 transition-colors flex items-center gap-1"
            title="Exit assessment"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Exit Test</span>
          </button>
        </div>

        {/* Question Container */}
        <div className="p-6 rounded-2xl border border-stone-200/90 bg-white space-y-5 shadow-2xs">
          {/* Question Text */}
          <p className="text-sm font-medium text-stone-900 leading-relaxed whitespace-pre-wrap">
            {currentQuestion.question_text}
          </p>

          {/* Diagram preview if provided */}
          {currentQuestion.diagram_code && (
            <MermaidDiagram chart={currentQuestion.diagram_code} />
          )}

          {/* Answer Input Areas based on question type */}
          {currentQuestion.question_type === 'mcq' && currentQuestion.options && (
            <div className="space-y-2.5">
              {currentQuestion.options.map((opt, idx) => {
                let style = "border-stone-200/80 bg-stone-50/60 text-stone-800 hover:border-stone-300 hover:bg-stone-100/60";
                if (result) {
                  if (result.correct_index != null && idx === result.correct_index) {
                    style = "border-emerald-300 bg-emerald-50 text-emerald-900 font-medium";
                  } else if (selectedOptionIndex === idx) {
                    style = "border-rose-300 bg-rose-50 text-rose-900";
                  }
                } else if (selectedOptionIndex === idx) {
                  style = "border-stone-900 bg-stone-100 text-stone-900 font-medium shadow-2xs";
                }

                return (
                  <button
                    key={idx}
                    disabled={result !== null || submitting}
                    onClick={() => setSelectedOptionIndex(idx)}
                    className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${style}`}
                  >
                    <span>{opt}</span>
                    {result && result.correct_index != null && idx === result.correct_index && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                    )}
                    {result && selectedOptionIndex === idx && !result.is_correct && (
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion.question_type !== 'mcq' && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-stone-600 flex items-center justify-between">
                <span>Your Written Answer</span>
                <span className="text-[11px] text-stone-400">{writtenAnswer.length} chars</span>
              </label>
              <textarea
                disabled={result !== null || submitting}
                rows={currentQuestion.question_type === 'long_answer' ? 6 : 4}
                value={writtenAnswer}
                onChange={(e) => setWrittenAnswer(e.target.value)}
                placeholder={
                  currentQuestion.question_type === 'diagram'
                    ? "Analyze the diagram above and explain the components, interactions, or structural relationships..."
                    : currentQuestion.question_type === 'long_answer'
                    ? "Provide a structured, comprehensive explanation or architectural breakdown..."
                    : "Type your concise explanation, definition, or code logic here..."
                }
                className="w-full p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-400 focus:bg-white transition-all font-mono leading-relaxed resize-y"
              />
            </div>
          )}

          {/* Progressive Socratic Hints */}
          {currentQuestion.hints && currentQuestion.hints.length > 0 && !result && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setActiveHintIndex(prev => (prev === -1 ? 0 : Math.min(prev + 1, currentQuestion.hints!.length - 1)))}
                className="text-[11px] font-medium text-stone-500 hover:text-stone-800 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-stone-400" />
                <span>
                  {activeHintIndex === -1 ? 'Need a hint?' : `Hint (${activeHintIndex + 1}/${currentQuestion.hints.length})`}
                </span>
              </button>

              {activeHintIndex >= 0 && (
                <div className="mt-2 p-3 rounded-xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 space-y-1">
                  <div className="font-semibold text-[11px] text-amber-800">Socratic Guidance:</div>
                  <p className="leading-relaxed">{currentQuestion.hints[activeHintIndex]}</p>
                </div>
              )}
            </div>
          )}

          {/* Result / AI Evaluation Banner */}
          {result && (
            <div className="p-4 rounded-xl bg-stone-50/90 border border-stone-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={result.is_correct ? "text-emerald-700 font-semibold" : "text-rose-700 font-semibold"}>
                    {result.is_correct ? "✓ Correct" : "✗ Needs Review"}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-stone-200/70 font-mono text-stone-700">
                    Score: {(result.score_awarded * 100).toFixed(0)}%
                  </span>
                </div>
                <span className="text-stone-500 text-[11px]">
                  Topic Mastery: {(result.posterior_p_l * 100).toFixed(0)}%
                </span>
              </div>

              {/* AI Diagnostic Feedback */}
              {result.ai_feedback && (
                <div className="text-xs text-stone-700 bg-white p-3 rounded-lg border border-stone-200/70 leading-relaxed">
                  <span className="font-semibold text-stone-900 block mb-0.5 text-[11px]">AI Evaluation:</span>
                  {result.ai_feedback}
                </div>
              )}

              {/* Model Explanation */}
              <div>
                <span className="font-semibold text-stone-800 block text-[11px] mb-0.5">Reference Concept:</span>
                <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-wrap">
                  {result.explanation}
                </p>
              </div>
            </div>
          )}

          {/* Submit / Next Buttons */}
          <div className="flex justify-end pt-2">
            {!result ? (
              <button
                disabled={submitting}
                onClick={handleSubmitAnswer}
                className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white text-xs font-medium transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Evaluating with AI...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Answer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <span>{result.is_complete ? "Complete Assessment" : "Next Question"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 4. Pre-Test Configuration View
  const student = configOptions?.student_field;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-stone-900">Practice Assessment</h1>
        <p className="text-xs text-stone-500 mt-1">
          Dynamically generated by the backend AI strictly from your verified field of study and uploaded materials.
        </p>
      </div>

      {/* Student Academic Context Card */}
      {student && (
        <div className="p-4 rounded-xl bg-stone-100/70 border border-stone-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-stone-900 text-white flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-stone-900">{student.name} • {student.tier}</div>
              <div className="text-[11px] text-stone-500">
                {student.board} • Focus: <strong className="text-stone-700">{student.goal}</strong>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              Real Data Grounded
            </span>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-6">
        {/* Step 1: Select Scope */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-stone-600" />
            <span>1. Select Assessment Source</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Field of Study Scope */}
            <button
              type="button"
              onClick={() => setSelectedMode('field_of_study')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedMode === 'field_of_study'
                  ? 'border-stone-900 bg-stone-50/90 shadow-2xs'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-stone-900">Field of Study & Syllabus</span>
                {selectedMode === 'field_of_study' && <Check className="w-3.5 h-3.5 text-stone-900" />}
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Comprehensive assessment across your curriculum ({student?.goal || 'Core Subjects'}).
              </p>
            </button>

            {/* Study Unit / Folder Scope */}
            <button
              type="button"
              onClick={() => setSelectedMode('folder')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedMode === 'folder'
                  ? 'border-stone-900 bg-stone-50/90 shadow-2xs'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-stone-900">Specific Study Unit</span>
                {selectedMode === 'folder' && <Check className="w-3.5 h-3.5 text-stone-900" />}
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Test knowledge from combined materials in a selected Study Unit folder.
              </p>
            </button>

            {/* Single Document Scope */}
            <button
              type="button"
              onClick={() => setSelectedMode('resource')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedMode === 'resource'
                  ? 'border-stone-900 bg-stone-50/90 shadow-2xs'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-stone-900">Specific Note / Resource</span>
                {selectedMode === 'resource' && <Check className="w-3.5 h-3.5 text-stone-900" />}
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Ground questions directly in an individual uploaded PDF, slide, or notes scan.
              </p>
            </button>

            {/* Weakness Targeting Scope */}
            <button
              type="button"
              onClick={() => {
                if ((configOptions?.weak_concepts?.length ?? 0) === 0) {
                  alert("No weak topics identified yet. Complete at least one practice assessment to discover areas needing review.");
                  return;
                }
                setSelectedMode('weakness');
              }}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedMode === 'weakness'
                  ? 'border-stone-900 bg-stone-50/90 shadow-2xs'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              } ${(configOptions?.weak_concepts?.length ?? 0) === 0 ? 'opacity-65' : ''}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-stone-900">Target Weak Topics</span>
                {selectedMode === 'weakness' && <Check className="w-3.5 h-3.5 text-stone-900" />}
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                {(configOptions?.weak_concepts?.length ?? 0) > 0
                  ? `Focus on ${configOptions!.weak_concepts.length} concepts where mastery is below 60% based on past practice.`
                  : "Available after taking practice assessments. No weak areas recorded yet."}
              </p>
            </button>
          </div>

          {/* Sub-selectors for folder or resource */}
          {selectedMode === 'folder' && (
            <div className="mt-2.5 p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1.5">
              <label className="text-xs font-medium text-stone-700 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-stone-500" />
                <span>Choose Study Unit:</span>
              </label>
              {configOptions?.folders && configOptions.folders.length > 0 ? (
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-white border border-stone-200 text-xs text-stone-900 focus:outline-none"
                >
                  {configOptions.folders.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.resource_count} documents)
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-stone-500">No folders created yet. Please create a folder in Notes first.</p>
              )}
            </div>
          )}

          {selectedMode === 'resource' && (
            <div className="mt-2.5 p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1.5">
              <label className="text-xs font-medium text-stone-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-stone-500" />
                <span>Choose Study Material:</span>
              </label>
              {configOptions?.resources && configOptions.resources.length > 0 ? (
                <select
                  value={selectedResourceId}
                  onChange={(e) => setSelectedResourceId(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-white border border-stone-200 text-xs text-stone-900 focus:outline-none"
                >
                  {configOptions.resources.map(r => (
                    <option key={r.id} value={r.id}>
                      [{r.file_type.toUpperCase()}] {r.title}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-stone-500">No documents uploaded yet. Upload your syllabus or notes first.</p>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Difficulty & Calibration */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-stone-600" />
              <span>2. Difficulty & Knowledge Calibration</span>
            </label>
            <span className="text-[11px] text-stone-500">
              Current Mastery: <strong className="text-stone-800">{configOptions?.current_mastery_pct != null ? `${configOptions.current_mastery_pct}%` : 'Not Yet Evaluated'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Adaptive Mode */}
            <button
              type="button"
              onClick={() => setSelectedDifficulty('adaptive')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedDifficulty === 'adaptive'
                  ? 'border-stone-900 bg-stone-50/90 shadow-2xs'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Adaptive (Auto-Calibrated)</span>
                </span>
                {selectedDifficulty === 'adaptive' && <Check className="w-3.5 h-3.5 text-stone-900" />}
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                {configOptions?.current_mastery_pct != null
                  ? `Calibrates directly to your measured topic mastery (${configOptions.current_mastery_pct}%). Automatically adjusts depth from your present level.`
                  : "First assessment will establish your diagnostic baseline. Question difficulty will calibrate dynamically as you submit answers."}
              </p>
            </button>

            {/* Foundational Mode */}
            <button
              type="button"
              onClick={() => setSelectedDifficulty('foundational')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedDifficulty === 'foundational'
                  ? 'border-stone-900 bg-stone-50/90 shadow-2xs'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-stone-900">Foundational (Easy)</span>
                {selectedDifficulty === 'foundational' && <Check className="w-3.5 h-3.5 text-stone-900" />}
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Reinforces fundamental definitions, direct conceptual recall, and primary building blocks.
              </p>
            </button>

            {/* Intermediate Mode */}
            <button
              type="button"
              onClick={() => setSelectedDifficulty('intermediate')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedDifficulty === 'intermediate'
                  ? 'border-stone-900 bg-stone-50/90 shadow-2xs'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-stone-900">Intermediate (Medium)</span>
                {selectedDifficulty === 'intermediate' && <Check className="w-3.5 h-3.5 text-stone-900" />}
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Standard academic rigor with scenario-based applications and multi-concept synthesis.
              </p>
            </button>

            {/* Advanced Mode */}
            <button
              type="button"
              onClick={() => setSelectedDifficulty('advanced')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedDifficulty === 'advanced'
                  ? 'border-stone-900 bg-stone-50/90 shadow-2xs'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-stone-900">Advanced (Hard)</span>
                {selectedDifficulty === 'advanced' && <Check className="w-3.5 h-3.5 text-stone-900" />}
              </div>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Deep analytical edge-cases, system architecture evaluations, and rigorous critical thinking.
              </p>
            </button>
          </div>
        </div>

        {/* Step 3: Question Formats */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-stone-900 flex items-center gap-1.5">
            <SlidersHorizontal className="w-4 h-4 text-stone-600" />
            <span>3. Question Formats to Include</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { id: 'mcq', label: 'Multiple Choice (MCQ)', desc: 'Fast conceptual checks with 4 options' },
              { id: 'short_answer', label: 'Short Answer & Code', desc: 'Definitions, logic, or code snippets' },
              { id: 'long_answer', label: 'Detailed Analytical', desc: 'Architecture, in-depth derivations' },
              { id: 'diagram', label: 'Diagram Analysis', desc: 'Mermaid class/flow diagrams and analysis' },
            ].map((fmt) => {
              const checked = selectedQuestionTypes.includes(fmt.id);
              return (
                <button
                  type="button"
                  key={fmt.id}
                  onClick={() => handleToggleQuestionType(fmt.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                    checked
                      ? 'border-stone-900 bg-stone-50/80'
                      : 'border-stone-200 bg-white opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className={`w-4 h-4 rounded mt-0.5 border flex items-center justify-center shrink-0 ${
                    checked ? 'bg-stone-900 border-stone-900 text-white' : 'border-stone-300'
                  }`}>
                    {checked && <Check className="w-3 h-3" />}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-stone-900">{fmt.label}</div>
                    <div className="text-[11px] text-stone-400 mt-0.5">{fmt.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 4: Question Count */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-stone-900">4. Number of Questions</label>
          <div className="flex items-center gap-2">
            {[
              { count: 3, label: '3 Questions (Quick Check)' },
              { count: 5, label: '5 Questions (Standard Practice)' },
              { count: 8, label: '8 Questions (Comprehensive Drill)' },
            ].map(item => (
              <button
                type="button"
                key={item.count}
                onClick={() => setNumQuestions(item.count)}
                className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  numQuestions === item.count
                    ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                    : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start Button & Loader */}
        <div className="pt-3 border-t border-stone-100 space-y-3">
          {generatingTest && (
            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center gap-3">
              <RefreshCw className="w-4 h-4 animate-spin text-stone-700 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-stone-900">
                  {generationStep === 0 && "Step 1/3: Analyzing syllabus & verified study materials..."}
                  {generationStep === 1 && (selectedDifficulty === 'adaptive'
                    ? (configOptions?.current_mastery_pct != null
                        ? `Step 2/3: Calibrating question difficulty to your topic mastery (${configOptions.current_mastery_pct}%)...`
                        : "Step 2/3: Calibrating exploratory diagnostic baseline for your first test...")
                    : `Step 2/3: Calibrating difficulty to ${selectedDifficulty} tier...`)}
                  {generationStep === 2 && "Step 3/3: Synthesizing authentic questions & grading rubrics with AI..."}
                </span>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Grounded strictly in your syllabus. Takes ~20-30 seconds for complete academic precision.
                </p>
              </div>
            </div>
          )}

          <button
            disabled={generatingTest}
            onClick={handleStartTest}
            className="w-full py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-medium transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            {generatingTest ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating Calibrated Assessment...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate & Start Practice Assessment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
