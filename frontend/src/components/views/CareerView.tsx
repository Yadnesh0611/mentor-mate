"use client";

import React, { useEffect, useState, useMemo } from 'react';
import {
  api,
  IndustryTrack,
  CareerReadinessResponse,
  JobListing,
  ResumeData,
  JobApplication
} from '@/lib/api';
import {
  Briefcase,
  Building2,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Target,
  FileCode,
  Layers,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  BookOpen,
  Search,
  Filter,
  Check,
  Compass,
  FileText,
  ExternalLink,
  Download,
  Printer,
  Copy,
  MapPin,
  Clock,
  DollarSign,
  Send,
  RefreshCw,
  SlidersHorizontal,
  BookmarkPlus
} from 'lucide-react';

interface Props {
  onNavigateToStudy?: () => void;
}

type TabType = 'rubrics' | 'jobs' | 'resume_studio';

export function CareerView({ onNavigateToStudy }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('rubrics');

  // Track Rubric State
  const [tracks, setTracks] = useState<IndustryTrack[]>([]);
  const [sectors, setSectors] = useState<string[]>(['All']);
  const [selectedSector, setSelectedSector] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTrackId, setSelectedTrackId] = useState<string>('google_swe');
  const [readiness, setReadiness] = useState<CareerReadinessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Job Match State
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [studentGoal, setStudentGoal] = useState<string>('');
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobDomainFilter, setJobDomainFilter] = useState<string>('All');
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);

  // Resume Studio State
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [targetRole, setTargetRole] = useState('Software Development Engineer');
  const [targetCompany, setTargetCompany] = useState('Google');
  const [coverLetterText, setCoverLetterText] = useState<string | null>(null);
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const [showCoverLetterModal, setShowCoverLetterModal] = useState(false);
  const [copiedState, setCopiedState] = useState(false);

  // Real Candidate Specifics State (Zero Hallucination / Zero Fake Data)
  const [showSpecificsPanel, setShowSpecificsPanel] = useState(false);
  const [userPhone, setUserPhone] = useState('');
  const [userLinkedin, setUserLinkedin] = useState('');
  const [userGithub, setUserGithub] = useState('');
  const [userLocation, setUserLocation] = useState('India');
  const [userDegree, setUserDegree] = useState('B.Tech Computer Science & Engineering');
  const [userInstitution, setUserInstitution] = useState('State Technical University');
  const [userGradYear, setUserGradYear] = useState('2026');
  const [userGpa, setUserGpa] = useState('');
  const [userSkillsOverride, setUserSkillsOverride] = useState('C++, Python, Data Structures, Algorithms, SQL, Git, Linux');
  const [userProjects, setUserProjects] = useState<Array<{ id: string; title: string; tech_stack: string; description: string }>>([
    {
      id: '1',
      title: 'Academic Coursework & Problem Solving System',
      tech_stack: 'Python, Data Structures, Algorithms',
      description: 'Implemented modular problem sets and diagnostic assessment benchmarks evaluating time and space complexity invariants.'
    }
  ]);

  // Application Pipeline State
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());

  // Load initial track catalog
  useEffect(() => {
    fetchInitialTracks();
  }, []);

  // Fetch readiness whenever selectedTrackId changes
  useEffect(() => {
    if (selectedTrackId) {
      fetchReadiness(selectedTrackId);
    }
  }, [selectedTrackId]);

  // Load jobs when switching to jobs or resume tab
  useEffect(() => {
    if (activeTab === 'jobs' || activeTab === 'resume_studio') {
      fetchJobsAndApps();
    }
  }, [activeTab]);

  const fetchInitialTracks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getIndustryTracks();
      setTracks(data.tracks);
      if (data.sectors && data.sectors.length > 0) {
        setSectors(data.sectors);
      }
      if (data.tracks.length > 0 && !selectedTrackId) {
        setSelectedTrackId(data.tracks[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load industry benchmarks');
    } finally {
      setLoading(false);
    }
  };

  const fetchReadiness = async (trackId: string) => {
    try {
      const readinessData = await api.getCareerReadiness(trackId);
      setReadiness(readinessData);
    } catch (err: any) {
      console.error('Failed to calculate readiness:', err);
    }
  };

  const fetchJobsAndApps = async () => {
    try {
      setJobsLoading(true);
      const [jobsData, appsData] = await Promise.all([
        api.getRecommendedJobs(),
        api.getUserApplications()
      ]);
      setJobs(jobsData.jobs || []);
      setStudentGoal(jobsData.student_goal || '');
      const userApps = appsData?.applications || [];
      setApplications(userApps);
      const appliedSet = new Set<string>(userApps.map((a: JobApplication) => a.job_id));
      setAppliedJobIds(appliedSet);
      if (!selectedJob && jobsData.jobs && jobsData.jobs.length > 0) {
        setSelectedJob(jobsData.jobs[0]);
        setTargetRole(jobsData.jobs[0].role);
        setTargetCompany(jobsData.jobs[0].company);
      }
    } catch (err: any) {
      console.error('Failed to load jobs or applications:', err);
    } finally {
      setJobsLoading(false);
    }
  };

  const handleAddProject = () => {
    setUserProjects(prev => [
      ...prev,
      {
        id: String(Date.now()),
        title: '',
        tech_stack: '',
        description: ''
      }
    ]);
  };

  const handleRemoveProject = (id: string) => {
    setUserProjects(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdateProject = (id: string, field: 'title' | 'tech_stack' | 'description', value: string) => {
    setUserProjects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleGenerateResume = async (job?: JobListing) => {
    const role = job ? job.role : targetRole;
    const company = job ? job.company : targetCompany;
    if (job) {
      setSelectedJob(job);
      setTargetRole(job.role);
      setTargetCompany(job.company);
    }
    setActiveTab('resume_studio');
    try {
      setResumeLoading(true);
      const formattedProjects = userProjects
        .filter(p => p.title.trim() !== '')
        .map(p => ({
          title: p.title.trim(),
          tech_stack: p.tech_stack.split(',').map(s => s.trim()).filter(Boolean),
          description: p.description.trim()
        }));

      const res = await api.generatePersonalizedResume({
        job_id: job?.id,
        target_role: role,
        custom_instructions: `Targeting ${company}. Strictly authentic formatting.`,
        contact: {
          phone: userPhone.trim() || undefined,
          linkedin: userLinkedin.trim() || undefined,
          github: userGithub.trim() || undefined,
          location: userLocation.trim() || undefined,
        },
        education: {
          degree: userDegree.trim() || undefined,
          institution: userInstitution.trim() || undefined,
          graduation_year: userGradYear.trim() || undefined,
          gpa: userGpa.trim() || undefined,
        },
        skills_override: userSkillsOverride.trim()
          ? userSkillsOverride.split(',').map(s => s.trim()).filter(Boolean)
          : undefined,
        projects: formattedProjects.length > 0 ? formattedProjects : undefined
      });
      setResumeData(res.resume);
    } catch (err: any) {
      console.error('Failed to generate resume:', err);
    } finally {
      setResumeLoading(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    try {
      setCoverLetterLoading(true);
      const res = await api.generateCoverLetter({
        job_id: selectedJob?.id || 'custom_swe',
        company: selectedJob?.company || targetCompany,
        role: selectedJob?.role || targetRole
      });
      setCoverLetterText(res.cover_letter);
      setShowCoverLetterModal(true);
    } catch (err: any) {
      console.error('Failed to generate cover letter:', err);
    } finally {
      setCoverLetterLoading(false);
    }
  };

  const handleApplyToJob = async (job: JobListing) => {
    try {
      await api.createJobApplication({
        job_id: job.id,
        company: job.company,
        role: job.role,
        location: job.location,
        status: 'applied',
        notes: `Matched at ${job.match_score_pct}% overlap`
      });
      setAppliedJobIds(prev => new Set(prev).add(job.id));
      const apps = await api.getUserApplications();
      setApplications(apps?.applications || []);
    } catch (err: any) {
      console.error('Failed to record application:', err);
    }
  };

  const handleCopyResume = () => {
    if (!resumeData) return;
    const text = `${resumeData.name}\n${resumeData.title} | ${resumeData.contact.email} | ${resumeData.contact.linkedin}\n\nSUMMARY:\n${resumeData.summary}\n\nSKILLS:\nLanguages: ${resumeData.skills.languages.join(', ')}\nFrameworks & Tools: ${resumeData.skills.frameworks_tools.join(', ')}\nCore Concepts: ${resumeData.skills.core_concepts.join(', ')}\n\nPROJECTS & EXPERIENCE:\n${resumeData.projects.map(p => `• ${p.title} (${p.tech_stack.join(', ')})\n${p.bullet_points.map(b => `  - ${b}`).join('\n')}`).join('\n\n')}\n\nEDUCATION:\n${resumeData.education.degree}, ${resumeData.education.institution} (${resumeData.education.graduation_year})\n\nVERIFIED CREDENTIALS:\n${resumeData.verified_achievements.map(a => `• ${a}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  const handlePrintResume = () => {
    window.print();
  };

  // Filtered tracks based on sector and search query
  const filteredTracks = useMemo(() => {
    return tracks.filter(t => {
      const matchSector = selectedSector === 'All' || t.sector?.toLowerCase() === selectedSector.toLowerCase();
      if (!matchSector) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.company.toLowerCase().includes(q) ||
        t.role.toLowerCase().includes(q) ||
        (t.sector && t.sector.toLowerCase().includes(q)) ||
        t.key_topics.some(top => top.toLowerCase().includes(q)) ||
        t.hiring_criteria.some(c => c.domain.toLowerCase().includes(q) || c.focus.toLowerCase().includes(q))
      );
    });
  }, [tracks, selectedSector, searchQuery]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    if (jobDomainFilter === 'All') return jobs;
    return jobs.filter(j => j.sector?.toLowerCase() === jobDomainFilter.toLowerCase() || j.experience_level?.toLowerCase() === jobDomainFilter.toLowerCase());
  }, [jobs, jobDomainFilter]);

  const selectedTrack = tracks.find(t => t.id === selectedTrackId) || readiness?.track || tracks[0];

  return (
    <div className="space-y-6">
      {/* 1. Primary Navigation Tabs */}
      <div className="p-2 rounded-2xl bg-white border border-stone-200 shadow-2xs flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('rubrics')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'rubrics'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            <Compass className="w-4 h-4 text-amber-300" />
            <span>Hiring Rubrics & Radar</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-200">100+</span>
          </button>

          <button
            onClick={() => setActiveTab('jobs')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'jobs'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            <Briefcase className="w-4 h-4 text-white" />
            <span>LinkedIn Tech Hirings</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500 text-white font-semibold">AI Matched</span>
          </button>

          <button
            onClick={() => setActiveTab('resume_studio')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0 ${
              activeTab === 'resume_studio'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-200" />
            <span>ATS Resume & Studio</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-800 text-emerald-100 font-semibold">STAR Format</span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-2 text-xs text-stone-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">Authentic Knowledge State Sync</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: HIRING RUBRICS & READINESS RADAR */}
      {/* ========================================================================= */}
      {activeTab === 'rubrics' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-2 rounded-xl bg-stone-900 text-white shadow-2xs">
                    <Compass className="w-5 h-5 text-amber-300" />
                  </div>
                  <h1 className="text-xl font-bold text-stone-900">Industry Career Compass & Hiring Rubrics</h1>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
                    Top 100+ Enterprise Rubrics
                  </span>
                </div>
                <p className="text-xs text-stone-500 max-w-3xl leading-relaxed">
                  Explore authentic hiring bars across Big Tech, Quant/HFT, AI Research Labs, Cloud Infra, Cybersecurity, Semiconductors, and High-Growth Unicorns. We calibrate your actual syllabus mastery against real technical interview rounds.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Sectors</span>
                  <span className="text-sm font-bold text-stone-900">{sectors.length - 1} Fields</span>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-stone-50 border border-stone-200 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Companies</span>
                  <span className="text-sm font-bold text-stone-900">{tracks.length} Top Rubrics</span>
                </div>
              </div>
            </div>

            {/* Search & Sector Navigation Bar */}
            <div className="pt-2 border-t border-stone-100 flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Search Box */}
              <div className="relative w-full md:w-80 shrink-0">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search company, role, skill (e.g. CUDA, DP, Rust, OS)..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-stone-50/80 border border-stone-200 text-stone-900 text-xs placeholder:text-stone-400 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-[10px] text-stone-400 hover:text-stone-700"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Sector Category Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 scrollbar-none">
                {sectors.map((sec) => {
                  const isSelected = selectedSector.toLowerCase() === sec.toLowerCase();
                  return (
                    <button
                      key={sec}
                      onClick={() => setSelectedSector(sec)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all border shrink-0 ${
                        isSelected
                          ? 'bg-stone-900 text-white border-stone-900 shadow-2xs font-semibold'
                          : 'bg-stone-50 text-stone-600 border-stone-200/80 hover:bg-stone-100'
                      }`}
                    >
                      {sec}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              {error}
            </div>
          )}

          {/* Company Quick Selection Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-stone-500 px-1">
              <span>Showing <strong>{filteredTracks.length}</strong> of <strong>{tracks.length}</strong> top companies</span>
              {selectedTrack && (
                <span className="text-[11px] text-stone-500">
                  Selected: <strong className="text-stone-900">{selectedTrack.company}</strong> ({selectedTrack.role})
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {filteredTracks.map((t) => {
                const isSelected = selectedTrackId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTrackId(t.id)}
                    className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? 'bg-stone-900 text-white border-stone-900 shadow-md ring-2 ring-stone-900/10'
                        : 'bg-white text-stone-800 border-stone-200/90 hover:border-stone-400 hover:bg-stone-50/60 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className={`font-bold text-xs truncate ${isSelected ? 'text-white' : 'text-stone-900'}`}>
                        {t.company}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-amber-300 shrink-0" />}
                    </div>

                    <div className="space-y-0.5">
                      <span className={`text-[10px] block truncate ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                        {t.role.split('(')[0]}
                      </span>
                      <div className="flex items-center gap-1 pt-0.5">
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                            isSelected
                              ? 'bg-stone-800 text-stone-200'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {t.difficulty_tier}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Company Track Breakdown & Live Readiness Radar */}
          {selectedTrack && readiness && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              {/* Left Column: Target Company Profile & Hiring Criteria */}
              <div className="lg:col-span-7 space-y-6">
                {/* Company Profile Card */}
                <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-4">
                  <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Building2 className="w-5 h-5 text-stone-700" />
                        <h2 className="text-lg font-bold text-stone-900">{selectedTrack.company}</h2>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-stone-700">
                          {selectedTrack.difficulty_tier} Bar
                        </span>
                        {selectedTrack.sector && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-800">
                            {selectedTrack.sector}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-stone-600 mt-1">{selectedTrack.role}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-stone-400 font-medium block">Benchmark Bar</span>
                      <span className="text-sm font-bold text-stone-900">{readiness.hiring_bar_threshold}% Mastery</span>
                    </div>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed bg-stone-50/80 p-3.5 rounded-xl border border-stone-200/60">
                    {selectedTrack.summary}
                  </p>

                  {/* Hiring Criteria Weights */}
                  <div className="space-y-3 pt-1">
                    <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-stone-500" />
                      <span>Interview Weightage & Core Focus Areas</span>
                    </h3>

                    <div className="space-y-2.5">
                      {selectedTrack.hiring_criteria.map((crit, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl border border-stone-200/80 bg-white hover:border-stone-300 transition-all space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-semibold text-stone-800">
                            <span>{crit.domain}</span>
                            <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px] font-bold">
                              {crit.weight_percent}%
                            </span>
                          </div>
                          <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-stone-900 h-full rounded-full transition-all duration-500"
                              style={{ width: `${crit.weight_percent}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-stone-500">{crit.focus}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Verified Interviewer Rubric Insight */}
                  <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Lightbulb className="w-4 h-4 text-amber-700" />
                      <span>Real Engineering Rubric Tip for {selectedTrack.company}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-amber-900">
                      {selectedTrack.interviewer_tip}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Student Readiness & Skill Gap Analysis */}
              <div className="lg:col-span-5 space-y-6">
                {/* Readiness Score Card */}
                <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-stone-900">Your Company Readiness</h3>
                      <p className="text-[11px] text-stone-500">Calculated strictly from your actual quiz attempts</p>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-800">
                      <Award className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="text-center p-5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
                    <div className="text-4xl font-black text-stone-900 tracking-tight">
                      {readiness.readiness_score}%
                    </div>
                    <div className="flex items-center justify-center gap-1.5 text-xs font-semibold">
                      {readiness.readiness_score === 0 || readiness.assessed_topics_count === 0 ? (
                        <span className="text-stone-500 flex items-center gap-1">
                          <HelpCircle className="w-4 h-4 text-stone-400" /> Untested: 0 / {readiness.total_topics_count || readiness.skill_gaps.length} Topics Assessed
                        </span>
                      ) : readiness.is_interview_ready ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Ready for {selectedTrack.company} Bar
                        </span>
                      ) : (
                        <span className="text-amber-700 flex items-center gap-1">
                          <Zap className="w-4 h-4" /> Target: Reach {readiness.hiring_bar_threshold}% Benchmark
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-600 max-w-xs mx-auto leading-relaxed">
                      {readiness.recommended_action}
                    </p>
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" /> 100% Genuine Data — Zero Synthetic Baselines
                      </span>
                    </div>
                  </div>

                  {/* Topic-by-Topic Skill Gaps */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                        Rubric Topic Mastery
                      </h4>
                      <span className="text-[11px] text-stone-400">
                        {readiness.assessed_topics_count || 0}/{readiness.total_topics_count || readiness.skill_gaps.length} Tested
                      </span>
                    </div>

                    <div className="space-y-2">
                      {readiness.skill_gaps.map((gap, idx) => {
                        const isUntested = gap.status === 'Untested';
                        const isReady = gap.status === 'Ready';
                        const isDev = gap.status === 'Developing';

                        return (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-white border border-stone-200 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <span className="font-semibold text-stone-900 block truncate">{gap.topic}</span>
                              <span className="text-[10px] text-stone-500">
                                {isUntested ? (
                                  <span className="text-stone-400">Current: <strong className="text-stone-600">0.0% (Unassessed)</strong> / Req: {gap.required_benchmark}%</span>
                                ) : (
                                  <span>Current: <strong className="text-stone-800">{gap.current_mastery}%</strong> / Req: {gap.required_benchmark}%</span>
                                )}
                              </span>
                            </div>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                                isUntested
                                  ? 'bg-stone-100 text-stone-600 border border-stone-200'
                                  : isReady
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : isDev
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-rose-50 text-rose-800 border border-rose-200'
                              }`}
                            >
                              {gap.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Button */}
                  {onNavigateToStudy && (
                    <button
                      onClick={onNavigateToStudy}
                      className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>
                        {readiness.assessed_topics_count === 0
                          ? `Take Diagnostic Quiz for ${selectedTrack.company}`
                          : `Practice High-Yield Topics for ${selectedTrack.company}`}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LINKEDIN TECH HIRINGS MATCH ENGINE */}
      {/* ========================================================================= */}
      {activeTab === 'jobs' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-stone-900 text-white shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-2 rounded-xl bg-blue-600 text-white shadow-2xs">
                    <Briefcase className="w-5 h-5 text-white" />
                  </div>
                  <h1 className="text-xl font-bold">LinkedIn Tech Hirings & AI Job Match</h1>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-400/20 text-blue-200 border border-blue-400/30">
                    Live Hiring Radar
                  </span>
                </div>
                <p className="text-xs text-blue-100/90 max-w-2xl leading-relaxed">
                  Our AI scans active hiring openings across LinkedIn and matches them directly against your verified syllabus mastery and BKT skills state. One-click tailored ATS resume generation and direct LinkedIn application links.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={fetchJobsAndApps}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold flex items-center gap-2 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${jobsLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Matches</span>
                </button>
              </div>
            </div>

            {/* Student Goal Context */}
            {studentGoal && (
              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-blue-200 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Target Career Trajectory:
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-white/15 text-white text-[11px] font-medium border border-white/10">
                  {studentGoal}
                </span>
              </div>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {['All', 'Big Tech / Cloud', 'AI & Machine Learning', 'Fintech / Trading', 'Cybersecurity', 'Autonomous Systems', 'Early Career'].map((f) => (
              <button
                key={f}
                onClick={() => setJobDomainFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border shrink-0 ${
                  jobDomainFilter === f
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Job Listings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job) => {
              const isApplied = appliedJobIds.has(job.id);
              return (
                <div
                  key={job.id}
                  className="p-5 rounded-2xl bg-white border border-stone-200/90 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  {/* Top Header */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                          {job.company}
                        </span>
                        <h3 className="text-sm font-bold text-stone-900 line-clamp-1">{job.role}</h3>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black">
                          {job.match_score_pct}% Match
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-stone-400" />
                        {job.location}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-stone-400" />
                        {job.salary_range}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>
                  </div>

                  {/* Skills Breakdown */}
                  <div className="space-y-2 pt-2 border-t border-stone-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                        Matching Strengths ({job.matched_skills.length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {job.matched_skills.slice(0, 3).map((sk: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-100">
                            ✓ {sk}
                          </span>
                        ))}
                      </div>
                    </div>

                    {job.missing_skills.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block mb-1">
                          Skill Gaps to Cover ({job.missing_skills.length})
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {job.missing_skills.slice(0, 3).map((sk: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-medium border border-amber-100">
                              + {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-stone-100 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleGenerateResume(job)}
                        className="py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-300" />
                        <span>Tailor Resume</span>
                      </button>

                      <a
                        href={job.apply_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>LinkedIn Job</span>
                      </a>
                    </div>

                    <button
                      onClick={() => handleApplyToJob(job)}
                      disabled={isApplied}
                      className={`w-full py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                        isApplied
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                          : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200'
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Tracked in Application Pipeline</span>
                        </>
                      ) : (
                        <>
                          <BookmarkPlus className="w-3.5 h-3.5 text-stone-500" />
                          <span>Mark as Applied & Track</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ATS RESUME & APPLICATION STUDIO */}
      {/* ========================================================================= */}
      {activeTab === 'resume_studio' && (
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-2 rounded-xl bg-emerald-800 text-white shadow-2xs">
                    <FileText className="w-5 h-5 text-emerald-200" />
                  </div>
                  <h1 className="text-xl font-bold text-stone-900">AI Personalized ATS Resume Studio</h1>
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800">
                    100% Real Data • Zero Hallucinations
                  </span>
                </div>
                <p className="text-xs text-stone-500 max-w-3xl leading-relaxed">
                  Synthesize an authentic, recruiter-grade ATS resume grounded strictly in your real projects, contact specifics, and verified BKT knowledge states. No fake metrics, fake companies, or synthetic baselines.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowSpecificsPanel(!showSpecificsPanel)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                    showSpecificsPanel
                      ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>{showSpecificsPanel ? 'Hide Details Form' : 'Provide Real Specifics'}</span>
                </button>

                <button
                  onClick={() => handleGenerateResume()}
                  disabled={resumeLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-xs disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 ${resumeLoading ? 'animate-spin' : ''}`} />
                  <span>{resumeLoading ? 'Synthesizing...' : 'Generate Real ATS Resume'}</span>
                </button>

                <button
                  onClick={handleGenerateCoverLetter}
                  disabled={coverLetterLoading}
                  className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-2 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Cover Letter</span>
                </button>
              </div>
            </div>

            {/* Targeting Inputs */}
            <div className="pt-3 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Target Role
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Machine Learning Engineer"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-medium text-stone-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  Target Company
                </label>
                <input
                  type="text"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="e.g. NVIDIA, Google, OpenAI"
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 text-xs font-medium text-stone-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => handleGenerateResume()}
                  className="w-full py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Update & Regenerate</span>
                </button>
              </div>
            </div>
          </div>

          {/* REAL SPECIFICS CUSTOMIZATION PANEL (ZERO FAKE DATA) */}
          {showSpecificsPanel && (
            <div className="p-6 rounded-2xl bg-white border border-stone-300 shadow-sm space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-stone-900">Your Real Details & Specifics</h3>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    We strictly use the real details you provide below. No fake metrics, fake projects, or synthetic numbers will be added.
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Strictly Verified
                </span>
              </div>

              {/* 1. Real Contact Details */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">1. Contact & Social Links</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-stone-500 font-medium block mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-500 font-medium block mb-1">LinkedIn Profile</label>
                    <input
                      type="text"
                      value={userLinkedin}
                      onChange={(e) => setUserLinkedin(e.target.value)}
                      placeholder="linkedin.com/in/yourname"
                      className="w-full px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-500 font-medium block mb-1">GitHub Profile</label>
                    <input
                      type="text"
                      value={userGithub}
                      onChange={(e) => setUserGithub(e.target.value)}
                      placeholder="github.com/yourhandle"
                      className="w-full px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-500 font-medium block mb-1">Location</label>
                    <input
                      type="text"
                      value={userLocation}
                      onChange={(e) => setUserLocation(e.target.value)}
                      placeholder="Bengaluru, India"
                      className="w-full px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Real Education Details */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">2. Education & Academics</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-stone-500 font-medium block mb-1">Degree & Major</label>
                    <input
                      type="text"
                      value={userDegree}
                      onChange={(e) => setUserDegree(e.target.value)}
                      placeholder="B.Tech Computer Science"
                      className="w-full px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-500 font-medium block mb-1">Institution / College</label>
                    <input
                      type="text"
                      value={userInstitution}
                      onChange={(e) => setUserInstitution(e.target.value)}
                      placeholder="e.g. IIT Bombay / State Technical University"
                      className="w-full px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-500 font-medium block mb-1">Graduation Year</label>
                    <input
                      type="text"
                      value={userGradYear}
                      onChange={(e) => setUserGradYear(e.target.value)}
                      placeholder="2026"
                      className="w-full px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-stone-500 font-medium block mb-1">CGPA / Percentage (Optional)</label>
                    <input
                      type="text"
                      value={userGpa}
                      onChange={(e) => setUserGpa(e.target.value)}
                      placeholder="e.g. 8.9 / 10"
                      className="w-full px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Real Projects / Work Built */}
              <div className="space-y-3 pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                    3. Real Projects & Technical Work (STAR Format)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddProject}
                    className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  >
                    + Add Another Real Project
                  </button>
                </div>

                <div className="space-y-3">
                  {userProjects.map((p, idx) => (
                    <div key={p.id} className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-stone-700">Project #{idx + 1}</span>
                        {userProjects.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveProject(p.id)}
                            className="text-[10px] text-rose-600 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[10px] text-stone-500 font-medium block mb-1">Project Title</label>
                          <input
                            type="text"
                            value={p.title}
                            onChange={(e) => handleUpdateProject(p.id, 'title', e.target.value)}
                            placeholder="e.g. Distributed Video Transcoder or Library DBMS"
                            className="w-full px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-emerald-600"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-stone-500 font-medium block mb-1">Tech Stack (comma separated)</label>
                          <input
                            type="text"
                            value={p.tech_stack}
                            onChange={(e) => handleUpdateProject(p.id, 'tech_stack', e.target.value)}
                            placeholder="e.g. Python, FastAPI, Docker, PostgreSQL"
                            className="w-full px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-emerald-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-stone-500 font-medium block mb-1">
                          What you built, technical challenges, and results (STAR)
                        </label>
                        <textarea
                          rows={2}
                          value={p.description}
                          onChange={(e) => handleUpdateProject(p.id, 'description', e.target.value)}
                          placeholder="e.g. Implemented asynchronous task workers with Redis queues. Reduced latency by 35% and handled 5,000 requests/sec with zero drops."
                          className="w-full px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Real Skills */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">4. Real Skills & Tools You Know</h4>
                <div>
                  <input
                    type="text"
                    value={userSkillsOverride}
                    onChange={(e) => setUserSkillsOverride(e.target.value)}
                    placeholder="e.g. C++, Python, SQL, Docker, Linux, React"
                    className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">
                    Comma-separated list. Only real skills will be included and aligned with the job description.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleGenerateResume()}
                  disabled={resumeLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-xs"
                >
                  <Sparkles className={`w-4 h-4 ${resumeLoading ? 'animate-spin' : ''}`} />
                  <span>Synthesize Verified Resume Now</span>
                </button>
              </div>
            </div>
          )}

          {/* Main Resume Preview Canvas */}
          {resumeData ? (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between bg-stone-100 p-3 rounded-xl text-xs border border-stone-200">
                <div className="flex items-center gap-2 text-stone-600 font-medium">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span>Resume Preview: <strong>{resumeData.name} — {resumeData.title}</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyResume}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 font-medium flex items-center gap-1.5 transition-colors"
                  >
                    {copiedState ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedState ? 'Copied!' : 'Copy Plaintext'}</span>
                  </button>
                  <button
                    onClick={handlePrintResume}
                    className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / Save PDF</span>
                  </button>
                </div>
              </div>

              {/* Printable ATS Resume Card */}
              <div id="printable-resume" className="p-10 rounded-2xl bg-white border border-stone-300 shadow-md max-w-4xl mx-auto space-y-6 text-stone-900 font-sans">
                {/* 1. Header */}
                <div className="text-center border-b border-stone-300 pb-4 space-y-1">
                  <h1 className="text-2xl font-bold tracking-tight text-stone-950 uppercase">{resumeData.name}</h1>
                  <p className="text-sm font-semibold text-stone-700">{resumeData.title}</p>
                  <p className="text-xs text-stone-500 flex items-center justify-center gap-2 flex-wrap">
                    {[
                      resumeData.contact.email,
                      resumeData.contact.phone,
                      resumeData.contact.location,
                      resumeData.contact.linkedin,
                      resumeData.contact.github
                    ]
                      .filter(Boolean)
                      .map((info, idx, arr) => (
                        <React.Fragment key={idx}>
                          <span>{info}</span>
                          {idx < arr.length - 1 && <span>•</span>}
                        </React.Fragment>
                      ))}
                  </p>
                </div>

                {/* 2. Professional Summary */}
                <div className="space-y-1.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-stone-900 border-b border-stone-200 pb-1">
                    Professional Summary
                  </h2>
                  <p className="text-xs leading-relaxed text-stone-700 text-justify">
                    {resumeData.summary}
                  </p>
                </div>

                {/* 3. Technical Skills */}
                <div className="space-y-1.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-stone-900 border-b border-stone-200 pb-1">
                    Technical Skills & Core Competencies
                  </h2>
                  <div className="text-xs space-y-1 text-stone-800">
                    <p>
                      <strong>Languages:</strong> {resumeData.skills.languages.join(', ')}
                    </p>
                    <p>
                      <strong>Frameworks & Tools:</strong> {resumeData.skills.frameworks_tools.join(', ')}
                    </p>
                    <p>
                      <strong>Core Domains:</strong> {resumeData.skills.core_concepts.join(', ')}
                    </p>
                  </div>
                </div>

                {/* 4. Verified Projects & Technical Experience (STAR) */}
                <div className="space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-stone-900 border-b border-stone-200 pb-1">
                    Engineering Projects & Technical Experience
                  </h2>

                  <div className="space-y-3.5">
                    {resumeData.projects.map((proj, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="font-bold text-stone-900">{proj.title}</span>
                          <span className="text-stone-500 italic">[{proj.tech_stack.join(', ')}]</span>
                        </div>
                        <ul className="text-xs text-stone-700 space-y-1 list-disc pl-4 leading-relaxed">
                          {proj.bullet_points.map((pt, pIdx) => (
                            <li key={pIdx}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Education */}
                <div className="space-y-1.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-stone-900 border-b border-stone-200 pb-1">
                    Education & Academics
                  </h2>
                  <div className="flex items-center justify-between text-xs text-stone-800">
                    <div>
                      <span className="font-bold">{resumeData.education.degree}</span>
                      <span className="text-stone-500"> — {resumeData.education.institution}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-stone-400">({resumeData.education.graduation_year})</span>
                    </div>
                  </div>
                </div>

                {/* 6. Verified Achievements & Badges */}
                <div className="space-y-1.5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-stone-900 border-b border-stone-200 pb-1">
                    Verified Competencies & Academic Badges
                  </h2>
                  <ul className="text-xs text-stone-700 space-y-0.5 list-disc pl-4">
                    {resumeData.verified_achievements.map((ach, idx) => (
                      <li key={idx} className="leading-relaxed">{ach}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 rounded-2xl bg-white border border-stone-200 text-center space-y-3">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 w-fit mx-auto">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-stone-900">No Resume Generated Yet</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Click "Generate New Resume" to synthesize an ATS-compliant resume tailored to {targetCompany} for the {targetRole} position.
              </p>
              <button
                onClick={() => handleGenerateResume()}
                disabled={resumeLoading}
                className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Synthesize Personalized ATS Resume</span>
              </button>
            </div>
          )}

          {/* Application Pipeline Table */}
          <div className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Tracked Applications</h3>
                <p className="text-[11px] text-stone-500">Manage selective job applications & interview pipelines</p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700">
                {applications.length} Active
              </span>
            </div>

            {applications.length > 0 ? (
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
                {applications.map((app) => (
                  <div key={app.id} className="p-3.5 flex items-center justify-between gap-3 text-xs bg-white hover:bg-stone-50/50">
                    <div>
                      <span className="font-bold text-stone-900">{app.role}</span>
                      <span className="text-stone-500 ml-1.5 font-medium">@ {app.company}</span>
                      <div className="text-[10px] text-stone-400 mt-0.5">
                        Applied on: {new Date(app.applied_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
                        {app.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-stone-400 bg-stone-50 rounded-xl border border-stone-100">
                No active job applications tracked yet. Browse the "LinkedIn Tech Hirings" tab to match and track applications.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cover Letter Modal */}
      {showCoverLetterModal && coverLetterText && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-bold text-stone-900">Tailored Cover Letter for {targetCompany}</h3>
              </div>
              <button
                onClick={() => setShowCoverLetterModal(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-800 whitespace-pre-wrap font-serif leading-relaxed">
              {coverLetterText}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(coverLetterText);
                  alert('Cover letter copied to clipboard!');
                }}
                className="px-4 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Letter</span>
              </button>
              <button
                onClick={() => setShowCoverLetterModal(false)}
                className="px-4 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

