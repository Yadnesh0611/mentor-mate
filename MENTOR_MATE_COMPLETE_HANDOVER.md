# 🚀 MENTOR MATE — COMPLETE MASTER PROJECT HANDOVER & SPECIFICATION
**Project Repository:** Yadnesh0611/mentor-mate (Branch: main)  
**Target Milestone:** Full-Fledge Production & Next-Phase Roadmap  
**Document Prepared For:** Pritesh & Core Engineering Team  
**Date:** September 2026  

---

## 📑 TABLE OF CONTENTS
1. [Executive Summary & Product Vision](#1-executive-summary--product-vision)
2. [High-Level Architecture & Tech Stack](#2-high-level-architecture--tech-stack)
3. [Core Mathematical & AI Engines](#3-core-mathematical--ai-engines)
4. [Subsystems & Feature Breakdown](#4-subsystems--feature-breakdown)
   - 4.1 [Personalized Study Overview & Profile Customizer](#41-personalized-study-overview--profile-customizer)
   - 4.2 [Multimodal Study Material & OCR Studio](#42-multimodal-study-material--ocr-studio)
   - 4.3 [Dynamic Concept Dependency Knowledge Graph](#43-dynamic-concept-dependency-knowledge-graph)
   - 4.4 [Adaptive Diagnostic Assessment Engine (Bloom's Taxonomy)](#44-adaptive-diagnostic-assessment-engine-blooms-taxonomy)
   - 4.5 [Ebbinghaus Spaced Repetition Station (Dual-Track)](#45-ebbinghaus-spaced-repetition-station-dual-track)
   - 4.6 [Open Source & NPTEL Swayam (IIT/IISc) Course Catalog](#46-open-source--nptel-swayam-iitiisc-course-catalog)
   - 4.7 [Career Readiness Radar & 40+ Industry Benchmarks](#47-career-readiness-radar--40-industry-benchmarks)
   - 4.8 [LinkedIn Real-Time Job Matcher & Application Pipeline](#48-linkedin-real-time-job-matcher--application-pipeline)
   - 4.9 [Zero-Hallucination ATS Resume & Cover Letter Studio](#49-zero-hallucination-ats-resume--cover-letter-studio)
   - 4.10 [Well-being & Burnout Shield](#410-well-being--burnout-shield)
   - 4.11 [Circadian Study Planner & Calendar](#411-circadian-study-planner--calendar)
5. [Database Models & Entity-Relationship Schema](#5-database-models--entity-relationship-schema)
6. [Complete REST API Catalog](#6-complete-rest-api-catalog)
7. [AI Multi-Provider Architecture (OpenClaw OmniRoute)](#7-ai-multi-provider-architecture-openclaw-omniroute)
8. [Frontend View Hierarchy & State Management](#8-frontend-view-hierarchy--state-management)
9. [Test Suite & Quality Assurance Verification](#9-test-suite--quality-assurance-verification)
10. [Environment Variables & Configuration](#10-environment-variables--configuration)
11. [How to Run Locally & Live Deployment](#11-how-to-run-locally--live-deployment)
12. [Recommended Next Steps for Pritesh](#12-recommended-next-steps-for-pritesh)

---

## 1. EXECUTIVE SUMMARY & PRODUCT VISION

Mentor Mate is an AI-powered academic and career readiness operating system. It moves beyond generic chat assistants by implementing probabilistic cognitive modeling, spaced retrieval biology, vectorized curriculum parsing, and zero-hallucination career synthesis.

### Core Value Propositions
1. Bayesian Knowledge Tracing (BKT): Tracks genuine mastery state probabilities per concept P(L), eliminating subjective self-reporting.
2. Ebbinghaus Memory Retention Engine: Calculates forgetting curves to trigger review prompts before memory decay occurs.
3. Curriculum-Grounded Assessment Generation: Formulates Bloom's Taxonomy-indexed questions directly from uploaded textbooks and verified syllabi.
4. Authentic ATS Career Bridge: Matches candidates against live LinkedIn tech hirings using verified BKT competencies and synthesizes 100% authentic, STAR-formatted resumes based exclusively on student-entered specifics.
5. Cognitive Burnout Shield: Monitors study fatigue, circadian pacing, and offers evidence-based physiological reset protocols.

---

## 2. HIGH-LEVEL ARCHITECTURE & TECH STACK

`
+--------------------------------------------------------------------------+
|                   NEXT.JS 14 FRONTEND (App Router)                       |
|  - Tailwind CSS + Lucide Icons + KaTeX + Canvas Confetti                 |
|  - Type-safe API Client (/src/lib/api.ts)                                |
|  - Localhost (3000) & Cloudflare Tunnel Dual-Mode Sync                   |
+------------------------------------+-------------------------------------+
                                     | HTTP REST JSON / Multipart
+------------------------------------v-------------------------------------+
|                     FASTAPI BACKEND (Python 3.12)                        |
|  - Async SQLAlchemy + Pydantic v2 + Uvicorn                              |
|  - SQLite (Local Dev) / PostgreSQL (Production Compatible)               |
|  - OpenClaw OmniRoute Multi-Provider AI Routing Engine                   |
+--------------------------------------------------------------------------+
|  MODULES:                                                                |
|  |-- /auth          -> JWT Auth & Password Hashing                       |
|  |-- /users         -> Profile, Education Tier, Goal Management          |
|  |-- /knowledge     -> Concept Graph & BKT Knowledge States              |
|  |-- /assessments   -> Diagnostic Test Synthesis & Answer Evaluation     |
|  |-- /revision      -> Ebbinghaus Spaced Repetition Scheduling           |
|  |-- /resources     -> PDF/Image OCR, Semantic Chunking & Vector Search  |
|  |-- /courses       -> Curated, NPTEL/Swayam IIT/IISc & Personalized AI  |
|  |-- /career        -> LinkedIn Matcher, ATS Resume & 40+ Industry Rubrics|
|  |-- /wellbeing     -> Burnout Shield & Psychological Resets             |
|  \-- /study-plan    -> Circadian Study Schedule & Target Hours           |
+------------------------------------+-------------------------------------+
                                     |
+------------------------------------v-------------------------------------+
|                  AI INFERENCE & VECTOR INFRASTRUCTURE                    |
|  - Google Gemini 2.5 Pro / Flash (Primary High-Throughput & Vision)       |
|  - DeepSeek V3 / R1 (Mathematical & Code Reasoning)                      |
|  - Groq LLaMA 3.3 70B (Sub-200ms Latency Fallback)                       |
|  - Tesseract OCR & PyMuPDF (Document & Formula Parsing)                  |
|  - Local Cosine Similarity Vector Search Embeddings                      |
+--------------------------------------------------------------------------+
`

### Technology Matrix
- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide React, KaTeX (Math), Canvas Confetti
- Backend: FastAPI, Python 3.12, Uvicorn, Pydantic v2, Async SQLAlchemy, SQLite / PostgreSQL
- Document / OCR: PyMuPDF (fitz), Tesseract OCR, Pillow, Regex Formula Extractor
- AI Providers: Google Gemini (2.5 Pro / Flash), DeepSeek, Groq LLaMA 3.3, Ollama (Local)
- Testing: Pytest, AnyIO, TypeScript Compiler (tsc --noEmit)
- Deployment: Cloudflare Named Tunnels, Batch Executables

---

## 3. CORE MATHEMATICAL & AI ENGINES

### 3.1 Bayesian Knowledge Tracing (BKT)
Tracks student mastery probability P(L_t) for every concept over sequential interactions:
- On Correct Answer: P(L_{t+1}|Correct) = [P(L_t) * (1 - P(S))] / [P(L_t) * (1 - P(S)) + (1 - P(L_t)) * P(G)]
- On Incorrect Answer: P(L_{t+1}|Incorrect) = [P(L_t) * P(S)] / [P(L_t) * P(S) + (1 - P(L_t)) * (1 - P(G))]
- Updated Mastery: P(L_{t+1}) = P(L_{t+1}|Observation) + (1 - P(L_{t+1}|Observation)) * P(T)

Hyperparameters:
- Prior Mastery P(L_0) = 0.10
- Transition Rate P(T) = 0.15
- Guess Probability P(G) = 0.20
- Slip Probability P(S) = 0.10

### 3.2 Ebbinghaus Forgetting Curve & Spaced Repetition (FSRS)
Memory retention R(t) decays exponentially: R(t) = exp(-t / S)
When a revision is reviewed:
- Rating Easy: S_new = S * 2.4
- Rating Good: S_new = S * 1.8
- Rating Hard: S_new = S * 1.2
- Rating Again (Forgot): S_new = max(1.0, S * 0.5)
- Next Review Date = Now + S_new days

### 3.3 Semantic Vector Search & Cosine Similarity
Extracts semantic chunks from study materials and matches them using cosine similarity:
Similarity(A, B) = (A . B) / (||A||_2 * ||B||_2)

### 3.4 Skill Overlap & Job Matching Algorithm
Calculates percentage alignment between student competencies and employer requirements:
Match Score = min(100, round((|Student Competencies intersect Required Skills| / |Required Skills|) * 100))

---

## 4. SUBSYSTEMS & FEATURE BREAKDOWN

### 4.1 Personalized Study Overview & Profile Customizer
- Header & Metric Cards: Displays streak days, target exam countdown, active resources, and average diagnostic mastery.
- Quick Profile Edit Modal: Space-efficient pen icon (Edit3) next to the student name opens a popup modal allowing instant editing of:
  - Full Name
  - Primary Study Goal
  - Education Tier (Class 10, Class 12, Undergraduate B.Tech, GATE, Competitive Exams)
  - Board / University
  - Daily Target Study Hours
  - Days Remaining to Target Exam

### 4.2 Multimodal Study Material & OCR Studio
- File Upload Support: PDFs, textbook scans, classroom notes images (PNG, JPG, WebP), and raw text.
- OCR Engine: Extracts structured text and LaTeX formulas from images using Tesseract and AI vision fallbacks.
- Semantic Chunking: Breaks large documents into coherent sections retaining page numbers, section headers, and formula metadata.
- Study Folders: Organizes materials into custom hierarchical subject folders.

### 4.3 Dynamic Concept Dependency Knowledge Graph
- Graph Construction: Auto-extracts key concepts, parent prerequisites, and child topics from uploaded materials or selected curricula.
- Interactive Visualization: Highlights mastery states (Mastered >= 80%, In Progress 50-79%, At Risk < 50%).
- Prerequisite Enforcement: Identifies blocker concepts that must be mastered before advancing to higher-order topics.

### 4.4 Adaptive Diagnostic Assessment Engine (Bloom's Taxonomy)
- Question Generation: Formulates multiple-choice questions categorized by cognitive complexity (Remember, Understand, Apply, Analyze, Evaluate).
- Instant BKT State Update: Every submitted answer dynamically recalculates concept mastery in real time.
- Explanatory Feedback: Provides mathematical steps, common misconceptions, and citation links back to source notes.

### 4.5 Ebbinghaus Spaced Repetition Station (Dual-Track)
- Track 1 (Field of Study Curriculum): Core theoretical concepts mapped to academic standards.
- Track 2 (Uploaded Study Material): Custom flashcards and revision items synthesized directly from student lecture notes.
- Review Modes: Active recall testing with 4 rating buttons (Again, Hard, Good, Easy). Stability days adjust automatically without infinite review loops.

### 4.6 Open Source & NPTEL Swayam (IIT/IISc) Course Catalog
- Curated Open Source Tracks: Filterable by AI & Machine Learning, General CS, Electrical/Electronics, and Mechanical Engineering.
- NPTEL & Swayam Integration: Direct enrollment links to official IIT Madras, IIT Kharagpur, IIT Bombay, and IISc Bangalore courses on Swayam.
- Credit Transfer Ready: Marked with standard 4-week, 8-week, and 12-week academic credit transfer weights.
- Personalized AI Course Generator: Synthesizes custom self-paced roadmaps with structured modules and lesson completion checkboxes.

### 4.7 Career Readiness Radar & 40+ Industry Benchmarks
- Comprehensive Rubrics: 40+ hiring rubrics across:
  - Big Tech & Platforms: Google, Meta, Apple, Amazon, Microsoft, Netflix, Uber, ByteDance, Airbnb, Spotify.
  - Fintech & Quant HFT: Jane Street, Citadel, Jump Trading, Tower Research, Two Sigma, HRT, DE Shaw.
  - AI Research & LLMs: OpenAI, Anthropic, DeepMind, NVIDIA, Cohere, Scale AI.
  - Cloud, Infra & DevOps: Snowflake, Databricks, Stripe, Cloudflare, HashiCorp.
  - Autonomous & Hardware: Tesla Autopilot, Waymo, Qualcomm, AMD, Intel.
  - Cybersecurity: CrowdStrike, Palo Alto Networks, Cloudflare Security.
- Domain Breakdown: Weighted criteria, required topics, interview tips, and BKT mastery gap analysis.

### 4.8 LinkedIn Real-Time Job Matcher & Application Pipeline
- Live Scraping & Extraction: Real-time extraction of live tech job openings with automated fallback to verified enterprise roles.
- Overlap Scoring: Direct comparison between job requirements and student BKT knowledge states.
- Application Tracker: Pipeline management tracking Applied, Interviewing, Offer, and Archived states with direct links to live LinkedIn job applications.

### 4.9 Zero-Hallucination ATS Resume & Cover Letter Studio
- Candidate Specifics First: Clean input form for real candidate specifics:
  - Contact: Real Phone, LinkedIn URL, GitHub URL, Portfolio, Location.
  - Education: Real Degree, College / University, Graduation Year, CGPA.
  - Skills: Candidate's explicit skill list + verified BKT mastery concepts.
  - Projects: Title, Tech Stack, and STAR (Situation, Task, Action, Result) description.
- Zero AI Fabrication Guarantee: AI prompt and backend post-processing strictly forbid the creation of fake phone numbers, fake companies, or unmentioned skills. If omitted, fields remain clean and empty.
- Print & Plaintext Ready: Single-column ATS-compliant printable formatting (Ctrl+P / Save as PDF) and single-click clipboard copy.
- Tailored Cover Letter: Generates targeted 3-paragraph engineering cover letters highlighting real student strengths.

### 4.10 Well-being & Burnout Shield
- Check-In Modal: Quick diagnostic recording emotional state, stress level (1-10), and sleep hours.
- Burnout Risk Evaluation: Automatically triggers pacing advice and recommends schedule adjustments when high fatigue is detected.
- Neurobiology Resets: Guided physiological protocols (Physiological Sigh, Box Breathing, 20-20-20 Rule).
- Verified Helplines: Pre-configured emergency support lines for immediate mental health assistance.

### 4.11 Circadian Study Planner & Calendar
- Dynamic Daily Allocation: Balances available study hours across high-priority concepts, due revisions, and assessment diagnostic milestones.
- Interactive Calendar: Weekly and monthly views displaying scheduled sessions and target completion indicators.

---

## 5. DATABASE MODELS & ENTITY-RELATIONSHIP SCHEMA

Tables & Relational Schema:
1. users: id (UUID), email, hashed_password, role, field_of_study, mastery_score, is_active, created_at.
2. profiles: id, user_id (FK), name, education_tier, board_or_university, goal, target_year, daily_available_hours, days_to_exam, dark_mode, streak_days, last_studied_at.
3. concepts: id, name, topic, difficulty, description, field_of_study.
4. concept_dependencies: id, concept_id (FK), prerequisite_concept_id (FK), strength.
5. knowledge_states: id, user_id (FK), concept_id (FK), p_l (mastery float 0.0-1.0), total_attempts, correct_attempts, last_tested_at.
6. resources: id, user_id (FK), title, file_type, file_path, content_text, folder_id, created_at.
7. study_folders: id, user_id (FK), name, color, created_at.
8. assessments: id, user_id (FK), title, score, total_questions, created_at.
9. assessment_questions: id, assessment_id (FK), concept_id (FK), question_text, options (JSON), correct_answer, explanation, bloom_level.
10. assessment_responses: id, user_id (FK), question_id (FK), selected_option, is_correct, time_taken_seconds.
11. revision_items: id, user_id (FK), concept_id (FK), resource_id (FK), front_text, back_text, revision_type, stability_days, half_life_days, repetitions, next_review_at, last_reviewed_at.
12. courses: id, user_id (FK), title, description, field_of_study, source_platform, external_url, is_custom, progress_percent.
13. lessons: id, course_id (FK), title, module_name, duration_minutes, is_completed, order_index.
14. wellbeing_checkins: id, user_id (FK), state, stress_level, sleep_hours, burnout_risk, created_at.
15. study_plans: id, user_id (FK), title, schedule_json (JSON), is_active, created_at.

---

## 6. COMPLETE REST API CATALOG

All endpoints are mounted under prefix /api/v1 and protected via OAuth2 Bearer JWT tokens.

### 6.1 Authentication & Profile
- POST /auth/register - Register a new student account.
- POST /auth/login - Login and receive JWT access token.
- GET /auth/me - Retrieve current authenticated student profile.
- GET /users/dashboard - Fetch dashboard metrics, priorities, and study counters.
- PATCH /users/profile - Update student name, goal, education tier, daily target hours, and days to exam.

### 6.2 Knowledge Graph & BKT
- GET /knowledge/graph - Retrieve full concept graph with nodes, edges, and user mastery levels.
- GET /knowledge/concepts/{id} - Fetch details and prerequisites for a specific concept.
- GET /knowledge/states - List all BKT evaluated mastery probabilities for the current user.

### 6.3 Diagnostic Assessments
- POST /assessments/generate - Formulate an adaptive assessment from selected concepts or uploaded notes.
- GET /assessments/{id} - Fetch assessment questions and options.
- POST /assessments/{id}/answer - Submit an answer, receive explanatory feedback, and trigger BKT state updates.
- GET /assessments/history - List past completed assessments and performance trends.

### 6.4 Spaced Repetition (Ebbinghaus)
- GET /revision/due - List revision items currently due for review.
- GET /revision/items - Retrieve full flashcard inventory (filter by revision_type).
- GET /revision/decay-alerts - List concepts at risk of memory decay.
- POST /revision/generate - Synthesize new flashcards from concepts or notes.
- POST /revision/{id}/review - Submit recall score (Again, Hard, Good, Easy) and advance next review date.

### 6.5 Study Materials & OCR
- POST /resources/upload - Upload PDF/image file for OCR and semantic chunking.
- GET /resources - List uploaded study documents.
- GET /resources/{id} - Fetch extracted text, sections, and formulas.
- DELETE /resources/{id} - Delete a study resource.
- GET /resources/folders - List student study folders.
- POST /resources/folders - Create a new study folder.

### 6.6 Courses (Curated & NPTEL)
- GET /courses/open-source - Fetch curated IIT/IISc Swayam NPTEL and open-source tracks.
- POST /courses/open-source/sync - Synchronize catalog for a given field of study.
- GET /courses/personalized - Fetch student's custom AI-generated courses.
- POST /courses/personalized/generate - Generate a personalized course roadmap.
- GET /courses/{id} - Fetch course modules and lessons.
- PATCH /courses/{id}/lessons/{lesson_id}/toggle - Toggle lesson completion status.
- DELETE /courses/{id} - Delete a custom course.

### 6.7 Career Readiness & ATS Resume
- GET /career/tracks - Fetch 40+ industry hiring rubrics and interview criteria.
- GET /career/readiness/{track_id} - Evaluate student BKT mastery against industry requirements.
- GET /career/jobs - Fetch live-matched LinkedIn tech jobs with skill overlap percentages.
- POST /career/resume/generate - Synthesize zero-hallucination ATS resume from candidate specifics.
- POST /career/cover-letter/generate - Formulate targeted engineering cover letter.
- GET /career/applications - List tracked job applications in the pipeline.
- POST /career/applications - Add job application to pipeline (Applied, Interviewing, Offer).
- PATCH /career/applications/{app_id} - Update application status or notes.

### 6.8 Well-being Shield
- POST /wellbeing/checkin - Submit emotional state, stress level, and sleep hours.
- GET /wellbeing/status - Get burnout risk analysis and recommended pacing mode.
- GET /wellbeing/emergency-resources - Retrieve verified helplines and guided neurobiology resets.

### 6.9 Circadian Study Planner
- GET /study-plan/current - Retrieve active circadian study schedule.
- POST /study-plan/generate - Generate optimized daily schedule based on available hours.

---

## 7. AI MULTI-PROVIDER ARCHITECTURE (OPENCLAW OMNIROUTE)

OpenClaw OmniRoute ensures 99.9% AI uptime by routing tasks across providers with automated failover:
- Google Gemini 2.5 Pro / Flash: Primary for OCR document vision, broad syllabus parsing, and fast conversational guidance.
- DeepSeek V3 / R1: Primary for mathematical derivations, coding problem decomposition, and algorithmic proofs.
- Groq LLaMA 3.3 70B: Primary for ultra-low latency real-time flashcard feedback and fast search summarization.
- Local Ollama / Deterministic Fallbacks: Handles offline execution or emergency API outage fallback.

Model Roles:
- ASSESSMENT_GENERATION: Formulates rigorous multiple-choice questions matching Bloom's taxonomy.
- RESOURCE_SYNTHESIS: Extracts LaTeX formulas and key topics from OCR text.
- CAREER_EVALUATION: Assesses industry track readiness and matches skills against job specs.
- RESUME_SYNTHESIS: Formats candidate real specifics into ATS STAR bullet points with zero hallucination.
- WELLBEING_PACING: Evaluates emotional strain and suggests cognitive pacing.

---

## 8. FRONTEND VIEW HIERARCHY & STATE MANAGEMENT

Frontend modular architecture located in frontend/src/components/views/:
1. DashboardView.tsx: Study overview, streak tracking, recent notes, quick profile edit popup modal.
2. StudyView.tsx: PDF/Notes upload studio, OCR text inspector, folder management.
3. KnowledgeView.tsx: Interactive concept graph with BKT mastery coloring and prerequisite badges.
4. AssessmentView.tsx: Diagnostic test engine, Bloom's level filtering, animated BKT mastery progress bars.
5. RevisionView.tsx: Ebbinghaus Spaced Repetition flashcards with 4-point rating controls.
6. CourseView.tsx: Open source course catalog, NPTEL IIT/IISc Swayam courses, AI course builder.
7. CareerView.tsx: 40+ industry tracks, LinkedIn live job matcher, candidate specifics customizer, printable ATS resume studio.
8. WellbeingView.tsx: Stress check-in modal, burnout shield, neurobiology breathing resets, emergency helplines.
9. ScheduleView.tsx: Circadian calendar, daily study hour allocator, Pomodoro study timers.

---

## 9. TEST SUITE & QUALITY ASSURANCE VERIFICATION

Automated Test Coverage (backend/tests/test_backend.py):
- test_bkt_update_correct(): Verifies P(L) increases correctly on positive observation.
- test_bkt_update_incorrect(): Verifies P(L) decreases correctly on error without dropping below floor.
- test_ebbinghaus_fsrs_decay(): Validates retention calculation and interval expansion.
- test_semantic_chunking_metadata(): Validates document chunking and formula preservation.
- test_security_auth(): Verifies bcrypt password hashing and JWT token generation/decoding.
- test_nptel_courses_curation(): Validates authentic Swayam/NPTEL IIT/IISc courses.
- test_tech_job_matching_and_career_tracks(): Checks 40+ industry tracks and LinkedIn URL schemes.
- test_resume_schema_and_zero_fake_data(): Confirms candidate specifics data integrity and zero AI hallucinations.
- test_ocr_vision_fallback(): Validates OCR text extraction pipelines.
- test_openclaw_omniroute_resilience(): Validates multi-provider failover routing.

Status: 21/21 passed (100%) | TypeScript Build: npx tsc --noEmit -> 0 errors.

---

## 10. ENVIRONMENT VARIABLES & CONFIGURATION

Sample .env configuration:
`ini
# Application Core
APP_NAME=MentorMate
ENVIRONMENT=development
PORT=8000
FRONTEND_PORT=3000
SECRET_KEY=mentormate-production-secure-key-2026

# Database
DATABASE_URL=sqlite+aiosqlite:///./mentormate.db
# DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/mentormate

# AI Providers (At least one required)
GEMINI_API_KEY=your_gemini_api_key_here
DEEPSEEK_API_KEY=your_deepseek_api_key_here
GROQ_API_KEY=your_groq_api_key_here
OLLAMA_BASE_URL=http://localhost:11434

# OCR Engine
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
`

---

## 11. HOW TO RUN LOCALLY & LIVE DEPLOYMENT

Quick Start (Single Click on Windows):
Run start_mentormate.bat from the root folder:
`atch
start_mentormate.bat
`
This automatically initializes the Python virtual environment, launches the FastAPI backend on port 8000, and starts the Next.js dev server on port 3000.

Manual Startup:
Backend (Terminal 1):
`powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
`

Frontend (Terminal 2):
`powershell
cd frontend
npm install
npm run dev
`
Open browser at http://localhost:3000.

---

## 12. RECOMMENDED NEXT STEPS FOR PRITESH

The core system is fully operational, verified, and pushed to GitHub main. Below are strategic next steps for Pritesh and the team to review:

1. Cloud PostgreSQL & Redis Migration:
   - Transition from local SQLite to AWS RDS / Supabase PostgreSQL.
   - Introduce Redis for distributed Celery background tasks and OCR caching.
2. Native PDF Export with Typst / Weasyprint:
   - Add direct server-side PDF compilation for the ATS Resume studio alongside browser printing.
3. Live LinkedIn OAuth Integration:
   - Add direct one-click 1-Hop Easy Apply through official LinkedIn Partner APIs.
4. Mobile Native App (React Native / Expo):
   - Package the Next.js frontend into native Android/iOS builds for mobile notifications and revision flashcards on the go.
5. Institutional Multi-Tenant Dashboard:
   - Build a Teacher / Mentor portal allowing university professors to track batch-wide BKT mastery curves and assign tailored remedial problem sets.

---
End of Master Handover Document. All repositories, test suites, and documentation are synced and ready for immediate deployment.
