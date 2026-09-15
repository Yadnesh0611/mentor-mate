import json
import time
import logging
import asyncio
import subprocess
from typing import Dict, Any, List, Optional
import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.ai_service import ai_service, ModelRole, AIServiceUnavailableError
from app.services.agent_tools import agent_tools, SecurityViolationError

logger = logging.getLogger("openclaw_orchestrator")

class OpenClawService:
    """
    OpenClaw Agent Orchestrator for Mentor Mate.
    Coordinates genuine agentic workflows using OpenClaw and OmniRoute:
    - Mentor Agent
    - Resource Agent (Student Resource AI)
    - Study Planner Agent
    - Assessment Agent
    - Revision Agent
    - Knowledge Analysis Agent
    """

    def __init__(self):
        self.gateway_url = settings.OPENCLAW_GATEWAY_URL.rstrip("/")
        self.token = settings.OPENCLAW_TOKEN

    async def check_health(self) -> Dict[str, Any]:
        """Checks OpenClaw gateway reachability and operational readiness."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
                res = await client.get(
                    f"{self.gateway_url}/health",
                    headers=headers
                )
                is_live = res.status_code == 200 and res.json().get("ok") is True
                return {
                    "connected": is_live,
                    "status": "online" if is_live else "offline",
                    "status_code": res.status_code,
                    "gateway_url": self.gateway_url,
                    "response": res.json() if res.status_code == 200 else res.text[:100]
                }
        except Exception as e:
            return {
                "connected": False,
                "status": "offline",
                "error": str(e),
                "gateway_url": self.gateway_url
            }

    async def run_openclaw_cli_turn(self, prompt: str, timeout_sec: int = 15) -> Optional[str]:
        """
        Executes a turn via OpenClaw CLI routed through the Gateway to OmniRoute.
        Returns None if OpenClaw CLI is not responsive so the direct service fallback can proceed.
        """
        start = time.time()
        try:
            cmd = ["openclaw", "agent", "--message", prompt, "--thinking", "off", "--json"]
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=float(timeout_sec))
            latency_ms = round((time.time() - start) * 1000, 1)

            if proc.returncode == 0:
                raw_text = stdout.decode("utf-8", errors="replace").strip()
                # Parse JSON envelope
                for line in raw_text.splitlines():
                    try:
                        data = json.loads(line)
                        payloads = data.get("result", {}).get("payloads", [])
                        if payloads:
                            text = payloads[0].get("text", "")
                            logger.info(f"[OpenClaw Telemetry] run_cli_turn success in {latency_ms}ms")
                            return text
                        visible = data.get("result", {}).get("finalAssistantVisibleText", "")
                        if visible:
                            logger.info(f"[OpenClaw Telemetry] run_cli_turn success in {latency_ms}ms")
                            return visible
                    except Exception:
                        continue
                if raw_text:
                    return raw_text
            else:
                logger.warning(f"[OpenClaw] CLI exited with code {proc.returncode}: {stderr.decode()[:200]}")
        except asyncio.TimeoutError:
            logger.warning(f"[OpenClaw] CLI turn timed out after {timeout_sec}s. Using direct OmniRoute layer.")
        except Exception as e:
            logger.warning(f"[OpenClaw] CLI execution failed: {e}")
        return None

    # =========================================================================
    # 1. MENTOR AGENT (Ask Mentor Socratic Workflow)
    # =========================================================================
    async def run_mentor_agent(
        self,
        user_id: str,
        message: str,
        history: List[Dict[str, str]],
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Flow: Student -> Mentor Agent -> profile/knowledge tools -> OmniRoute (MENTOR) -> Socratic response
        """
        start = time.time()
        profile = await agent_tools.get_student_profile(user_id, db=db)
        knowledge = await agent_tools.get_knowledge_states(user_id, db=db)

        tier = profile.get("education_tier", "Class 10")
        goal = profile.get("goal", "Exam Preparation")
        name = profile.get("name", "Student")

        # Weak concepts summary
        weak = [k["concept_name"] for k in knowledge if k["p_l"] < 0.60][:4]
        weak_str = f"Current focal areas with mastery < 60%: {', '.join(weak)}" if weak else "Foundational concepts solid."

        # Check if student explicitly requests external research
        research_sources = []
        if any(w in message.lower() for w in ["search", "latest", "research", "external", "paper", "current"]):
            web_results = agent_tools.search_web(message)
            research_sources = web_results

        system_prompt = (
            f"You are the friendly, expert Academic Study Mentor for Mentor Mate, tutoring {name} at the {tier} level "
            f"aiming for '{goal}'.\n"
            f"Student Knowledge Context: {weak_str}\n\n"
            "PEDAGOGICAL & FORMATTING DIRECTIVES:\n"
            "1. Socratic & Engaging Tutoring: Directly and clearly address the student's question first with an intuitive explanation, real-world analogy, or clear definition. Then guide them forward by asking an engaging thought question or demonstrating a step-by-step example.\n"
            "2. Conversational & Adaptive Tone: Match the student's communication style. If they ask colloquially ('what is a Saas tool bro?'), respond naturally, warmly, and clearly without robotic boilerplate or rigid templates.\n"
            "3. Mathematical & Formula Typesetting: Format ALL mathematical symbols, numerical values with units, formulas, Greek letters, and equations in standard LaTeX. Use inline math like `$Q_1 = \\frac{n+1}{4}$`, `$E = mc^2$`, `$\\sigma$`, `$x_i$`, and block math for standalone derivations like `$$\\frac{1(n+1)}{4}$$`. Never leave bare LaTeX commands without enclosing dollar signs.\n"
            "4. Clean Structured Markdown: Organize answers logically with proper Markdown headings (###), bullet points (-), and numbered steps (1.). Never output empty bold tokens (****) or stray repeated slashes (////).\n"
            "5. Never output dry generic placeholder templates. Always provide genuine, rich subject matter knowledge tailored to the query."
        )
        if research_sources:
            system_prompt += f"\nRelevant Academic Literature: {json.dumps(research_sources)}"

        logger.info(f"[MentorAgent] Invoking OmniRoute MENTOR role for user='{user_id}'")
        try:
            content = await ai_service.generate_chat(
                messages=history + [{"role": "user", "content": message}],
                system_prompt=system_prompt,
                role=ModelRole.MENTOR,
                agent_name="MentorAgent"
            )
        except AIServiceUnavailableError as e:
            logger.error(f"[MentorAgent] AI gateway unavailable: {e}")
            raise e

        latency_ms = round((time.time() - start) * 1000, 1)
        logger.info(f"[MentorAgent] Completed turn for user='{user_id}' in {latency_ms}ms")
        return {
            "content": content,
            "sources": research_sources,
            "latency_ms": latency_ms
        }

    # =========================================================================
    # 2. RESOURCE AGENT (Student Resource AI Grounded Workflow)
    # =========================================================================
    async def run_resource_agent(
        self,
        user_id: str,
        query: str,
        resource_id: Optional[str],
        history: List[Dict[str, str]],
        db: AsyncSession,
        folder_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Flow: User -> Resource AI Agent -> retrieve_student_resources -> vector search ->
              evidence validation -> OmniRoute (RESOURCE_SYNTHESIS) -> grounded answer -> citations.
        The agent MUST NOT bypass retrieval.
        If evidence is insufficient: returns exact grounded refusal.
        """
        start = time.time()

        # 1. Retrieval
        evidence_chunks = await agent_tools.search_student_resources(
            user_id=user_id,
            query=query,
            top_k=4,
            resource_id=resource_id,
            folder_id=folder_id,
            db=db
        )


        # 2. Evidence Validation
        if not evidence_chunks:
            logger.info(f"[ResourceAgent] Insufficient evidence for query='{query}' under user='{user_id}'")
            return {
                "content": "I couldn't find enough support for that answer in your uploaded resources. If this topic is not in your uploaded notes, please visit the **Study Mentor** tab for open-ended questions and tutoring!",
                "evidence_sufficient": False,
                "citations": [],
                "latency_ms": round((time.time() - start) * 1000, 1)
            }

        # Format retrieved evidence context
        context_parts = []
        citations = []
        for i, c in enumerate(evidence_chunks, start=1):
            context_parts.append(
                f"[Source {i} | {c['document_name']} | Page {c.get('page_number') or 'N/A'} | Section: {c.get('section_title') or 'N/A'}]\n"
                f"{c['content']}"
            )
            citations.append({
                "chunk_id": c["chunk_id"],
                "resource_id": c["resource_id"],
                "document_name": c["document_name"],
                "page_number": c.get("page_number"),
                "section_title": c.get("section_title"),
                "excerpt": c["content"][:240] + "...",
                "relevance_score": c["relevance_score"]
            })

        evidence_text = "\n\n".join(context_parts)

        system_prompt = (
            "You are Mentor Mate's Student Notes & Solutions AI. You provide clear, rigorous, step-by-step solutions "
            "and explanations based SOLELY on the uploaded student resource excerpts provided below.\n\n"
            "STRICT TOPIC & GROUNDING RULES:\n"
            "1. Grounding & Solutions: When a student asks for answers, solutions, or explanations related to their uploaded notes, "
            "provide comprehensive, step-by-step solutions and clarity using the concepts, definitions, formulas, and derivations in the excerpts.\n"
            "2. Strict Refusal on Unsupported Topics: If the topic or question is NOT covered, supported, or mentioned in the uploaded excerpts, "
            "you MUST refuse and state explicitly: \"I couldn't find enough support for that answer in your uploaded resources.\"\n"
            "3. Mathematics & Formula Typesetting: Format ALL equations, formulas, numerical values with units, subscripts, fractions, Greek letters, and variables in standard LaTeX enclosed in $...$ (inline) or $$...$$ (display block). Example: `$Q_1 = \\frac{1(n+1)}{4}$`, `$\\sigma = \\sqrt{\\text{Var}(X)}$`. Never output bare LaTeX commands without enclosing dollar signs.\n"
            "4. Clean Structured Markdown: Organize solutions logically with Markdown headings (###), bullet points (-), and numbered steps (1., 2.). Never output empty bold artifacts (****) or stray slash sequences (////).\n"
            "5. Provide a direct, clean, and helpful response based on the excerpts. Do NOT append raw bracketed tags like '[Source X | ...]'; source metadata is handled separately by the platform.\n\n"
            f"AUTHENTICATED RESOURCE EXCERPTS:\n{evidence_text}"
        )

        logger.info(f"[ResourceAgent] Synthesizing grounded response with {len(citations)} citations")
        try:
            content = await ai_service.generate_chat(
                messages=history + [{"role": "user", "content": query}],
                system_prompt=system_prompt,
                role=ModelRole.RESOURCE_SYNTHESIS,
                agent_name="ResourceAgent",
                tool_name="search_student_resources"
            )
        except AIServiceUnavailableError as e:
            logger.error(f"[ResourceAgent] AI gateway unavailable: {e}")
            raise e

        refusal_phrase = "I couldn't find enough support for that answer in your uploaded resources."
        if "couldn't find enough support" in content.lower() or "not enough support" in content.lower():
            evidence_sufficient = False
            citations = []
            content = refusal_phrase
        else:
            evidence_sufficient = True

        latency_ms = round((time.time() - start) * 1000, 1)
        return {
            "content": content,
            "evidence_sufficient": evidence_sufficient,
            "citations": citations,
            "latency_ms": latency_ms
        }

    # =========================================================================
    # 3. STUDY PLANNER AGENT (Structured & Persisted Workflow)
    # =========================================================================
    async def run_study_planner_agent(
        self,
        user_id: str,
        db: AsyncSession,
        custom_goal: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Flow: Gather profile + knowledge states + assessments + revisions + resources ->
              OmniRoute (DEEP_REASONING) -> structured plan -> create_study_plan (persists in DB).
        """
        start = time.time()
        profile = await agent_tools.get_student_profile(user_id, db=db)
        knowledge = await agent_tools.get_knowledge_states(user_id, db=db)
        assessments = await agent_tools.get_assessment_history(user_id, limit=5, db=db)
        revisions = await agent_tools.get_revision_queue(user_id, db=db)

        # Identify critical gaps
        weak_concepts = [k for k in knowledge if k["p_l"] < 0.60]
        due_revisions = [r for r in revisions if r["is_due"]]

        summary_payload = {
            "profile": profile,
            "goal": custom_goal or profile.get("goal", "Exam Preparation"),
            "total_concepts_tracked": len(knowledge),
            "weak_concepts": [w["concept_name"] for w in weak_concepts[:5]],
            "due_revision_count": len(due_revisions),
            "due_revision_concepts": [d["concept_name"] for d in due_revisions[:5]],
            "recent_assessment_scores": [a["score"] for a in assessments if a["score"] is not None]
        }

        system_prompt = (
            "You are the Mentor Mate Academic Study Planning Agent. Your job is to construct a rigorous, "
            "practical, highly adaptive study schedule based on the student's actual learning analytics.\n"
            "Return valid JSON matching this schema:\n"
            "{\n"
            '  "title": "...",\n'
            '  "goal": "...",\n'
            '  "summary": "...",\n'
            '  "milestones": [\n'
            '    {"day": 1, "focus": "...", "concepts": ["..."], "duration_minutes": 60, "activity": "Deep Concept Review"},\n'
            '    {"day": 2, "focus": "...", "concepts": ["..."], "duration_minutes": 45, "activity": "Spaced Revision & Retrieval"}\n'
            "  ],\n"
            '  "weekly_targets": ["..."],\n'
            '  "revision_slots": ["..."]\n'
            "}\n"
            "Prioritize concepts where mastery P(L) < 60% and items currently due in the spaced revision queue."
        )

        logger.info(f"[StudyPlannerAgent] Generating plan for user='{user_id}' with {len(weak_concepts)} gaps")
        try:
            raw_response = await ai_service.generate_chat(
                messages=[{"role": "user", "content": f"Student Analytics:\n{json.dumps(summary_payload)}"}],
                system_prompt=system_prompt,
                role=ModelRole.DEEP_REASONING,
                agent_name="StudyPlannerAgent",
                temperature=0.2
            )
            # Parse structured output
            plan_json = {}
            for block in raw_response.split("```"):
                clean = block.replace("json", "").strip()
                if clean.startswith("{") and clean.endswith("}"):
                    try:
                        plan_json = json.loads(clean)
                        break
                    except Exception:
                        pass
            if not plan_json:
                try:
                    plan_json = json.loads(raw_response.strip())
                except Exception:
                    plan_json = {
                        "title": f"Adaptive Study Plan for {profile.get('name', 'Student')}",
                        "goal": summary_payload["goal"],
                        "summary": "Focusing on immediate knowledge gaps and spaced revision items.",
                        "milestones": [
                            {"day": 1, "focus": weak_concepts[0]["concept_name"] if weak_concepts else "Core Review", "duration_minutes": 60, "activity": "Concept Deep Dive"},
                            {"day": 2, "focus": "Spaced Retrieval Practice", "duration_minutes": 45, "activity": "Active Recall"}
                        ]
                    }

            # Persist plan in DB (Do NOT discard)
            saved_record = await agent_tools.create_study_plan(
                user_id=user_id,
                plan_data={
                    "title": plan_json.get("title", "Adaptive Study Plan"),
                    "goal": plan_json.get("goal", summary_payload["goal"]),
                    "plan_structure": plan_json
                },
                db=db
            )

            latency_ms = round((time.time() - start) * 1000, 1)
            return {
                "plan_id": saved_record["id"],
                "title": saved_record["title"],
                "goal": saved_record["goal"],
                "plan_structure": plan_json,
                "latency_ms": latency_ms
            }
        except AIServiceUnavailableError as e:
            logger.error(f"[StudyPlannerAgent] AI gateway unavailable: {e}")
            raise e

    # =========================================================================
    # 4. ASSESSMENT AGENT (Resource-Grounded Question Generation)
    # =========================================================================
    async def run_assessment_agent(
        self,
        user_id: str,
        db: AsyncSession,
        concept_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        num_questions: int = 4
    ) -> Dict[str, Any]:
        """
        Flow: knowledge gaps -> retrieve supporting resources -> agent -> OmniRoute ->
              structured questions -> validation -> persistence in Assessment table.
        """
        start = time.time()

        # Find focus concept
        target_concept = None
        if concept_id:
            from app.models.knowledge import Concept
            c_stmt = select(Concept).where(Concept.id == concept_id)
            c_res = await db.execute(c_stmt)
            target_concept = c_res.scalar_one_or_none()

        if not target_concept:
            # Pick lowest mastery concept from student's knowledge states
            k_states = await agent_tools.get_knowledge_states(user_id, db=db)
            if k_states:
                k_states.sort(key=lambda x: x["p_l"])
                from app.models.knowledge import Concept
                c_stmt = select(Concept).where(Concept.id == k_states[0]["concept_id"])
                c_res = await db.execute(c_stmt)
                target_concept = c_res.scalar_one_or_none()

        concept_title = target_concept.name if target_concept else "Academic Mastery"

        # Retrieve resource chunks if student has resources
        supporting_excerpts = []
        if resource_id:
            chunks = await agent_tools.retrieve_resource_chunks(user_id, resource_id, db=db)
            supporting_excerpts = [c["content"] for c in chunks[:3]]
        else:
            chunks = await agent_tools.search_student_resources(user_id, concept_title, top_k=3, db=db)
            supporting_excerpts = [c["content"] for c in chunks]

        resource_context = "\n---\n".join(supporting_excerpts) if supporting_excerpts else "Standard syllabus curriculum."

        system_prompt = (
            "You are the Mentor Mate Assessment Generation Agent. Generate multiple-choice diagnostic questions "
            "designed to assess student latent ability.\n"
            f"Concept Focus: {concept_title}\n"
            f"Resource Material Context: {resource_context}\n\n"
            "RULES:\n"
            "1. Generate exactly 4 options (A, B, C, D) per question with 1 unambiguously correct option.\n"
            "2. Provide rigorous mathematical LaTeX notation in question text and options.\n"
            "3. Ground the questions directly in the supporting resource material if provided.\n"
            "Return valid JSON matching this schema:\n"
            "{\n"
            f'  "title": "Diagnostic Assessment: {concept_title}",\n'
            '  "questions": [\n'
            '    {\n'
            '      "question_text": "...",\n'
            '      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],\n'
            '      "correct_answer": "A",\n'
            '      "explanation": "...",\n'
            '      "difficulty_b": 0.5,\n'
            '      "discrimination_a": 1.2\n'
            '    }\n'
            '  ]\n'
            "}\n"
        )

        logger.info(f"[AssessmentAgent] Generating questions for concept='{concept_title}'")
        try:
            raw = await ai_service.generate_chat(
                messages=[{"role": "user", "content": f"Generate {num_questions} assessment questions for {concept_title}."}],
                system_prompt=system_prompt,
                role=ModelRole.ASSESSMENT_GENERATION,
                agent_name="AssessmentAgent"
            )
            data = {}
            for block in raw.split("```"):
                clean = block.replace("json", "").strip()
                if clean.startswith("{") and clean.endswith("}"):
                    try:
                        data = json.loads(clean)
                        break
                    except Exception:
                        pass
            if not data:
                try:
                    data = json.loads(raw.strip())
                except Exception:
                    data = {"title": f"Diagnostic: {concept_title}", "questions": []}

            questions_list = data.get("questions", [])
            # Format and save via agent tool
            saved = await agent_tools.generate_assessment(
                user_id=user_id,
                params={
                    "title": data.get("title", f"Diagnostic Assessment: {concept_title}"),
                    "items": [
                        {
                            "concept_id": target_concept.id if target_concept else None,
                            "question_text": q.get("question_text", "Question"),
                            "options": q.get("options", ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"]),
                            "correct_answer": q.get("correct_answer", "A"),
                            "explanation": q.get("explanation", ""),
                            "difficulty_b": q.get("difficulty_b", 0.5),
                            "discrimination_a": q.get("discrimination_a", 1.0)
                        }
                        for q in questions_list
                    ]
                },
                db=db
            )
            return {
                "assessment_id": saved["assessment_id"],
                "title": saved["title"],
                "item_count": saved["item_count"],
                "concept": concept_title,
                "latency_ms": round((time.time() - start) * 1000, 1)
            }
        except AIServiceUnavailableError as e:
            logger.error(f"[AssessmentAgent] AI gateway unavailable: {e}")
            raise e

    # =========================================================================
    # 5. REVISION AGENT (Deterministic Spaced Retrieval Engine)
    # =========================================================================
    async def run_revision_agent(
        self,
        user_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Flow: revision due -> retrieve concept/resource -> generate active recall challenge
              through OmniRoute -> student completes -> deterministic BKT update ->
              deterministic half-life model R(t) = 2^(-t/H) -> next revision schedule.
        """
        start = time.time()
        queue = await agent_tools.get_revision_queue(user_id, db=db)
        due_items = [item for item in queue if item["is_due"]]

        if not due_items:
            # If nothing currently due, select item with lowest retention
            queue.sort(key=lambda x: x["retention"])
            due_items = queue[:1] if queue else []

        if not due_items:
            return {
                "has_due_items": False,
                "message": "No revision items currently scheduled.",
                "queue_count": 0
            }

        target = due_items[0]
        concept_name = target["concept_name"]

        # Generate targeted active recall challenge
        prompt = (
            f"Generate a single high-yield active recall challenge question for the concept: '{concept_name}'.\n"
            f"Current retention state: R(t) = {round(target['retention']*100, 1)}%, Half-Life H = {target['half_life_days_h']} days.\n"
            "Prompt the student to recall the core formula, governing law, or fundamental mechanism. Keep it concise."
        )
        try:
            challenge_text = await ai_service.generate_chat(
                messages=[{"role": "user", "content": prompt}],
                system_prompt="You are the Mentor Mate Revision Agent. Formulate clear active-recall challenges.",
                role=ModelRole.FAST_CHAT,
                agent_name="RevisionAgent"
            )
        except AIServiceUnavailableError as e:
            logger.error(f"[RevisionAgent] AI gateway unavailable: {e}")
            raise e

        return {
            "has_due_items": True,
            "target_item": target,
            "challenge_prompt": challenge_text,
            "due_items_count": len(due_items),
            "latency_ms": round((time.time() - start) * 1000, 1)
        }

    # =========================================================================
    # 6. KNOWLEDGE ANALYSIS AGENT (Student Learning State Analysis)
    # =========================================================================
    async def run_knowledge_analysis_agent(
        self,
        user_id: str,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Flow: Analyze real student learning state:
              - weak concepts (P(L) < 0.60)
              - strong concepts (P(L) >= 0.85)
              - recent deterioration (retention decay R(t) <= 0.60)
              - misconception signals
              - revision priorities
              Return explainable recommendations without hallucinating mastery data.
        """
        start = time.time()
        k_states = await agent_tools.get_knowledge_states(user_id, db=db)
        revisions = await agent_tools.get_revision_queue(user_id, db=db)
        profile = await agent_tools.get_student_profile(user_id, db=db)

        if not k_states:
            return {
                "status": "insufficient_data",
                "message": "No knowledge state data recorded yet. Complete diagnostic assessments or revision items to generate analysis."
            }

        weak = [k for k in k_states if k["p_l"] < 0.60]
        strong = [k for k in k_states if k["p_l"] >= 0.85]
        deteriorating = [r for r in revisions if r["retention"] <= 0.60]

        # Misconception signals: total_attempts >= 3 and correct_attempts / total_attempts < 0.35
        misconceptions = [
            k for k in k_states 
            if k["total_attempts"] >= 3 and (k["correct_attempts"] / max(1, k["total_attempts"])) < 0.35
        ]

        summary_data = {
            "student_name": profile.get("name", "Student"),
            "weak_concepts": [{"name": w["concept_name"], "p_l": w["p_l"]} for w in weak],
            "strong_concepts": [{"name": s["concept_name"], "p_l": s["p_l"]} for s in strong],
            "deteriorating_concepts": [{"name": d["concept_name"], "retention": d["retention"], "half_life": d["half_life_days_h"]} for d in deteriorating],
            "misconception_flags": [{"name": m["concept_name"], "attempts": m["total_attempts"], "correct": m["correct_attempts"]} for m in misconceptions]
        }

        system_prompt = (
            "You are the Mentor Mate Knowledge Analysis Agent. Provide an explainable, pedagogical diagnostic "
            "synthesis based strictly on the student's mathematical learning state (Bayesian Knowledge Tracing and "
            "Exponential Half-Life retention decay). Do NOT fabricate data. Offer specific next actions."
        )

        try:
            report_text = await ai_service.generate_chat(
                messages=[{"role": "user", "content": f"Analyze student learning state:\n{json.dumps(summary_data)}"}],
                system_prompt=system_prompt,
                role=ModelRole.DEEP_REASONING,
                agent_name="KnowledgeAnalysisAgent"
            )
        except AIServiceUnavailableError as e:
            logger.error(f"[KnowledgeAnalysisAgent] AI gateway unavailable: {e}")
            raise e

        latency_ms = round((time.time() - start) * 1000, 1)
        return {
            "summary": summary_data,
            "recommendations": report_text,
            "weak_count": len(weak),
            "strong_count": len(strong),
            "deteriorating_count": len(deteriorating),
            "misconceptions_count": len(misconceptions),
            "latency_ms": latency_ms
        }

openclaw_service = OpenClawService()
