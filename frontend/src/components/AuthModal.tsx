"use client";

import React, { useState } from 'react';
import { api, User } from '@/lib/api';
import { X, Lock, Mail, User as UserIcon, GraduationCap, Sparkles, Loader2, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  initialMode?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'register' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [educationTier, setEducationTier] = useState('Undergraduate Degree');
  const [boardOrUniversity, setBoardOrUniversity] = useState('');
  const [goal, setGoal] = useState('');
  const [dailyHours, setDailyHours] = useState(2.0);
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login({ email, password });
        onSuccess(res.user);
        onClose();
      } else {
        if (step === 1) {
          setStep(2);
          setLoading(false);
          return;
        }
        const res = await api.register({
          email,
          password,
          name: fullName,
          education_tier: educationTier,
          board_or_university: boardOrUniversity,
          goal: goal,
          target_year: 2026,
          daily_available_hours: dailyHours,
        });
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-stone-200/90 bg-white p-6 sm:p-8 shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 mb-3 shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">
            {mode === 'login' ? 'Welcome Back' : step === 1 ? 'Create Your Account' : 'Set Your Study Goals'}
          </h2>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            {mode === 'login'
              ? 'Sign in to access your notes, study schedule, and practice quizzes.'
              : step === 1
              ? 'Join Mentor Mate to start organizing and mastering your coursework.'
              : 'Tell us about your courses so we can customize your review schedule.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'login' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-stone-50/70 border border-stone-200 text-stone-900 text-xs placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-stone-50/70 border border-stone-200 text-stone-900 text-xs placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>
            </>
          ) : step === 1 ? (
            <>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">Your Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full name"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-stone-50/70 border border-stone-200 text-stone-900 text-xs placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-stone-50/70 border border-stone-200 text-stone-900 text-xs placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-stone-50/70 border border-stone-200 text-stone-900 text-xs placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">Education Level</label>
                <select
                  value={educationTier}
                  onChange={(e) => setEducationTier(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-50/70 border border-stone-200 text-stone-900 text-xs focus:outline-none focus:bg-white focus:border-blue-600"
                >
                  <option value="Undergraduate Degree">Undergraduate Degree</option>
                  <option value="Graduate / Master's">Graduate / Master's</option>
                  <option value="High School (12th Grade)">High School (12th Grade)</option>
                  <option value="High School (10th Grade)">High School (10th Grade)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">School / College Name</label>
                <input
                  type="text"
                  required
                  value={boardOrUniversity}
                  onChange={(e) => setBoardOrUniversity(e.target.value)}
                  placeholder="Institution / School name"
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-50/70 border border-stone-200 text-stone-900 text-xs placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">What is your primary study goal?</label>
                <input
                  type="text"
                  required
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g. Master Coursework / Prepare for Exams"
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-50/70 border border-stone-200 text-stone-900 text-xs placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">Target Daily Study Time (Hours)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="12"
                  value={dailyHours}
                  onChange={(e) => setDailyHours(parseFloat(e.target.value) || 2.0)}
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-50/70 border border-stone-200 text-stone-900 text-xs focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>One moment...</span>
              </>
            ) : mode === 'login' ? (
              <span>Sign In</span>
            ) : step === 1 ? (
              <>
                <span>Next: Study Goals</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <span>Start Learning</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-stone-100 text-center">
          {mode === 'login' ? (
            <p className="text-xs text-stone-500">
              Don't have an account yet?{' '}
              <button
                onClick={() => { setMode('register'); setStep(1); setError(null); }}
                className="text-blue-700 hover:text-blue-800 font-semibold underline"
              >
                Create one now
              </button>
            </p>
          ) : (
            <p className="text-xs text-stone-500">
              Already have an account?{' '}
              <button
                onClick={() => { setMode('login'); setError(null); }}
                className="text-blue-700 hover:text-blue-800 font-semibold underline"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
