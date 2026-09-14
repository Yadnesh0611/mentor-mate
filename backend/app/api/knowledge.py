from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.user import User
from app.models.knowledge import KnowledgeState, Concept
from app.api.deps import get_current_user

router = APIRouter(prefix="/knowledge", tags=["Knowledge Modeling & BKT"])

@router.get("/states")
async def get_knowledge_states(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(KnowledgeState, Concept)
        .join(Concept, KnowledgeState.concept_id == Concept.id)
        .where(KnowledgeState.user_id == user.id)
        .order_by(KnowledgeState.p_l.desc())
    )
    res = await db.execute(stmt)
    rows = res.all()

    return [
        {
            "concept_id": concept.id,
            "name": concept.name,
            "subject": concept.subject,
            "topic": concept.topic,
            "p_l": round(ks.p_l, 4),
            "mastery_percent": round(ks.p_l * 100, 1),
            "uncertainty": round(ks.uncertainty, 3),
            "total_attempts": ks.total_attempts,
            "correct_attempts": ks.correct_attempts,
            "accuracy_percent": round((ks.correct_attempts / ks.total_attempts * 100), 1) if ks.total_attempts > 0 else 0.0,
            "last_observed_at": ks.last_observed_at
        }
        for ks, concept in rows
    ]

@router.post("/study-plan")
async def generate_study_plan(
    goal: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generates and persists a structured academic study plan via OpenClaw + OmniRoute."""
    from app.services.openclaw_service import openclaw_service
    return await openclaw_service.run_study_planner_agent(user_id=user.id, db=db, custom_goal=goal)

@router.get("/study-plan")
async def get_latest_study_plan(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Fetches the student's latest active persisted study plan."""
    from app.models.knowledge import StudyPlan
    import json
    stmt = (
        select(StudyPlan)
        .where(StudyPlan.user_id == user.id)
        .order_by(StudyPlan.created_at.desc())
    )
    res = await db.execute(stmt)
    plan = res.scalar_one_or_none()
    if not plan:
        return {"has_plan": False, "message": "No study plan created yet. Trigger generation to create one."}
    
    plan_data = {}
    try:
        plan_data = json.loads(plan.plan_structure)
    except Exception:
        plan_data = {"raw": plan.plan_structure}

    return {
        "has_plan": True,
        "plan_id": plan.id,
        "title": plan.title,
        "goal": plan.goal,
        "status": plan.status,
        "plan_structure": plan_data,
        "created_at": plan.created_at
    }

@router.get("/analysis")
@router.post("/analysis")
async def analyze_student_knowledge(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Executes Knowledge Analysis Agent to detect gaps, decay, and recommendations."""
    from app.services.openclaw_service import openclaw_service
    return await openclaw_service.run_knowledge_analysis_agent(user_id=user.id, db=db)

