# 🤖 ANTIGRAVITY AGENT SETUP & EXECUTION MANUAL
### Mentor Mate — Academic Learning Platform (SIH Internal Round 2)

> **ATTENTION AGENT / DEVELOPER READING THIS FILE:**  
> You are an agentic AI coding assistant (Antigravity / Cursor / Claude / ChatGPT) or developer pair-programming on this device.  
> Your objective is to inspect this machine's environment, install any missing dependencies, configure the services, verify the mathematics and OCR, and launch the **complete, fully functioning Mentor Mate platform**.  
> **Do NOT mockup or fake any functionality.** Mentor Mate contains genuine Bayesian Knowledge Tracing, 2PL Item Response Theory, an Exponential Half-Life Retention model, a multi-tier OCR pipeline, and autonomous agent orchestration. Follow this guide systematically.

---

## 📋 System Architecture Overview

Mentor Mate is structured as a full-stack production-grade academic digital twin:
* **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS v4, Lucide Icons, KaTeX math rendering. Running on `http://localhost:3000`.
* **Backend**: FastAPI (Python 3.10+), SQLAlchemy 2.0 Async, aiosqlite / SQLite (zero-config local DB) or PostgreSQL ready. Running on `http://127.0.0.1:8000`.
* **OCR Layer**: Multi-tier Document Extractor:
  * Tier 1: Windows Native Media OCR (`winocr`) isolated in a dedicated thread-pool executor.
  * Tier 2: `pytesseract` fallback.
  * PDF Handler: `pymupdf` (fitz) rendering scanned pages at 150 DPI for OCR.
* **AI Orchestration**:
  * Gateway: OmniRoute on port `20128` (or direct provider fallback via `OPENAI_API_KEY`).
  * Agent Layer: OpenClaw on port `18789`.

---

## 🔍 Phase 1: Pre-Flight Diagnostic Checklist

Run these diagnostic commands first to check what this device already has installed:

```powershell
# 1. Check Python version (Must be 3.10 or higher)
python --version

# 2. Check Node.js and npm (Node.js 18+ recommended)
node -v
npm -v

# 3. Check port availability (3000, 8000, 20128, 18789)
powershell -Command "Get-NetTCPConnection -LocalPort 3000, 8000, 20128, 18789 -ErrorAction SilentlyContinue | Select-Object LocalPort, State, OwningProcess"
```

---

## 📦 Phase 2: Dependency Installation

### 1. Backend Dependencies (Python)
Navigate to the `backend/` directory and install all required packages:

```powershell
cd backend

# Optional but recommended: create and activate a virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install core packages, async database drivers, OCR libraries, and scientific math
pip install -r requirements.txt
```

*Key packages included in `requirements.txt`:*
* `fastapi`, `uvicorn[standard]`, `pydantic`, `pydantic-settings`
* `sqlalchemy>=2.0.0`, `aiosqlite>=0.20.0`, `asyncpg>=0.29.0`
* `winocr>=0.0.15`, `pymupdf>=1.24.0`, `pillow>=10.0.0`, `pytesseract>=0.3.10`
* `numpy>=1.26.0`, `scipy>=1.12.0` (for 2PL IRT MAP estimation)
* `httpx>=0.27.0`, `python-jose[cryptography]`, `passlib[bcrypt]`, `pytest`, `anyio`

### 2. Frontend Dependencies (Node.js / Next.js)
Navigate to the `frontend/` directory and install npm packages:

```powershell
cd ../frontend
npm install
```

---

## ⚙️ Phase 3: Environment Configuration (.env Setup)

Make sure the environment files are present. A template `.env.example` is provided in the project root.

### 1. Root `.env` (Create or verify in project root):
```env
SECRET_KEY=mentor-mate-sih-2026-local-jwt-secret-key-32charsmin
DATABASE_URL=sqlite+aiosqlite:///backend/mentormate.db

# --- REAL LLM INFERENCE (Active & Pre-Configured) ---
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# --- OPTIONAL OMNIROUTE / OPENCLAW GATEWAY ---
OMNIROUTE_BASE_URL=http://localhost:20128/v1
OMNIROUTE_API_KEY=
OMNIROUTE_DEFAULT_MODEL=auto/fast
OMNIROUTE_REASONING_MODEL=auto/chat
OMNIROUTE_VISION_MODEL=auto/best-vision

OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
OPENCLAW_TOKEN=

# Optional OpenAI fallback
OPENAI_API_KEY=

NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
PORT=3000
```

### 2. Backend `.env` (Inside `backend/.env`):
Matches the above backend settings with the active `GEMINI_API_KEY`.

### 3. Frontend `.env.local` (Inside `frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1
PORT=3000
```

---

## 🌐 Phase 4: AI Inference & Gateway

Mentor Mate features fully dynamic, real LLM integration with automatic zero-lag fallback:

### Primary: Google Gemini Flash (Pre-Configured & Recommended)
- The active API key is already configured in `.env`.
- It uses `gemini-3.6-flash` providing ultra-fast (~1s) intelligent responses, authentic LaTeX math rendering, Socratic tutoring, personalized courses, and multimodal OCR vision.

### Alternative: Local OmniRoute + OpenClaw Gateway
If you have `omniroute` installed:
```powershell
omniroute serve --port 20128 --no-open
```

### Alternative: OpenAI Direct Fallback
Set `OPENAI_API_KEY=sk-...` in `backend/.env`.


---

## 🧪 Phase 5: Automated Test Suite Verification

Before launching the servers, verify the integrity of the math, OCR, and security layers:

```powershell
cd backend
python -m pytest tests -v
```

### Expected Output:
```text
tests/test_backend.py::test_bkt_mathematics PASSED                       [  5%]
tests/test_backend.py::test_irt_2pl_formulation PASSED                   [ 11%]
tests/test_backend.py::test_ebbinghaus_retention_decay PASSED            [ 16%]
tests/test_backend.py::test_embedding_cosine_similarity PASSED           [ 22%]
tests/test_backend.py::test_semantic_chunking_metadata PASSED            [ 27%]
tests/test_backend.py::test_security_auth PASSED                         [ 33%]
tests/test_ocr.py::test_ocr_on_standalone_image PASSED                   [ 38%]
tests/test_ocr.py::test_ocr_on_scanned_pdf PASSED                        [ 44%]
tests/test_ocr.py::test_digital_pdf_fallback_and_passthrough PASSED      [ 50%]
tests/test_ocr.py::test_image_preprocessing PASSED                       [ 55%]
tests/test_openclaw_omniroute.py::test_omniroute_connectivity_and_models PASSED [ 61%]
tests/test_openclaw_omniroute.py::test_omniroute_live_chat_generation PASSED    [ 66%]
tests/test_openclaw_omniroute.py::test_openclaw_gateway_health PASSED            [ 72%]
tests/test_openclaw_omniroute.py::test_cross_user_isolation_security PASSED     [ 77%]
tests/test_openclaw_omniroute.py::test_resource_ai_grounding_and_refusal PASSED [ 83%]
tests/test_openclaw_omniroute.py::test_study_planner_persists_plan PASSED        [ 88%]
tests/test_openclaw_omniroute.py::test_revision_agent_and_retention_mathematics PASSED [ 94%]
tests/test_openclaw_omniroute.py::test_knowledge_analysis_agent PASSED           [100%]

================== 18 passed in ~10-60s (100% Pass Rate) ===================
```

---

## 🚀 Phase 6: Starting the Live Platform

Launch both servers in separate terminal tabs:

### Terminal 1 — Backend (FastAPI)
```powershell
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
* Backend starts at `http://127.0.0.1:8000`.
* Interactive API Documentation (Swagger) is live at `http://127.0.0.1:8000/docs`.
* Database tables auto-initialize in `backend/mentormate.db`.

### Terminal 2 — Frontend (Next.js)
```powershell
cd frontend
npm run dev
# OR for production build:
# npm run build
# npm run start -- -p 3000
```
* Open your browser to **`http://localhost:3000`**.

---

## 🛡️ Critical Technical Decisions & Guardrails

When working in this codebase, uphold these strict architectural rules:
1. **Never Fake Math or AI Responses**: Do not replace BKT ($P(L)$ update), 2PL IRT ability ($\theta$), or exponential half-life ($R(t) = 2^{-t/H}$) with random numbers or linear formulas.
2. **OCR Thread Isolation**: Windows Native OCR (`winocr.recognize_pil_sync`) internally invokes `asyncio.run()`. It must always be called inside `ThreadPoolExecutor(max_workers=1)` to avoid `RuntimeError: asyncio.run() cannot be called from a running event loop`.
3. **HTTP Client Generation Timeout**: LLMs generating detailed mathematical and Socratic answers require $30+\text{s}$. The backend `ai_service.py` client timeout is set to `90.0s`. Do not lower it below $60.0\text{s}$.
4. **Strict Grounding Refusal**: `ResourceAgent` MUST refuse queries when uploaded resources lack supporting evidence with the exact phrase:  
   `"I couldn't find enough support for that answer in your uploaded resources."`
5. **Cross-User Security**: `agent_tools.py` validates `user_id` on every query chunk, resource retrieval, and learning event. Never bypass user isolation.

---

## ✅ Phase 7: Verification Run For The Agent

Once running, verify the student journey by executing:
1. Open `http://localhost:3000`.
2. Click **"Enter Student Workspace"** $\to$ Sign up.
3. In **Student Resources**, upload an image or PDF notes file $\to$ verify OCR status reads `ready` with knowledge chunks.
4. In **Resource AI**, ask a question from the notes $\to$ verify answer contains inline citations.
5. In **Ask Mentor**, ask: *"Explain the physical intuition of Lenz's law and energy conservation"* $\to$ verify Socratic dialog and KaTeX LaTeX rendering.
6. In **Diagnostic Assessment**, take an assessment $\to$ verify score and IRT ability $\theta$ are computed.
7. In **Spaced Revision**, check that retention decay follows $R(t) = 2^{-t/H}$.
8. In **Progress**, verify the Knowledge Graph updates.
