"use client";

import React, { useState } from 'react';
import { Sparkles, Clock, CheckCircle2, XCircle, ArrowRight, RotateCcw, BookOpen, Target, BookmarkCheck } from 'lucide-react';

export function BKTProofBench() {
  const [currentMastery, setCurrentMastery] = useState(25);
  const [history, setHistory] = useState<Array<{ correct: boolean; score: number }>>([
    { correct: true, score: 25 }
  ]);

  const handleStep = (isCorrect: boolean) => {
    let nextScore = isCorrect ? currentMastery + 18 : currentMastery - 12;
    nextScore = Math.max(10, Math.min(98, nextScore));
    setCurrentMastery(nextScore);
    setHistory(prev => [...prev, { correct: isCorrect, score: nextScore }]);
  };

  const handleReset = () => {
    setCurrentMastery(25);
    setHistory([{ correct: true, score: 25 }]);
  };

  const isMastered = currentMastery >= 80;

  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Interactive Tool 01</span>
          </div>
          <h3 className="text-lg font-bold text-stone-900 mt-1">Topic Mastery Simulator</h3>
          <p className="text-xs text-stone-500">See how your confidence and understanding grow as you practice questions</p>
        </div>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors text-xs font-medium flex items-center gap-1.5"
          title="Reset sequence"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-stone-50/80 border border-stone-200/70">
          <div className="text-xs font-medium text-stone-500">Current Topic Mastery</div>
          <div className="text-3xl font-bold text-stone-900 mt-1">
            {currentMastery}%
          </div>
          <div className="text-xs mt-1.5 font-medium">
            {isMastered ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Concept Mastered!
              </span>
            ) : (
              <span className="text-stone-500">Building Understanding</span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-stone-50/80 border border-stone-200/70">
          <div className="text-xs font-medium text-stone-500">How It Helps You</div>
          <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
            Every correct answer solidifies your score. If you miss an answer, the system identifies the gap and adapts upcoming practice.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-stone-50/80 border border-stone-200/70 flex flex-col justify-center">
          <div className="text-xs font-medium text-stone-500 mb-2">Simulate a practice response:</div>
          <div className="flex gap-2">
            <button
              onClick={() => handleStep(true)}
              className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center justify-center gap-1 transition-all shadow-sm active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Got it Right
            </button>
            <button
              onClick={() => handleStep(false)}
              className="flex-1 py-2 px-3 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-medium flex items-center justify-center gap-1 transition-all active:scale-95"
            >
              <XCircle className="w-3.5 h-3.5 text-stone-500" /> Needs Review
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <div className="text-xs text-stone-500 flex justify-between font-medium">
          <span>Practice Steps: {history.length - 1} questions attempted</span>
          <span>Mastery Target: 80%</span>
        </div>
        <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden flex">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              isMastered ? "bg-emerald-500" : "bg-blue-600"
            }`}
            style={{ width: `${currentMastery}%` }}
          />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {history.map((step, idx) => (
            <span
              key={idx}
              className={`text-xs px-2.5 py-1 rounded-md border font-medium ${
                idx === 0
                  ? "bg-stone-100 text-stone-700 border-stone-200"
                  : step.correct
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {idx === 0 ? "Start" : step.correct ? "+ Correct" : "– Review"}: {step.score}%
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RetentionProofBench() {
  const [halfLife, setHalfLife] = useState(4.0);
  const [elapsedDays, setElapsedDays] = useState(2.0);

  const retention = Math.pow(2, -elapsedDays / (halfLife || 0.1));

  const graphPoints = Array.from({ length: 29 }, (_, i) => {
    const tVal = i * 0.5;
    const rVal = Math.pow(2, -tVal / (halfLife || 0.1));
    return { t: tVal, r: rVal };
  });

  const svgWidth = 400;
  const svgHeight = 120;
  const padding = 20;

  const getSvgX = (t: number) => padding + (t / 14) * (svgWidth - 2 * padding);
  const getSvgY = (r: number) => (svgHeight - padding) - r * (svgHeight - 2 * padding);

  const pathD = graphPoints.reduce((acc, pt, idx) => {
    const x = getSvgX(pt.t);
    const y = getSvgY(pt.r);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, "");

  const currentX = getSvgX(elapsedDays);
  const currentY = getSvgY(retention);
  const isDue = retention <= 0.60;

  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-stone-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">Interactive Tool 02</span>
          </div>
          <h3 className="text-lg font-bold text-stone-900 mt-1">Smart Memory & Review Scheduler</h3>
          <p className="text-xs text-stone-500">See how concepts fade over time and when a timely 2-minute review locks them into memory</p>
        </div>
        <Clock className="w-5 h-5 text-blue-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-stone-50/80 border border-stone-200/70">
          <div className="text-xs font-medium text-stone-500">Estimated Recall Strength</div>
          <div className="text-3xl font-bold text-stone-900 mt-1">
            {(retention * 100).toFixed(0)}%
          </div>
          <div className="text-xs mt-1.5 font-medium">
            {isDue ? (
              <span className="text-amber-700">Time for a quick 2-min review!</span>
            ) : (
              <span className="text-emerald-700">Concept is still fresh in mind</span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-stone-50/80 border border-stone-200/70">
          <div className="text-xs font-medium text-stone-500">Review Interval</div>
          <div className="text-lg font-bold text-stone-900 mt-1">{halfLife.toFixed(0)} days between reviews</div>
          <input
            type="range"
            min="1"
            max="14"
            step="1"
            value={halfLife}
            onChange={(e) => setHalfLife(parseFloat(e.target.value))}
            className="w-full mt-3 accent-blue-600 cursor-pointer"
          />
        </div>

        <div className="p-4 rounded-xl bg-stone-50/80 border border-stone-200/70">
          <div className="text-xs font-medium text-stone-500">Days Since Last Studied</div>
          <div className="text-lg font-bold text-stone-900 mt-1">{elapsedDays.toFixed(1)} days ago</div>
          <input
            type="range"
            min="0.0"
            max="14.0"
            step="0.5"
            value={elapsedDays}
            onChange={(e) => setElapsedDays(parseFloat(e.target.value))}
            className="w-full mt-3 accent-blue-600 cursor-pointer"
          />
        </div>
      </div>

      <div className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-stone-600">
          <span>Memory Retention Curve</span>
          <span className="text-blue-700 font-semibold">{elapsedDays.toFixed(1)} days elapsed: {(retention * 100).toFixed(0)}% remembered</span>
        </div>
        <div className="w-full overflow-hidden flex justify-center py-2">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-32 select-none">
            <line
              x1={padding}
              y1={getSvgY(0.60)}
              x2={svgWidth - padding}
              y2={getSvgY(0.60)}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth="1"
              opacity="0.8"
            />
            <text x={svgWidth - padding - 100} y={getSvgY(0.60) - 4} fill="#b45309" fontSize="10" fontWeight="500">
              Optimal Review Zone (60%)
            </text>

            <path
              d={pathD}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            <circle
              cx={currentX}
              cy={currentY}
              r="5"
              fill="#2563eb"
            />
            <line
              x1={currentX}
              y1={currentY}
              x2={currentX}
              y2={svgHeight - padding}
              stroke="#93c5fd"
              strokeDasharray="2 2"
              strokeWidth="1"
            />

            <text x={padding} y={svgHeight - 4} fill="#78716c" fontSize="10">Day 0 (Studied)</text>
            <text x={svgWidth / 2 - 15} y={svgHeight - 4} fill="#78716c" fontSize="10">Day 7</text>
            <text x={svgWidth - padding - 30} y={svgHeight - 4} fill="#78716c" fontSize="10">Day 14</text>
          </svg>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-stone-100/70 border border-stone-200 text-xs text-stone-700 flex items-center justify-between">
        <span>Instead of cramming before exams, small scheduled reviews ensure you never forget.</span>
        <span className={`px-2.5 py-0.5 rounded-full font-medium ${
          isDue ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
        }`}>
          {isDue ? "Review Recommended" : "Strong Recall"}
        </span>
      </div>
    </div>
  );
}

export function DiagnosticQuizPreview() {
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const sampleQuestion = {
    prompt: "A car travels 60 kilometers north in one hour, and then turns around and travels 60 kilometers south in the next hour. What is the car's average velocity for the entire trip?",
    options: [
      "60 km/h south",
      "0 km/h (displacement is zero)",
      "120 km/h total speed",
      "30 km/h average"
    ],
    correct: 1,
    explanation: "Velocity is displacement divided by time. Because the car returned to its starting location, its total displacement is 0 km, so its average velocity is 0 km/h (even though its average speed was 60 km/h)."
  };

  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-700">Interactive Tool 03</span>
          </div>
          <h3 className="text-lg font-bold text-stone-900 mt-1">Adaptive Practice Question</h3>
          <p className="text-xs text-stone-500">Practice questions that adjust to your current skill level so you master the fundamentals</p>
        </div>
        <Target className="w-5 h-5 text-violet-600" />
      </div>

      <p className="text-sm font-medium text-stone-900 mb-4 leading-relaxed">
        {sampleQuestion.prompt}
      </p>

      <div className="space-y-2 mb-5">
        {sampleQuestion.options.map((opt, i) => {
          let style = "border-stone-200 bg-stone-50/60 text-stone-700 hover:border-stone-300 hover:bg-stone-100/70";
          if (submitted) {
            if (i === sampleQuestion.correct) {
              style = "border-emerald-400 bg-emerald-50 text-emerald-900 font-semibold";
            } else if (selected === i) {
              style = "border-rose-300 bg-rose-50 text-rose-800";
            }
          } else if (selected === i) {
            style = "border-blue-500 bg-blue-50/60 text-blue-900 font-medium";
          }

          return (
            <button
              key={i}
              onClick={() => !submitted && setSelected(i)}
              className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex items-center justify-between ${style}`}
            >
              <span>{opt}</span>
              {submitted && i === sampleQuestion.correct && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1">
        <button
          disabled={selected === null || submitted}
          onClick={() => setSubmitted(true)}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
        >
          <span>Check My Answer</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
        {submitted && (
          <button
            onClick={() => { setSubmitted(false); setSelected(null); }}
            className="text-xs text-stone-500 hover:text-stone-800 font-medium underline"
          >
            Try Again
          </button>
        )}
      </div>

      {submitted && (
        <div className={`mt-4 p-4 rounded-xl border text-xs leading-relaxed ${
          selected === sampleQuestion.correct
            ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
            : "bg-stone-50 border-stone-200 text-stone-700"
        }`}>
          <div className="font-bold mb-1">
            {selected === sampleQuestion.correct ? "✓ Correct!" : "Here is how to think about this:"}
          </div>
          <p>{sampleQuestion.explanation}</p>
        </div>
      )}
    </div>
  );
}

export function NoteSynthesisPreview() {
  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Interactive Tool 04</span>
          </div>
          <h3 className="text-lg font-bold text-stone-900 mt-1">Study Notes Assistant with Direct Citations</h3>
          <p className="text-xs text-stone-500">Ask any question from your uploaded slides or notes and get verified answers with page citations</p>
        </div>
        <BookOpen className="w-5 h-5 text-amber-600" />
      </div>

      <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 mb-4">
        <div className="text-xs font-semibold text-stone-500 mb-1">Sample Student Question:</div>
        <div className="text-xs font-medium text-stone-900">"What is the physical intuition behind Lenz's law?"</div>
      </div>

      <div className="p-5 rounded-xl bg-stone-50/60 border border-stone-200/80 text-xs text-stone-700 leading-relaxed space-y-3">
        <p>
          According to your lecture notes, <strong>Lenz's law</strong> is a direct consequence of the conservation of energy.
        </p>
        <p>
          When a magnetic field changes near a conductor, the induced electric current creates an opposing magnetic field that resists the change. If it aided the change instead, you would get infinite free energy from an initial small movement!
        </p>
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-medium text-xs flex items-center gap-2">
          <BookmarkCheck className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Verified from your upload: <strong>Physics_Electromagnetism_Notes.pdf</strong> (Lecture 4, Page 12)</span>
        </div>
        <p className="text-xs text-stone-500">
          Notice how the answer cites your exact lecture slide. If a topic is not in your materials, your assistant lets you know rather than guessing.
        </p>
      </div>
    </div>
  );
}

