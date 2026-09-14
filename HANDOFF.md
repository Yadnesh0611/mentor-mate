# Mentor Mate — SIH Internal Round 2 Handoff Document

This document summarizes the current technical implementation status of the Mentor Mate platform as prepared for SIH Internal Round 2 evaluation and deployment handoff.

---

## 1. Currently Implemented Features

### Academic Architecture & Backend
- **Full Async FastAPI Application**: Multi-router design under `/api/v1` (`auth`, `resources`, `resource_ai`, `mentor`, `assessments`, `revision`, `knowledge`, `dashboard`, `health`).
- **Persistence Layer**: Async SQLAlchemy models for `User`, `Profile`, `Resource`, `ResourceChunk`, `Concept`, `KnowledgeState`, `Assessment`, `AssessmentItem`, `AssessmentResponse`, `RevisionItem`, and `StudyPlan`.
- **Authentication**: JWT token issuance with password hashing and authentication dependency guards on protected endpoints.
- **Resource Processing & Vector Engine**: File upload endpoint (`/resources/upload`), multi-format ingestion (PDF, DOCX, PPTX, TXT, Markdown, PNG, JPG, JPEG, WEBP, BMP), deterministic sliding-window chunking, and local cosine-similarity vector retrieval.
- **Native Multi-Tier OCR Pipeline**: Real optical character recognition on scanned PDFs (via high-DPI PyMuPDF rasterization) and standalone images (PNG/JPG/WEBP) using native Windows Media OCR (`winocr`) and cross-platform Tesseract fallback, with automatic contrast and resolution preprocessing.
- **Student Resource AI**: Grounded RAG agent with strict citation tracking and refusal on ungrounded concepts (*"I couldn't find enough support for that answer in your uploaded resources."*).
- **Ask Mentor**: Socratic pedagogical tutor agent with LaTeX math support.
- **Bayesian Knowledge Tracing (BKT)**: Standard 4-parameter BKT engine updating latent mastery probability $P(L)$ upon every response.
- **Item Response Theory (IRT)**: 2-Parameter Logistic (2PL) maximum a posteriori (MAP) estimation for latent ability $\theta$.
- **Spaced Revision**: Exponential memory half-life model $R(t) = 2^{-t / H}$ with heuristic stability updating and due item queue calculation.
- **Study Planner**: Adaptive multi-day study schedule generator persisted in database `study_plans` table.
- **Knowledge Analytics**: Gap analysis identifying weak concepts ($P(L) < 0.60$), strong concepts ($P(L) \ge 0.85$), and decay indicators.
- **Security**: Cross-user resource isolation enforced at the database query layer; unauthorized access raises `SecurityViolationError` (HTTP 403).
- **Graceful Degradation**: Outages on OmniRoute or OpenClaw fail gracefully with HTTP 503 Service Unavailable without faking AI output.

### Frontend Application
- **Next.js 16 (App Router)**: Modern single-page interactive workspace built with Tailwind CSS.
- **Type-Safe API Client**: [`frontend/src/lib/api.ts`](file:///C:/Users/yadne/OneDrive/Desktop/SIH/frontend/src/lib/api.ts) mapping all backend endpoints.
- **Interactive Views**:
  - Landing page with authentic scientific concept visualizers.
  - Authentication modal (register/login with real JWT storage).
  - Student Dashboard with live metrics, priority focus items, and recent assessments.
  - Ingestion Workspace with file dropzone, upload progress, and chunk explorer.
  - Student Resource AI Chat with citation badges and document references.
  - Ask Mentor Socratic Chat with math typesetting.
  - Adaptive Diagnostic Assessment interface with instant BKT state feedback.
  - Spaced Revision Queue with exponential retention simulator and active recall challenges.
  - Knowledge Model / Concept Mastery Matrix.

### AI Infrastructure Integration
- **OmniRoute AI Gateway (port 20128)**: Centralized routing layer with 480 discovered models, role-based ladders (`FAST_CHAT`, `DEEP_REASONING`, `RESOURCE_SYNTHESIS`, `MENTOR`, `ASSESSMENT_GENERATION`), and telemetry logging.
- **OpenClaw Agent Orchestrator (port 18789)**: 6 autonomous workflows backed by 12 security-isolated database application tools.

---

## 2. Test & Build Status

| Verification Stage | Status | Details |
|---|---|---|
| **Backend Unit & Math Tests** | **PASSED** (6/6) | BKT math, IRT 2PL, exponential half-life, embeddings, semantic chunking, auth |
| **Real OCR Pipeline Tests** | **PASSED** (4/4) | Scanned PDF OCR, image OCR, digital PDF passthrough, image preprocessing |
| **OpenClaw & OmniRoute Tests** | **PASSED** (8/8) | Dynamic discovery, chat completions, agent workflows, security isolation |
| **Total Automated Tests** | **PASSED** (18/18, 100%) | `python -m pytest tests/test_backend.py tests/test_ocr.py tests/test_openclaw_omniroute.py` |
| **Live End-to-End Verification** | **PASSED** (12/12) | 12 full student flows verified against live FastAPI, OmniRoute, and OpenClaw |
| **Frontend Production Build** | **PASSED** (Exit 0) | `npm run build` compiled cleanly via Turbopack |
| **Credential Audit** | **CLEAN** | All hardcoded tokens removed from codebase; `.env.example` created |

---

## 3. Configuration Requirements for Incoming Team / Colleague

1. **Environment Variables**:
   Copy `.env.example` to `.env` in the project root and provide:
   - `OMNIROUTE_API_KEY`: The API key configured in your local OmniRoute instance (`~/.omniroute/.env`).
   - `OPENCLAW_TOKEN`: The gateway token configured in your local OpenClaw instance (`~/.openclaw/openclaw.json`).
   - `SECRET_KEY`: A 64-character secret key for JWT encryption.

2. **Starting Local Gateway Daemons**:
   ```bash
   omniroute serve --port 20128 --no-open
   openclaw gateway run --port 18789 --force
   ```

3. **Starting Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```

4. **Starting Frontend**:
   ```bash
   cd frontend
   npm install
   npm run build
   npm run start -- -p 3000
   ```
