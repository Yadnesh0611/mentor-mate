# Mentor Mate — Cognitive Academic Twin & Agentic Learning Platform

Mentor Mate is a production-structured AI academic learning platform developed for the Smart India Hackathon (SIH) Internal Round 2. It integrates real Bayesian knowledge modeling, deterministic psychometric ability estimation, exponential memory half-life spaced repetition, grounded retrieval-augmented generation (RAG), and agentic orchestration powered by OpenClaw and OmniRoute.

---

## Architecture Overview

Mentor Mate separates cognitive inference, pedagogical tutoring, and deterministic psychometrics into clean, auditable layers:

```
                      +-----------------------------+
                      |   Next.js 16 (App Router)   |
                      |   Tailwind CSS, KaTeX, SPA  |
                      +--------------+--------------+
                                     | HTTP / JSON
                                     v
                      +-----------------------------+
                      |   FastAPI Academic Backend  |
                      |   Async SQLAlchemy, JWT     |
                      +-------+--------------+------+
                              |              |
              +---------------+              +----------------+
              v                                               v
+-----------------------------+               +-------------------------------+
|  Deterministic Mathematics  |               |  Central AI Gateway           |
|  - BKT Bayesian Update      |               |  (OmniRoute @ port 20128)     |
|  - IRT 2PL Ability (theta)  |               |  - FAST_CHAT                  |
|  - Exponential Half-Life    |               |  - DEEP_REASONING             |
|    R(t) = 2^(-t / H)        |               |  - RESOURCE_SYNTHESIS         |
+-----------------------------+               |  - MENTOR                     |
                                              |  - Dynamic 480 Model Catalog  |
                                              +---------------+---------------+
                                                              |
                                                              v
                                              +-------------------------------+
                                              |  Agentic Orchestrator         |
                                              |  (OpenClaw @ port 18789)      |
                                              |  - Mentor Agent (Socratic)    |
                                              |  - Resource AI Agent          |
                                              |  - Study Planner Agent        |
                                              |  - Assessment Agent           |
                                              |  - Revision Agent             |
                                              |  - Knowledge Analysis Agent   |
                                              +-------------------------------+
```

---

## Core System Capabilities

### 1. Authentication & Student Profiling
- Real JWT bearer authentication (`HS256`, password hashing with bcrypt/pbkdf2).
- Student onboarding capturing education tier, board/university, target exam year, daily available hours, and streak tracking.

### 2. Document Processing & Ingestion Layer (Real OCR Pipeline)
- Multi-format ingestion: PDF, DOCX, PPTX, TXT, Markdown, PNG, JPG, JPEG, WEBP, BMP.
- **Native Multi-Tier OCR Engine**:
  - High-resolution (150 DPI) rasterization via PyMuPDF for scanned and handwritten PDFs.
  - Native Windows Media OCR integration for lightning-fast (<40ms), offline, high-accuracy text and formula extraction.
  - Cross-platform Tesseract fallback pipeline.
  - Automatic contrast enhancement and resolution scaling for low-quality photos and chalkboard scans.
- Deterministic semantic sliding window chunking preserving document lineage, page/slide metadata, and section boundaries.
- Local vector indexing with cosine-similarity chunk retrieval.

### 3. Student Resource AI (Grounded RAG)
- Strict grounded knowledge synthesis over student-uploaded resources.
- Retrieves top-k evidence chunks with relevance scores.
- **Strict Academic Refusal**: When query evidence is not supported in the student's materials, the agent refuses to extrapolate, returning:
  > *"I couldn't find enough support for that answer in your uploaded resources."*

### 4. Ask Mentor (Socratic AI Tutor)
- Pure pedagogical tutor persona completely decoupled from document chunk retrieval.
- Uses Socratic questioning, scaffolding, step-by-step conceptual guidance, and LaTeX typesetting.

### 5. Adaptive Assessment & Knowledge Modeling
- **Bayesian Knowledge Tracing (BKT)**:
  - Standard formulation: $P(L_{t+1}) = P(L_t \mid \text{obs}) + (1 - P(L_t \mid \text{obs})) \cdot P(T)$
  - Parameters: $P(L_0) = 0.35$, $P(T) = 0.15$, $P(S) = 0.10$, $P(G) = 0.20$.
- **Item Response Theory (IRT)**:
  - 2-Parameter Logistic (2PL) formulation: $P(\theta) = \frac{1}{1 + e^{-1.7 \cdot a \cdot (\theta - b)}}$
  - MAP estimation for latent ability $\theta \in [-3.0, +3.0]$.

### 6. Spaced Revision (Exponential Half-Life Model)
- Pure exponential half-life retention model:
  $$R(t) = 2^{-t / H}$$
  *(where $t$ is elapsed days and $H$ is memory half-life in days).*
- Stability update heuristic upon recall:
  $$H_{\text{new}} = H_{\text{old}} \cdot (1 + 1.8 \cdot (1 - R))$$

### 7. OpenClaw Autonomous Multi-Agent Orchestration
- 6 active agent workflows: Mentor Agent, Resource Agent, Study Planner Agent, Assessment Agent, Revision Agent, and Knowledge Analysis Agent.
- 12 secure database application tools enforcing strict multi-tenant ownership: attempts to access cross-user resources raise `SecurityViolationError` (HTTP 403).

### 8. OmniRoute AI Gateway
- Central inference gateway managing provider routing, role mapping, model discovery (480 live models), and latency fallback ladders.
- Unhandled outages trigger HTTP 503 Service Unavailable (no fake AI outputs).

---

## How to Run the Platform

### Prerequisites
- Node.js 18+ (Node 20 recommended)
- Python 3.11+ (Python 3.12 verified)
- Git

### Step 1: Clone and Configure Environment
```bash
git clone <repo-url>
cd SIH

# Copy environment template
cp .env.example .env
# Edit .env with your OmniRoute / OpenClaw gateway URLs and keys
```

### Step 2: Start OmniRoute & OpenClaw Gateways
```bash
# Terminal 1: OmniRoute Gateway
omniroute serve --port 20128 --no-open

# Terminal 2: OpenClaw Gateway
openclaw gateway run --port 18789 --force
```

### Step 3: Start Backend (FastAPI)
```bash
cd backend
python -m venv .venv
# Activate venv (.venv\Scripts\activate on Windows or source .venv/bin/activate on Linux/macOS)
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
API documentation available at `http://127.0.0.1:8000/api/v1/docs`.

### Step 4: Start Frontend (Next.js)
```bash
cd frontend
npm install
npm run build
npm run start -- -p 3000
```
Application UI available at `http://localhost:3000`.

---

## Running Test Suites

```bash
cd backend
# Run full automated test suite (14 tests covering BKT, IRT, half-life, auth, and agent integration)
python -m pytest tests/test_backend.py tests/test_openclaw_omniroute.py -v
```

---

## Required Environment Variables

| Variable | Description | Default |
|---|---|---|
| `SECRET_KEY` | JWT signature key | Must set in production |
| `DATABASE_URL` | SQLite / PostgreSQL async connection string | `sqlite+aiosqlite:///./mentormate.db` |
| `OMNIROUTE_BASE_URL` | OmniRoute inference endpoint | `http://localhost:20128/v1` |
| `OMNIROUTE_API_KEY` | Bearer token for OmniRoute gateway | (Configured locally) |
| `OPENCLAW_GATEWAY_URL` | OpenClaw agent WebSocket / HTTP endpoint | `http://127.0.0.1:18789` |
| `OPENCLAW_TOKEN` | Token for OpenClaw gateway | (Configured locally) |
| `NEXT_PUBLIC_API_URL` | Frontend pointer to backend | `http://127.0.0.1:8000/api/v1` |

---

## Known Limitations
- Multi-worker deployments with SQLite should use PostgreSQL via `DATABASE_URL=postgresql+asyncpg://...` to avoid SQLite table lock contention under concurrency.
- If OmniRoute or OpenClaw gateway daemons are stopped, the platform gracefully returns HTTP 503 instead of falling back to hallucinated mock text.
