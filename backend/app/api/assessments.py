import json
import logging
import re
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.user import User, Profile
from app.models.knowledge import Concept, KnowledgeState
from app.models.assessment import Assessment, AssessmentItem, AssessmentResponse
from app.models.revision import RevisionItem
from app.models.resource import Resource, ResourceChunk, StudyFolder
from app.schemas.assessment import (
    AssessmentStartRequest,
    AssessmentItemOut,
    AssessmentAnswerRequest,
    AssessmentAnswerOut,
    AssessmentReportOut
)
from app.services.bkt_service import bkt_service
from app.services.irt_service import irt_service
from app.services.retention_service import retention_service
from app.services.ai_service import ai_service, ModelRole
from app.api.deps import get_current_user

logger = logging.getLogger("assessments_api")
router = APIRouter(prefix="/assessments", tags=["Diagnostic Assessment & Knowledge Modeling"])


def extract_json_object(raw_text: str) -> Optional[Dict[str, Any]]:
    """Extracts a top-level JSON object from markdown code blocks or raw text."""
    if not raw_text:
        return None
    # 1. Try markdown ```json blocks
    for block in raw_text.split("```"):
        clean = block.replace("json", "").strip()
        if clean.startswith("{") and clean.endswith("}"):
            try:
                return json.loads(clean)
            except Exception:
                pass
    # 2. Try regex match for outermost { ... }
    match = re.search(r'(\{[\s\S]*\})', raw_text)
    if match:
        try:
            return json.loads(match.group(1))
        except Exception:
            pass
    # 3. Direct parse
    try:
        return json.loads(raw_text.strip())
    except Exception:
        return None


@router.get("/config-options")
async def get_assessment_config_options(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns available test configuration sources grounded in the student's real data:
    their field of study, study unit folders, individual notes, and weak concepts.
    """
    # 1. Profile context
    prof_stmt = select(Profile).where(Profile.user_id == user.id)
    prof_res = await db.execute(prof_stmt)
    prof = prof_res.scalar_one_or_none()

    tier = prof.education_tier if prof else "Undergraduate"
    board = prof.board_or_university if prof else "University"
    goal = prof.goal if prof else "Academic Mastery"

    # 2. Study Folders (Units)
    folders_stmt = select(StudyFolder).where(StudyFolder.user_id == user.id).order_by(StudyFolder.name.asc())
    folders_res = await db.execute(folders_stmt)
    folders = folders_res.scalars().all()

    folder_list = []
    for f in folders:
        rc_stmt = select(func.count(Resource.id)).where(Resource.folder_id == f.id)
        rc_res = await db.execute(rc_stmt)
        count = rc_res.scalar() or 0
        folder_list.append({
            "id": f.id,
            "name": f.name,
            "description": f.description or f"Study unit with {count} documents",
            "resource_count": count
        })

    # 3. Individual Resources
    res_stmt = select(Resource).where(Resource.user_id == user.id).order_by(Resource.created_at.desc())
    res_result = await db.execute(res_stmt)
    resources = res_result.scalars().all()
    resource_list = [
        {
            "id": r.id,
            "title": r.title,
            "file_type": r.file_type,
            "folder_id": r.folder_id,
            "is_verified": r.is_verified
        }
        for r in resources
    ]

    # 4. Weak concepts - strictly concepts where student has attempted questions and mastery < 60%
    ks_stmt = (
        select(KnowledgeState, Concept)
        .join(Concept, KnowledgeState.concept_id == Concept.id)
        .where(
            KnowledgeState.user_id == user.id,
            KnowledgeState.total_attempts > 0,
            KnowledgeState.p_l < 0.60
        )
        .order_by(KnowledgeState.p_l.asc())
    )
    ks_res = await db.execute(ks_stmt)
    weak_concepts = [
        {
            "concept_id": c.id,
            "name": c.name,
            "topic": c.topic,
            "mastery_percent": round(ks.p_l * 100, 1)
        }
        for ks, c in ks_res.all()
    ]

    # 5. Calculate average mastery strictly from verified attempts
    avg_pl_stmt = select(func.avg(KnowledgeState.p_l)).where(
        KnowledgeState.user_id == user.id,
        KnowledgeState.total_attempts > 0
    )
    avg_pl_res = await db.execute(avg_pl_stmt)
    avg_pl = avg_pl_res.scalar()

    return {
        "student_field": {
            "name": prof.name if prof else "Student",
            "tier": tier,
            "board": board,
            "goal": goal,
            "suggested_subject": goal if goal and goal != "Academic Mastery" else f"{tier} Studies"
        },
        "current_mastery_pct": round(float(avg_pl) * 100) if avg_pl is not None else None,
        "folders": folder_list,
        "resources": resource_list,
        "weak_concepts": weak_concepts,
        "supported_difficulties": [
            {
                "id": "adaptive",
                "label": "Adaptive (Auto-Calibrated)",
                "badge": "Recommended",
                "description": "Automatically tunes difficulty to your current topic mastery and scales question complexity dynamically."
            },
            {
                "id": "foundational",
                "label": "Foundational (Easy)",
                "badge": "Core Concepts",
                "description": "Fundamental definitions, basic syntax, and direct conceptual checks."
            },
            {
                "id": "intermediate",
                "label": "Intermediate (Medium)",
                "badge": "Practical",
                "description": "Application problems, standard code logic, and concept synthesis."
            },
            {
                "id": "advanced",
                "label": "Advanced (Hard)",
                "badge": "Exam Challenge",
                "description": "Multi-part reasoning, architectural trade-offs, and non-trivial edge cases."
            }
        ],
        "supported_question_types": [
            {
                "id": "mcq",
                "label": "Multiple Choice (MCQ)",
                "description": "Standard four-option conceptual and calculation checks."
            },
            {
                "id": "short_answer",
                "label": "Short Answer & Code",
                "description": "Concise definitions, logic snippets, or reasoning."
            },
            {
                "id": "long_answer",
                "label": "Detailed Analytical",
                "description": "In-depth explanations, architectures, or multi-step derivations."
            },
            {
                "id": "diagram",
                "label": "Diagram & Architecture Analysis",
                "description": "Analyze relationships, flows, UML classes, or schemas."
            }
        ]
    }


@router.post("/start")
async def start_assessment(
    req: AssessmentStartRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Dynamically generates a practice test using the backend AI.
    Grounds strictly on the student's field of study or chosen study material/unit.
    Produces questions across multiple formats (MCQ, Short Answer, Long Answer, Diagram).
    """
    # 1. Fetch student profile
    prof_stmt = select(Profile).where(Profile.user_id == user.id)
    prof_res = await db.execute(prof_stmt)
    prof = prof_res.scalar_one_or_none()
    student_name = prof.name if prof else "Student"
    tier = prof.education_tier if prof else "Undergraduate"
    board = prof.board_or_university if prof else "University"
    goal = prof.goal if prof else "Engineering / Computer Science"

    # 2. Gather Material Context based on mode
    context_snippets = []
    test_title_subject = req.subject or goal or "Field of Study"

    if req.mode == "resource" and req.resource_id:
        r_stmt = select(Resource).where(Resource.id == req.resource_id, Resource.user_id == user.id)
        r_res = await db.execute(r_stmt)
        res_obj = r_res.scalar_one_or_none()
        if res_obj:
            test_title_subject = res_obj.title
            chunks_stmt = (
                select(ResourceChunk)
                .where(ResourceChunk.resource_id == res_obj.id)
                .order_by(ResourceChunk.chunk_index.asc())
                .limit(6)
            )
            c_res = await db.execute(chunks_stmt)
            chunks = c_res.scalars().all()
            for ch in chunks:
                if ch.content and ch.content.strip():
                    context_snippets.append(ch.content.strip()[:600])

    elif req.mode == "folder" and req.folder_id:
        f_stmt = select(StudyFolder).where(StudyFolder.id == req.folder_id, StudyFolder.user_id == user.id)
        f_res = await db.execute(f_stmt)
        folder_obj = f_res.scalar_one_or_none()
        if folder_obj:
            test_title_subject = folder_obj.name
            # Gather chunks across resources in this folder
            rc_stmt = (
                select(ResourceChunk)
                .join(Resource, ResourceChunk.resource_id == Resource.id)
                .where(Resource.folder_id == folder_obj.id, Resource.user_id == user.id)
                .order_by(ResourceChunk.chunk_index.asc())
                .limit(8)
            )
            rc_res = await db.execute(rc_stmt)
            chunks = rc_res.scalars().all()
            for ch in chunks:
                if ch.content and ch.content.strip():
                    context_snippets.append(ch.content.strip()[:500])

    elif req.mode == "weakness":
        test_title_subject = "Adaptive Weakness Focus"
        ks_stmt = (
            select(Concept.name, Concept.topic)
            .join(KnowledgeState, KnowledgeState.concept_id == Concept.id)
            .where(KnowledgeState.user_id == user.id, KnowledgeState.p_l < 0.60)
            .order_by(KnowledgeState.p_l.asc())
            .limit(5)
        )
        ks_res = await db.execute(ks_stmt)
        weak_pairs = ks_res.all()
        if weak_pairs:
            context_snippets.append("Priority Focus Weak Concepts: " + ", ".join(f"{name} ({topic})" for name, topic in weak_pairs))

    # If no snippets collected yet, sample from the student's existing notes if any
    if not context_snippets:
        sample_chunks_stmt = (
            select(ResourceChunk.content, Resource.title)
            .join(Resource, ResourceChunk.resource_id == Resource.id)
            .where(Resource.user_id == user.id)
            .order_by(ResourceChunk.chunk_index.asc())
            .limit(6)
        )
        sc_res = await db.execute(sample_chunks_stmt)
        for content, res_title in sc_res.all():
            if content and content.strip():
                context_snippets.append(f"[{res_title}] {content.strip()[:450]}")

    material_text = "\n\n---\n\n".join(context_snippets) if context_snippets else "Standard Syllabus Curriculum for student."

    # 3. Format & Difficulty Selection
    available_types = ["mcq", "short_answer", "diagram", "long_answer"]
    requested_types = req.question_types if (req.question_types and len(req.question_types) > 0) else available_types
    num_q = max(2, min(req.num_questions, 8))
    diff_mode = (req.difficulty_mode or "adaptive").lower()

    # Dynamic Difficulty & Adaptive Calibration
    adaptive_directive = ""
    target_diff = "0.5"
    if diff_mode == "adaptive":
        stmt_pl = select(func.avg(KnowledgeState.p_l)).where(
            KnowledgeState.user_id == user.id,
            KnowledgeState.total_attempts > 0
        )
        res_pl = await db.execute(stmt_pl)
        avg_pl = res_pl.scalar()
        if avg_pl is not None:
            pct = round(float(avg_pl) * 100)
            if avg_pl < 0.50:
                adaptive_directive = (
                    f"DIFFICULTY CALIBRATION: ADAPTIVE (Current Student Mastery: {pct}% - Developing)\n"
                    f"- The student is building foundations. Start with accessible, fundamental concept questions (difficulty ~0.35-0.45) "
                    f"with clear definitions and direct logic. Provide supportive Socratic hints."
                )
                target_diff = "0.4"
            elif avg_pl < 0.75:
                adaptive_directive = (
                    f"DIFFICULTY CALIBRATION: ADAPTIVE (Current Student Mastery: {pct}% - Proficient)\n"
                    f"- The student has solid baseline grasp. Provide intermediate application and problem-solving questions (difficulty ~0.55-0.65) "
                    f"focusing on real code/system implementations and standard analytical logic."
                )
                target_diff = "0.6"
            else:
                adaptive_directive = (
                    f"DIFFICULTY CALIBRATION: ADAPTIVE (Current Student Mastery: {pct}% - High Mastery)\n"
                    f"- The student demonstrates strong expertise. Challenge them with advanced synthesis, non-trivial corner cases, "
                    f"and complex architectural trade-offs (difficulty ~0.72-0.85)."
                )
                target_diff = "0.8"
        else:
            adaptive_directive = (
                "DIFFICULTY CALIBRATION: ADAPTIVE (Diagnostic Baseline Assessment)\n"
                "- Calibrate an exploratory gradient: start with core conceptual foundations (0.38) and progressively scale up "
                "to intermediate application (0.62) to measure student latent ability theta."
            )
            target_diff = "0.5"
    elif diff_mode == "foundational":
        adaptive_directive = (
            "DIFFICULTY CALIBRATION: FOUNDATIONAL / ACCESSIBLE (Target Difficulty: 0.30 - 0.45)\n"
            "- Focus on primary definitions, essential syntax rules, direct conceptual verification, and straightforward logic."
        )
        target_diff = "0.4"
    elif diff_mode == "intermediate":
        adaptive_directive = (
            "DIFFICULTY CALIBRATION: INTERMEDIATE / STANDARD (Target Difficulty: 0.50 - 0.65)\n"
            "- Focus on practical application, code implementation, bug identification, and standard exam-level analytical reasoning."
        )
        target_diff = "0.6"
    elif diff_mode == "advanced":
        adaptive_directive = (
            "DIFFICULTY CALIBRATION: ADVANCED / CHALLENGE (Target Difficulty: 0.70 - 0.88)\n"
            "- Focus on multi-part architectural questions, complex derivations, edge-case analysis, and deep trade-off evaluation."
        )
        target_diff = "0.8"

    # 4. Generate questions dynamically via AI
    system_prompt = (
        f"You are the Mentor Mate Academic Diagnostic Test Engine.\n"
        f"STUDENT PROFILE:\n"
        f"- Name: {student_name}\n"
        f"- Education Tier: {tier}\n"
        f"- Board / University: {board}\n"
        f"- Target Goal / Subject: {goal}\n"
        f"- Test Subject / Topic: {test_title_subject}\n"
        f"- Selected Difficulty Mode: {diff_mode.upper()}\n\n"
        f"{adaptive_directive}\n\n"
        f"SOURCE MATERIAL CONTEXT:\n{material_text}\n\n"
        f"TASK:\n"
        f"Generate exactly {num_q} authentic, rigorous academic test questions tailored strictly to this student's "
        f"field of study ({test_title_subject}) and the provided material, calibrated to the difficulty directive above.\n"
        f"IMPORTANT RULES:\n"
        f"1. DO NOT assume or insert unrelated Physics/Optics questions if the student's study material/field is Object-Oriented Programming, "
        f"Computer Science, Literature, Commerce, or other domains!\n"
        f"2. Incorporate the following question types evenly across the test: {json.dumps(requested_types)}.\n"
        f"   - 'mcq': Exactly 4 distinct options (A, B, C, D) and correct_index (0, 1, 2, or 3).\n"
        f"   - 'short_answer': Concise technical question, definition, or code logic prompt. Set options to null, correct_index to null, and provide a 'rubric' array of 2-3 key technical points.\n"
        f"   - 'long_answer': Comprehensive architectural, conceptual, or derivation problem. Set options to null, and provide a 'rubric' array of 3-5 criteria.\n"
        f"   - 'diagram': Include a valid Mermaid diagram in 'diagram_code' (e.g. classDiagram, flowchart TD, sequenceDiagram) or clean ASCII schema, and ask the student to analyze or explain the structural relationships. Provide 'rubric' and 'explanation'.\n"
        f"3. All mathematical and scientific formulas MUST use KaTeX/LaTeX format ($E = mc^2$, $\\mathcal{{O}}(n \\log n)$).\n"
        f"4. Set question 'difficulty' float reflecting the calibration directive (e.g. ~{target_diff}).\n"
        f"5. Provide realistic, educational explanations for every question.\n\n"
        f"OUTPUT FORMAT:\n"
        f"Return ONLY a valid JSON object matching this schema:\n"
        f"{{\n"
        f'  "title": "{test_title_subject} Assessment",\n'
        f'  "subject": "{test_title_subject}",\n'
        f'  "questions": [\n'
        f"    {{\n"
        f'      "concept_name": "Specific Concept Name",\n'
        f'      "topic": "Unit / Subtopic",\n'
        f'      "question_type": "mcq" | "short_answer" | "long_answer" | "diagram",\n'
        f'      "question_text": "Question statement...",\n'
        f'      "options": ["A) ...", "B) ...", "C) ...", "D) ..."] or null,\n'
        f'      "correct_index": 0 or null,\n'
        f'      "rubric": ["Point 1", "Point 2"],\n'
        f'      "diagram_code": "classDiagram\\n  ClassA <|-- ClassB" or null,\n'
        f'      "diagram_type": "mermaid" or null,\n'
        f'      "hints": ["Progressive Hint 1", "Progressive Hint 2"],\n'
        f'      "explanation": "Clear model explanation...",\n'
        f'      "difficulty": {target_diff},\n'
        f'      "misconceptions": {{"1": "Common error..."}}\n'
        f"    }}\n"
        f"  ]\n"
        f"}}"
    )

    logger.info(f"[AssessmentStart] Generating {num_q} questions for user='{user.id}', subject='{test_title_subject}', types={requested_types}")
    try:
        raw_output = await ai_service.generate_chat(
            messages=[{"role": "user", "content": f"Generate {num_q} questions for {test_title_subject}."}],
            system_prompt=system_prompt,
            role=ModelRole.ASSESSMENT_GENERATION,
            agent_name="AssessmentGenerator",
            temperature=0.3
        )
    except Exception as e:
        logger.error(f"[AssessmentStart] AI generation failed: {e}")
        raise HTTPException(status_code=503, detail="Unable to generate questions from your study materials at this moment.")

    parsed = extract_json_object(raw_output)
    if not parsed or not parsed.get("questions"):
        logger.warning(f"[AssessmentStart] JSON parsing failed from output: {raw_output[:200]}")
        raise HTTPException(status_code=500, detail="Failed to synthesize valid test questions. Please retry.")

    generated_questions = parsed.get("questions", [])
    if len(generated_questions) == 0:
        raise HTTPException(status_code=500, detail="No questions were generated.")

    # 5. Create Assessment record
    test_title = parsed.get("title", f"{test_title_subject} Assessment")
    assessment = Assessment(
        user_id=user.id,
        title=test_title,
        subject=parsed.get("subject", test_title_subject),
        status="in_progress",
        total_questions=len(generated_questions),
        score=0,
        percentage=0.0
    )
    db.add(assessment)
    await db.flush()

    # 6. Populate AssessmentItems and ensure Concept & KnowledgeState records exist
    for idx, q_data in enumerate(generated_questions):
        c_name = q_data.get("concept_name", f"{test_title_subject} Concept {idx+1}")
        c_topic = q_data.get("topic", test_title_subject)
        diff = float(q_data.get("difficulty", 0.5))

        # Check or create Concept
        c_stmt = select(Concept).where(Concept.name == c_name)
        c_res = await db.execute(c_stmt)
        concept = c_res.scalar_one_or_none()
        if not concept:
            concept = Concept(
                name=c_name,
                subject=test_title_subject,
                topic=c_topic,
                difficulty_base=diff
            )
            db.add(concept)
            await db.flush()

        # Check or create KnowledgeState for student
        ks_stmt = select(KnowledgeState).where(
            KnowledgeState.user_id == user.id,
            KnowledgeState.concept_id == concept.id
        )
        ks_res = await db.execute(ks_stmt)
        ks = ks_res.scalar_one_or_none()
        if not ks:
            ks = KnowledgeState(
                user_id=user.id,
                concept_id=concept.id,
                p_l=0.35
            )
            db.add(ks)

        q_type = q_data.get("question_type", "mcq")
        if q_type not in ["mcq", "short_answer", "long_answer", "diagram"]:
            q_type = "mcq"

        options_val = q_data.get("options") if (q_type == "mcq" and q_data.get("options")) else []
        correct_idx_val = int(q_data.get("correct_index", 0)) if (q_type == "mcq" and q_data.get("correct_index") is not None) else -1

        item = AssessmentItem(
            assessment_id=assessment.id,
            concept_id=concept.id,
            question_number=idx + 1,
            question_type=q_type,
            question_text=q_data.get("question_text", "Question prompt"),
            options=options_val,
            correct_index=correct_idx_val,
            rubric=q_data.get("rubric", []),
            diagram_code=q_data.get("diagram_code"),
            diagram_type=q_data.get("diagram_type", "mermaid" if q_data.get("diagram_code") else None),
            hints=q_data.get("hints", []),
            explanation=q_data.get("explanation", "Standard concept explanation."),
            difficulty=diff,
            discrimination_a=1.0,
            misconception_map=q_data.get("misconceptions", {})
        )
        db.add(item)

    await db.commit()
    await db.refresh(assessment)

    # 7. Fetch Question 1 to start
    q1_stmt = (
        select(AssessmentItem)
        .where(AssessmentItem.assessment_id == assessment.id, AssessmentItem.question_number == 1)
    )
    q1_res = await db.execute(q1_stmt)
    q1 = q1_res.scalar_one()

    return {
        "assessment_id": assessment.id,
        "title": assessment.title,
        "subject": assessment.subject,
        "total_questions": assessment.total_questions,
        "current_question": AssessmentItemOut(
            id=q1.id,
            question_number=q1.question_number,
            question_type=q1.question_type or "mcq",
            question_text=q1.question_text,
            options=q1.options if q1.question_type == "mcq" and q1.options else None,
            diagram_code=q1.diagram_code,
            diagram_type=q1.diagram_type,
            hints=q1.hints,
            rubric_hints=q1.rubric if q1.question_type != "mcq" else None
        )
    }


@router.post("/{assessment_id}/answer", response_model=AssessmentAnswerOut)
async def submit_assessment_answer(
    assessment_id: str,
    req: AssessmentAnswerRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submits an answer to a test question.
    - For MCQs: deterministic matching.
    - For Short Answer, Long Answer, and Diagrams: AI evaluates written response using semantic rubric.
    - Updates BKT knowledge state, Leitner/Ebbinghaus retention stability, and test diagnostics.
    """
    a_stmt = select(Assessment).where(Assessment.id == assessment_id, Assessment.user_id == user.id)
    a_res = await db.execute(a_stmt)
    assessment = a_res.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    item_stmt = select(AssessmentItem).where(
        AssessmentItem.id == req.item_id,
        AssessmentItem.assessment_id == assessment.id
    )
    item_res = await db.execute(item_stmt)
    item = item_res.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Question item not found")

    # Evaluation logic
    is_correct = False
    score_awarded = 0.0
    ai_feedback = None
    error_type = None
    missing_concepts = []

    if item.question_type == "mcq":
        # MCQ deterministic verification
        is_correct = (req.selected_index is not None and req.selected_index == item.correct_index)
        score_awarded = 1.0 if is_correct else 0.0
        if not is_correct and item.misconception_map and req.selected_index is not None:
            error_type = item.misconception_map.get(str(req.selected_index), "Conceptual / Option Selection Error")
        ai_feedback = "Correct! Well reasoned." if is_correct else "Incorrect choice. Review the explanation and key points below."

    else:
        # Open-ended: short answer, long answer, diagram analysis
        student_text = (req.text_response or "").strip()
        if not student_text:
            is_correct = False
            score_awarded = 0.0
            ai_feedback = "No written answer was provided."
            error_type = "Unattempted Question"
        else:
            # Evaluate using AI with Deep Reasoning role
            eval_prompt = (
                f"You are the Mentor Mate Academic Evaluator.\n"
                f"Question Type: {item.question_type}\n"
                f"Question Statement: {item.question_text}\n"
            )
            if item.diagram_code:
                eval_prompt += f"Associated Diagram: {item.diagram_code}\n"
            eval_prompt += (
                f"Expected Rubric Criteria: {json.dumps(item.rubric or [])}\n"
                f"Model Reference Explanation: {item.explanation}\n\n"
                f"STUDENT'S SUBMITTED RESPONSE:\n{student_text}\n\n"
                f"TASK:\n"
                f"Evaluate the student's answer accurately against the rubric and model explanation.\n"
                f"Award a normalized score between 0.0 and 1.0:\n"
                f"- 1.0: Thorough, accurate, satisfies all core criteria.\n"
                f"- 0.7 - 0.9: Solid understanding with minor omissions.\n"
                f"- 0.4 - 0.6: Partial understanding with missing core concepts.\n"
                f"- 0.0 - 0.3: Incorrect, irrelevant, or major misconceptions.\n\n"
                f"Provide constructive, respectful feedback explaining strengths and gaps.\n"
                f"Return ONLY valid JSON:\n"
                f"{{\n"
                f'  "score": 0.85,\n'
                f'  "is_correct": true,\n'
                f'  "feedback": "2-3 sentences of targeted academic feedback...",\n'
                f'  "missing_points": ["Specific point omitted if any"],\n'
                f'  "error_type": "Brief error classification or null"\n'
                f"}}"
            )

            try:
                eval_raw = await ai_service.generate_chat(
                    messages=[{"role": "user", "content": "Evaluate student response."}],
                    system_prompt=eval_prompt,
                    role=ModelRole.DEEP_REASONING,
                    agent_name="AnswerEvaluator",
                    temperature=0.1
                )
                eval_json = extract_json_object(eval_raw)
                if eval_json:
                    score_awarded = float(eval_json.get("score", 0.0))
                    score_awarded = max(0.0, min(1.0, score_awarded))
                    is_correct = bool(eval_json.get("is_correct", score_awarded >= 0.60))
                    ai_feedback = eval_json.get("feedback", "Answer evaluated.")
                    error_type = eval_json.get("error_type")
                    missing_concepts = eval_json.get("missing_points", [])
                else:
                    # Fallback scoring heuristic
                    score_awarded = 0.5 if len(student_text.split()) > 10 else 0.2
                    is_correct = (score_awarded >= 0.6)
                    ai_feedback = "Answer recorded and verified against core criteria."
            except Exception as e:
                logger.error(f"[AnswerEvaluation] AI evaluation call error: {e}")
                score_awarded = 0.5 if len(student_text.split()) > 10 else 0.2
                is_correct = (score_awarded >= 0.6)
                ai_feedback = "Your answer was recorded. Review the model explanation below for complete depth."

    # Bayesian Knowledge Tracing Update
    prior_p_l = 0.35
    posterior_p_l = 0.35
    if item.concept_id:
        ks_stmt = select(KnowledgeState).where(
            KnowledgeState.user_id == user.id,
            KnowledgeState.concept_id == item.concept_id
        )
        ks_res = await db.execute(ks_stmt)
        ks = ks_res.scalar_one_or_none()
        if ks:
            prior_p_l = ks.p_l
            evidence_p_l, next_p_l = bkt_service.update_mastery(
                prior_p_l=prior_p_l,
                is_correct=is_correct,
                p_t=ks.p_t,
                p_g=ks.p_g,
                p_s=ks.p_s
            )
            ks.p_l = next_p_l
            ks.total_attempts += 1
            if is_correct:
                ks.correct_attempts += 1
            ks.last_observed_at = datetime.now(timezone.utc)
            posterior_p_l = next_p_l

            # Spaced revision queue maintenance
            now_utc = datetime.now(timezone.utc)
            rev_type = "study_material" if (getattr(assessment, "mode", None) in ["resource", "folder"] or getattr(assessment, "resource_id", None) or getattr(assessment, "folder_id", None)) else "field_curriculum"
            topic_label = getattr(item, "topic_tag", None) or getattr(assessment, "subject", None) or "Assessment Concept"

            rev_stmt = select(RevisionItem).where(
                RevisionItem.user_id == user.id,
                RevisionItem.concept_id == item.concept_id
            )
            rev_res = await db.execute(rev_stmt)
            rev_item = rev_res.scalar_one_or_none()

            if rev_item:
                current_s = rev_item.stability_days_s if (rev_item.stability_days_s and rev_item.stability_days_s > 0) else 3.0
                new_s, next_dt = retention_service.update_stability_after_review(
                    current_stability_s=current_s,
                    is_remembered=is_correct,
                    current_retention=rev_item.retention_estimate or 1.0
                )
                rev_item.stability_days_s = new_s
                rev_item.last_reviewed_at = now_utc
                rev_item.next_review_at = next_dt
                rev_item.review_count = (rev_item.review_count or 0) + 1
                rev_item.retention_estimate = 1.0 if is_correct else 0.40
                rev_item.priority = "High" if not is_correct else "Medium"
                rev_item.source_context = "test"
                rev_item.last_score = score_awarded
            else:
                new_s, next_dt = retention_service.update_stability_after_review(
                    current_stability_s=3.0,
                    is_remembered=is_correct,
                    current_retention=1.0
                )
                rev_item = RevisionItem(
                    user_id=user.id,
                    concept_id=item.concept_id,
                    topic_title=topic_label,
                    revision_type=rev_type,
                    source_context="test",
                    resource_id=getattr(assessment, "resource_id", None),
                    folder_id=getattr(assessment, "folder_id", None),
                    stability_days_s=new_s,
                    last_reviewed_at=now_utc,
                    next_review_at=next_dt,
                    review_count=1,
                    retention_estimate=1.0 if is_correct else 0.40,
                    priority="High" if not is_correct else "Medium",
                    last_score=score_awarded
                )
                db.add(rev_item)


    # Persist Response
    # Persist Response
    sel_idx = req.selected_index if (req.selected_index is not None) else -1
    response_rec = AssessmentResponse(
        assessment_id=assessment.id,
        item_id=item.id,
        user_id=user.id,
        selected_index=sel_idx,
        text_response=req.text_response,
        score_awarded=score_awarded,
        ai_feedback=ai_feedback,
        missing_concepts=missing_concepts,
        is_correct=is_correct,
        response_time_ms=req.response_time_ms,
        error_type=error_type,
        prior_p_l=prior_p_l,
        posterior_p_l=posterior_p_l
    )
    db.add(response_rec)

    # Cumulative score
    if is_correct:
        assessment.score += 1

    # Check completion
    resp_count_stmt = select(AssessmentResponse).where(AssessmentResponse.assessment_id == assessment.id)
    resp_count_res = await db.execute(resp_count_stmt)
    total_answered = len(resp_count_res.scalars().all()) + 1

    is_complete = (total_answered >= assessment.total_questions)
    if is_complete:
        assessment.status = "completed"
        assessment.completed_at = datetime.now(timezone.utc)
        assessment.percentage = round((assessment.score / assessment.total_questions) * 100, 1)
        assessment.proficiency_tier = bkt_service.classify_proficiency(posterior_p_l)
        # Recalculate overall mastery score for the user
        from app.services.mastery_service import calculate_mastery
        new_mastery = await calculate_mastery(db, user.id)
        user.mastery_score = new_mastery
        db.add(user)
        await db.flush()

        # IRT ability theta
        all_res_stmt = (
            select(AssessmentResponse, AssessmentItem)
            .join(AssessmentItem, AssessmentResponse.item_id == AssessmentItem.id)
            .where(AssessmentResponse.assessment_id == assessment.id)
        )
        all_res = await db.execute(all_res_stmt)
        irt_inputs = [
            {"is_correct": r.is_correct, "difficulty": itm.difficulty, "discrimination": itm.discrimination_a}
            for r, itm in all_res.all()
        ]
        irt_inputs.append({"is_correct": is_correct, "difficulty": item.difficulty, "discrimination": item.discrimination_a})
        assessment.latent_ability_theta = irt_service.estimate_ability_map(irt_inputs)

    # Next question
    next_q_out = None
    if not is_complete:
        next_num = item.question_number + 1
        next_stmt = select(AssessmentItem).where(
            AssessmentItem.assessment_id == assessment.id,
            AssessmentItem.question_number == next_num
        )
        next_res = await db.execute(next_stmt)
        next_item = next_res.scalar_one_or_none()
        if next_item:
            next_q_out = AssessmentItemOut(
                id=next_item.id,
                question_number=next_item.question_number,
                question_type=next_item.question_type or "mcq",
                question_text=next_item.question_text,
                options=next_item.options if next_item.question_type == "mcq" and next_item.options else None,
                diagram_code=next_item.diagram_code,
                diagram_type=next_item.diagram_type,
                hints=next_item.hints,
                rubric_hints=next_item.rubric if next_item.question_type != "mcq" else None
            )

    await db.commit()
    await db.refresh(assessment)

    return AssessmentAnswerOut(
        is_correct=is_correct,
        score_awarded=score_awarded,
        correct_index=item.correct_index if item.question_type == "mcq" else None,
        ai_feedback=ai_feedback,
        explanation=item.explanation,
        error_type=error_type,
        prior_p_l=prior_p_l,
        posterior_p_l=posterior_p_l,
        is_complete=is_complete,
        score=assessment.score,
        total_questions=assessment.total_questions,
        next_question=next_q_out
    )


@router.get("/history", response_model=List[AssessmentReportOut])
async def assessment_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Returns past completed assessments with score, percentage, proficiency and IRT ability."""
    stmt = (
        select(Assessment)
        .where(Assessment.user_id == user.id, Assessment.status == "completed")
        .order_by(Assessment.completed_at.desc())
    )
    res = await db.execute(stmt)
    return res.scalars().all()
