import json
import re
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.core.database import get_db
from app.models.user import User, Profile
from app.models.revision import RevisionItem
from app.models.knowledge import Concept
from app.models.resource import Resource, ResourceChunk, StudyFolder
from app.schemas.revision import (
    RevisionItemOut,
    RevisionCompleteRequest,
    RevisionGenerateRequest,
    AtRiskConceptOut
)
from app.services.retention_service import retention_service
from app.services.ai_service import ai_service, ModelRole
from app.api.deps import get_current_user

router = APIRouter(prefix="/revision", tags=["Ebbinghaus Spaced Revision"])

def _clean_mermaid(code: Optional[str]) -> Optional[str]:
    """Strips markdown code fences from mermaid code if present."""
    if not code:
        return None
    code = code.strip()
    if code.startswith("```mermaid"):
        code = code[10:]
    elif code.startswith("```"):
        code = code[3:]
    if code.endswith("```"):
        code = code[:-3]
    return code.strip()

@router.get("/items", response_model=List[RevisionItemOut])
@router.get("/due", response_model=List[RevisionItemOut])
async def get_revision_items(
    revision_type: Optional[str] = Query(None, description="Filter by 'field_curriculum' or 'study_material'"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all revision items for the student with dynamic memory retention R(t) = 2^(-t / S).
    Flags at-risk items (R(t) <= 0.70) that need urgent or prompt revision.
    """
    stmt = (
        select(RevisionItem, Concept)
        .outerjoin(Concept, RevisionItem.concept_id == Concept.id)
        .where(RevisionItem.user_id == user.id)
    )
    if revision_type:
        stmt = stmt.where(RevisionItem.revision_type == revision_type)

    res = await db.execute(stmt)
    rows = res.all()

    now = datetime.now(timezone.utc)
    items_out = []

    for rev, concept in rows:
        # Sanitize if stability was blown up by previous review bugs
        if rev.stability_days_s and rev.stability_days_s > 60.0:
            rev.stability_days_s = 21.0
            db.add(rev)

        # Calculate dynamic elapsed days
        last_dt = rev.last_reviewed_at
        if last_dt.tzinfo is None:
            last_dt = last_dt.replace(tzinfo=timezone.utc)
        elapsed_days = max(0.0, (now - last_dt).total_seconds() / 86400.0)

        # Calculate R(t) = 2^(-t / S)
        s_val = rev.stability_days_s if (rev.stability_days_s and rev.stability_days_s > 0) else 3.0
        if s_val > 60.0:
            s_val = 21.0
        current_retention = retention_service.calculate_retention(elapsed_days, s_val)
        rev.retention_estimate = current_retention

        is_at_risk = (current_retention <= 0.70)
        c_name = concept.name if concept else None
        c_sub = concept.subject if concept else None
        c_topic = concept.topic if concept else None
        display_topic = rev.topic_title or c_name or "Curriculum Core"

        items_out.append(RevisionItemOut(
            id=rev.id,
            concept_id=rev.concept_id,
            concept_name=c_name,
            topic_title=display_topic,
            subject=c_sub,
            topic=c_topic,
            revision_type=rev.revision_type or "field_curriculum",
            source_context=rev.source_context or "curriculum",
            resource_id=rev.resource_id,
            folder_id=rev.folder_id,
            flashcards=rev.flashcards,
            mindmap_code=_clean_mermaid(rev.mindmap_code),
            quick_summary=rev.quick_summary,
            speed_quiz=rev.speed_quiz,
            last_score=rev.last_score,
            stability_days_s=s_val,
            half_life_days_h=s_val,
            retention_estimate=current_retention,
            last_reviewed_at=rev.last_reviewed_at,
            next_review_at=rev.next_review_at or (now + timedelta(days=s_val)),
            review_count=rev.review_count or 0,
            priority="High" if current_retention < 0.70 else ("Medium" if current_retention < 0.85 else "Low"),
            is_at_risk=is_at_risk
        ))

    await db.commit()
    # Sort by retention lowest first (most urgent / fading items first)
    items_out.sort(key=lambda x: x.retention_estimate)
    return items_out

@router.get("/decay-alerts", response_model=List[AtRiskConceptOut])
async def get_decay_alerts(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns concepts where memory retention has faded (R(t) <= 0.70).
    Used directly by the Dashboard to remind students to take a quick revision before forgetting.
    """
    stmt = (
        select(RevisionItem, Concept)
        .outerjoin(Concept, RevisionItem.concept_id == Concept.id)
        .where(RevisionItem.user_id == user.id)
    )
    res = await db.execute(stmt)
    rows = res.all()

    now = datetime.now(timezone.utc)
    alerts = []

    for rev, concept in rows:
        last_dt = rev.last_reviewed_at
        if last_dt.tzinfo is None:
            last_dt = last_dt.replace(tzinfo=timezone.utc)
        elapsed_days = max(0.0, (now - last_dt).total_seconds() / 86400.0)

        s_val = rev.stability_days_s if (rev.stability_days_s and rev.stability_days_s > 0) else 3.0
        current_retention = retention_service.calculate_retention(elapsed_days, s_val)

        # Alert trigger threshold: retention <= 70%
        if current_retention <= 0.70:
            title = rev.topic_title or (concept.name if concept else "Learned Concept")
            subject = concept.subject if concept else (rev.revision_type.replace("_", " ").title())
            urgency = "critical" if current_retention < 0.50 else "fading"

            alerts.append(AtRiskConceptOut(
                id=rev.id,
                title=title,
                subject=subject,
                revision_type=rev.revision_type or "field_curriculum",
                retention_estimate=round(current_retention, 3),
                days_since_reviewed=round(elapsed_days, 1),
                urgency=urgency,
                concept_id=rev.concept_id,
                source_context=rev.source_context
            ))

    alerts.sort(key=lambda x: x.retention_estimate)
    return alerts

@router.post("/generate", response_model=RevisionItemOut)
async def generate_revision_materials(
    req: RevisionGenerateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates multi-format revision materials (Flashcards, Mermaid Mind Map, Speed Quiz, Key Takeaways).
    Supports two distinct modes:
    1. 'field_curriculum': Based entirely on student's field of study / academic curriculum. Never uses uploaded notes.
    2. 'study_material': Grounded strictly in uploaded study materials (notes, documents, folders).
    """
    # 1. Fetch student profile
    prof_stmt = select(Profile).where(Profile.user_id == user.id)
    prof_res = await db.execute(prof_stmt)
    profile = prof_res.scalar_one_or_none()

    tier = profile.education_tier if profile else "Undergraduate"
    goal = profile.goal if profile else "Engineering / Computer Science"
    board = profile.board_or_university if profile else "University"

    topic_title = req.topic_or_subject or "Core Principles"
    matched_concept = None
    context_material = ""
    system_instruction = ""

    if req.revision_type == "study_material":

        # Grounded strictly in uploaded materials
        chunks_collected = []
        if req.resource_id:
            r_stmt = select(Resource).where(Resource.id == req.resource_id, Resource.user_id == user.id)
            r_res = await db.execute(r_stmt)
            res_obj = r_res.scalar_one_or_none()
            if not res_obj:
                raise HTTPException(status_code=404, detail="Study material not found")
            topic_title = res_obj.title
            rc_stmt = select(ResourceChunk).where(ResourceChunk.resource_id == res_obj.id).order_by(ResourceChunk.chunk_index.asc()).limit(8)
            chunks = (await db.execute(rc_stmt)).scalars().all()
            for ch in chunks:
                if ch.content:
                    chunks_collected.append(ch.content.strip()[:600])

        elif req.folder_id:
            f_stmt = select(StudyFolder).where(StudyFolder.id == req.folder_id, StudyFolder.user_id == user.id)
            f_res = await db.execute(f_stmt)
            folder_obj = f_res.scalar_one_or_none()
            if not folder_obj:
                raise HTTPException(status_code=404, detail="Study folder not found")
            topic_title = folder_obj.name
            # Get resources in folder
            rf_stmt = select(Resource).where(Resource.folder_id == folder_obj.id, Resource.user_id == user.id).limit(4)
            folder_res = (await db.execute(rf_stmt)).scalars().all()
            for fr in folder_res:
                rc_stmt = select(ResourceChunk).where(ResourceChunk.resource_id == fr.id).limit(2)
                chks = (await db.execute(rc_stmt)).scalars().all()
                for ch in chks:
                    if ch.content:
                        chunks_collected.append(f"[{fr.title}]: " + ch.content.strip()[:500])

        if not chunks_collected:
            raise HTTPException(
                status_code=400,
                detail="No extracted study material text found for this resource/folder. Upload notes first or select Field of Study revision."
            )

        context_material = "\n\n---\n\n".join(chunks_collected)
        system_instruction = (
            "You are the Mentor Mate Revision Specialist for Note-Grounded Study.\n"
            "STRICT GROUNDING: You MUST generate revision materials STRICTLY and ONLY from the provided study material chunks.\n"
            "Do NOT hallucinate or bring external syllabus details that are not in the provided notes.\n"
        )

    else:
        # Type 1: Field of Study Revision (MUST NOT USE UPLOADED STUDY MATERIAL)
        if not req.topic_or_subject and not req.concept_id:
            topic_title = goal or "Object Oriented Programming"

        system_instruction = (
            "You are the Mentor Mate Academic Curriculum Revision Specialist.\n"
            "MODE: Field of Study & Academic Curriculum Revision.\n"
            "IMPORTANT CONSTRAINT: This revision is based on the student's academic curriculum and field of study.\n"
            "You must NOT reference or assume any uploaded study notes or personal files.\n"
            f"Student Field: {goal} | Tier: {tier} | Board/Univ: {board}\n"
            "Synthesize authoritative, high-yield, conceptually rigorous revision content for this topic."
        )

    # Resolve or create Concept in Knowledge graph
    if req.concept_id:
        c_stmt = select(Concept).where(Concept.id == req.concept_id)
        c_res = await db.execute(c_stmt)
        matched_concept = c_res.scalar_one_or_none()
        if matched_concept:
            topic_title = matched_concept.name

    if not matched_concept:
        clean_name = (topic_title or "Core Curriculum Concept")[:150].strip()
        c_stmt = select(Concept).where(Concept.name == clean_name)
        c_res = await db.execute(c_stmt)
        matched_concept = c_res.scalar_one_or_none()
        if not matched_concept:
            matched_concept = Concept(
                name=clean_name,
                subject=(goal or "Curriculum")[:100],
                topic=clean_name,
                description=f"Auto-indexed concept for {clean_name}"
            )
            db.add(matched_concept)
            await db.flush()
        req.concept_id = matched_concept.id


    prompt = (
        f"{system_instruction}\n\n"
        f"Topic / Subject to Revise: {topic_title}\n"
    )
    if req.custom_focus:
        prompt += f"Specific Student Focus: {req.custom_focus}\n"
    if context_material:
        prompt += f"\nPROVIDED STUDY MATERIAL:\n{context_material}\n\n"

    prompt += (
        "TASK: Generate a comprehensive, high-speed revision set formatted as strict JSON with exactly these four keys:\n"
        "1. flashcards: Array of 5 to 7 high-yield flipcards with { \"front\": \"Clear question/concept\", \"back\": \"Precise, memorable answer\", \"hint\": \"1-sentence clue\" }.\n"
        "2. mindmap_code: Valid Mermaid syntax string visualizing the conceptual structure. "
        "Use 'mindmap' syntax (e.g. `mindmap\\n  root((\"Topic\"))\\n    Branch1\\n      Subtopic1\\n    Branch2`) or clean `graph TD`. Keep node labels concise.\n"
        "3. quick_summary: Concise, bulleted markdown text (4-6 key takeaways, golden rules, or common pitfalls).\n"
        "4. speed_quiz: Array of 3 to 5 rapid diagnostic questions with { \"question\": \"...\", \"options\": [\"A\", \"B\", \"C\", \"D\"], \"correct_answer\": \"Exact string of correct option\", \"explanation\": \"Concise rationale\" }.\n\n"
        "Return ONLY raw valid JSON. No markdown code fence surrounding the JSON."
    )

    try:
        raw_resp = await ai_service.generate_chat(
            messages=[{"role": "user", "content": prompt}],
            system_prompt=system_instruction,
            role=ModelRole.RESOURCE_SYNTHESIS,
            temperature=0.2
        )

        # Parse JSON
        clean_json = raw_resp.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json[7:]
        elif clean_json.startswith("```"):
            clean_json = clean_json[3:]
        if clean_json.endswith("```"):
            clean_json = clean_json[:-3]
        clean_json = clean_json.strip()

        data = json.loads(clean_json)
        flashcards = data.get("flashcards", [])
        mindmap_code = _clean_mermaid(data.get("mindmap_code", ""))
        quick_summary = data.get("quick_summary", "")
        speed_quiz = data.get("speed_quiz", [])

    except Exception as err:
        import logging
        logging.getLogger("mentormate").warning(f"AI Revision Generation fallback: {err}")
        # Structured fallback if AI model parsing encounters unexpected formatting
        flashcards = [
            {"front": f"What is the core definition of {topic_title}?", "back": f"{topic_title} represents foundational principles in {tier} {goal}.", "hint": "Think about primary responsibilities and structure."},
            {"front": f"Key architectural advantage of {topic_title}", "back": "Modularity, maintainability, and clean separation of concerns.", "hint": "Software design benefits."}
        ]
        mindmap_code = f"mindmap\n  root((\"{topic_title}\"))\n    Core Principles\n      Fundamentals\n      Application\n    Key Techniques\n      Implementation\n      Best Practices"
        quick_summary = f"• **Core Concept**: Essential principles of {topic_title}.\n• **Key Takeaway**: Focus on foundational architecture and modular design.\n• **Common Pitfall**: Overlooking edge-case validation."
        speed_quiz = [
            {
                "question": f"Which of the following is a primary characteristic of {topic_title}?",
                "options": ["High cohesion and modularity", "Tight coupling across unrelated modules", "Eliminating all abstractions", "Manual memory duplication"],
                "correct_answer": "High cohesion and modularity",
                "explanation": "Effective design emphasizes high cohesion and maintainable encapsulation."
            }
        ]

    # Check for existing revision item to update, or create new
    now_utc = datetime.now(timezone.utc)
    rev_stmt = select(RevisionItem).where(
        RevisionItem.user_id == user.id,
        or_(
            RevisionItem.topic_title.ilike(f"%{topic_title[:30]}%"),
            RevisionItem.concept_id == req.concept_id if req.concept_id else False
        )
    )
    existing_rev = (await db.execute(rev_stmt)).scalars().first()

    if existing_rev:
        rev_item = existing_rev
        rev_item.topic_title = topic_title
        rev_item.revision_type = req.revision_type
        rev_item.source_context = "notes_upload" if req.revision_type == "study_material" else "curriculum"
        rev_item.resource_id = req.resource_id
        rev_item.folder_id = req.folder_id
        rev_item.flashcards = flashcards
        rev_item.mindmap_code = mindmap_code
        rev_item.quick_summary = quick_summary
        rev_item.speed_quiz = speed_quiz
        rev_item.last_reviewed_at = now_utc
        rev_item.retention_estimate = 1.0
        rev_item.next_review_at = now_utc + timedelta(days=rev_item.stability_days_s or 3.0)
    else:
        rev_item = RevisionItem(
            user_id=user.id,
            concept_id=req.concept_id,
            topic_title=topic_title,
            revision_type=req.revision_type,
            source_context="notes_upload" if req.revision_type == "study_material" else "curriculum",
            resource_id=req.resource_id,
            folder_id=req.folder_id,
            flashcards=flashcards,
            mindmap_code=mindmap_code,
            quick_summary=quick_summary,
            speed_quiz=speed_quiz,
            stability_days_s=3.0,
            last_reviewed_at=now_utc,
            next_review_at=now_utc + timedelta(days=3.0),
            review_count=0,
            retention_estimate=1.0,
            priority="Medium"
        )
        db.add(rev_item)

    await db.commit()
    await db.refresh(rev_item)

    return RevisionItemOut(
        id=rev_item.id,
        concept_id=rev_item.concept_id,
        concept_name=matched_concept.name if matched_concept else None,
        topic_title=rev_item.topic_title,
        subject=matched_concept.subject if matched_concept else (goal or "Curriculum"),
        topic=matched_concept.topic if matched_concept else None,
        revision_type=rev_item.revision_type,
        source_context=rev_item.source_context,
        resource_id=rev_item.resource_id,
        folder_id=rev_item.folder_id,
        flashcards=rev_item.flashcards,
        mindmap_code=rev_item.mindmap_code,
        quick_summary=rev_item.quick_summary,
        speed_quiz=rev_item.speed_quiz,
        last_score=rev_item.last_score,
        stability_days_s=rev_item.stability_days_s,
        half_life_days_h=rev_item.stability_days_s,
        retention_estimate=1.0,
        last_reviewed_at=rev_item.last_reviewed_at,
        next_review_at=rev_item.next_review_at,
        review_count=rev_item.review_count,
        priority="Medium",
        is_at_risk=False
    )

@router.get("/{revision_id}", response_model=RevisionItemOut)
async def get_revision_item(
    revision_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(RevisionItem, Concept)
        .outerjoin(Concept, RevisionItem.concept_id == Concept.id)
        .where(RevisionItem.id == revision_id, RevisionItem.user_id == user.id)
    )
    res = await db.execute(stmt)
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Revision item not found")

    rev, concept = row
    now = datetime.now(timezone.utc)
    last_dt = rev.last_reviewed_at
    if last_dt.tzinfo is None:
        last_dt = last_dt.replace(tzinfo=timezone.utc)
    elapsed_days = max(0.0, (now - last_dt).total_seconds() / 86400.0)
    s_val = rev.stability_days_s if (rev.stability_days_s and rev.stability_days_s > 0) else 3.0
    if s_val > 60.0:
        s_val = 21.0
        rev.stability_days_s = s_val
        await db.commit()
    current_retention = retention_service.calculate_retention(elapsed_days, s_val)

    return RevisionItemOut(
        id=rev.id,
        concept_id=rev.concept_id,
        concept_name=concept.name if concept else None,
        topic_title=rev.topic_title or (concept.name if concept else "Topic"),
        subject=concept.subject if concept else None,
        topic=concept.topic if concept else None,
        revision_type=rev.revision_type or "field_curriculum",
        source_context=rev.source_context or "curriculum",
        resource_id=rev.resource_id,
        folder_id=rev.folder_id,
        flashcards=rev.flashcards,
        mindmap_code=_clean_mermaid(rev.mindmap_code),
        quick_summary=rev.quick_summary,
        speed_quiz=rev.speed_quiz,
        last_score=rev.last_score,
        stability_days_s=s_val,
        half_life_days_h=s_val,
        retention_estimate=current_retention,
        last_reviewed_at=rev.last_reviewed_at,
        next_review_at=rev.next_review_at or (now + timedelta(days=s_val)),
        review_count=rev.review_count or 0,
        priority="High" if current_retention < 0.70 else "Medium",
        is_at_risk=(current_retention <= 0.70)
    )

@router.post("/{revision_id}/complete")
async def complete_revision_review(
    revision_id: str,
    req: RevisionCompleteRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(RevisionItem).where(RevisionItem.id == revision_id, RevisionItem.user_id == user.id)
    res = await db.execute(stmt)
    rev = res.scalar_one_or_none()
    if not rev:
        raise HTTPException(status_code=404, detail="Revision item not found")

    now = datetime.now(timezone.utc)
    current_s = rev.stability_days_s if (rev.stability_days_s and rev.stability_days_s > 0) else 3.0
    if current_s > 60.0:
        current_s = 21.0

    # Calculate new stability based on rating or score (bounded between 1.0 and 60.0 days)
    if req.difficulty_rating:
        r_lower = req.difficulty_rating.lower()
        if r_lower == "easy":
            new_s = min(60.0, max(3.0, round(current_s * 1.5, 1)))
        elif r_lower == "good":
            new_s = min(45.0, max(2.0, round(current_s * 1.3, 1)))
        elif r_lower == "hard":
            new_s = min(21.0, max(1.0, round(current_s * 0.85, 1)))
        else:  # "again" (lapse / forgotten)
            new_s = 1.0  # Immediate reset to 1 day on lapse
    elif req.score is not None:
        rev.last_score = req.score
        if req.score >= 0.8:
            new_s = min(60.0, max(3.0, round(current_s * 1.4, 1)))
        elif req.score >= 0.6:
            new_s = min(30.0, max(2.0, round(current_s * 1.15, 1)))
        else:
            new_s = 1.0
    else:
        new_s, _ = retention_service.update_stability_after_review(
            current_stability_s=current_s,
            is_remembered=req.is_remembered,
            current_retention=rev.retention_estimate or 1.0
        )
        new_s = min(60.0, max(1.0, round(new_s, 1)))

    # Hard ceiling clamp
    new_s = min(60.0, max(1.0, new_s))

    # Next review scheduled when R(t) decays to 0.70: t = -S * log2(0.70) ≈ S * 0.5146
    days_to_next = max(1.0, round(new_s * 0.5146, 1))
    next_dt = now + timedelta(days=days_to_next)

    rev.stability_days_s = new_s
    rev.last_reviewed_at = now
    rev.next_review_at = next_dt
    rev.review_count = (rev.review_count or 0) + 1
    rev.retention_estimate = 1.0
    rev.priority = "Medium"

    await db.commit()
    await db.refresh(rev)

    return {
        "message": f"Revision review logged. Memory stability calibrated to S = {new_s} days.",
        "new_stability_days": new_s,
        "next_review_at": rev.next_review_at,
        "review_count": rev.review_count
    }

@router.get("/agent-challenge")
@router.post("/agent-challenge")
async def get_revision_agent_challenge(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generates an active recall challenge for due items via OpenClaw Revision Agent."""
    from app.services.openclaw_service import openclaw_service
    return await openclaw_service.run_revision_agent(user_id=user.id, db=db)


