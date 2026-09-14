from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.core.database import get_db
from app.models.user import User, Profile
from app.models.resource import Resource
from app.models.knowledge import KnowledgeState
from app.models.assessment import Assessment
from app.models.revision import RevisionItem
from app.services.recommendation_service import recommendation_service
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Student Dashboard"])

@router.get("")
async def get_dashboard_data(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # 1. Profile
    prof_stmt = select(Profile).where(Profile.user_id == user.id)
    prof_res = await db.execute(prof_stmt)
    profile = prof_res.scalar_one_or_none()

    # 2. Resource Count
    res_count_stmt = select(func.count(Resource.id)).where(Resource.user_id == user.id)
    res_count = (await db.execute(res_count_stmt)).scalar() or 0

    # 3. Assessment Count & Recent Assessments
    ass_stmt = (
        select(Assessment)
        .where(Assessment.user_id == user.id, Assessment.status == "completed")
        .order_by(Assessment.completed_at.desc())
        .limit(3)
    )
    recent_assessments = (await db.execute(ass_stmt)).scalars().all()
    total_assessments = len(recent_assessments)

    # 4. Average Knowledge Mastery (only concepts with actual student attempts)
    ks_avg_stmt = select(func.avg(KnowledgeState.p_l)).where(
        KnowledgeState.user_id == user.id,
        KnowledgeState.total_attempts > 0
    )
    avg_p_l = (await db.execute(ks_avg_stmt)).scalar()

    # 5. Dynamic Memory Decay Analysis & At-Risk Forgetting Curve Alerts
    from datetime import datetime, timezone
    from app.services.retention_service import retention_service
    from app.models.knowledge import Concept

    all_rev_stmt = (
        select(RevisionItem, Concept)
        .outerjoin(Concept, RevisionItem.concept_id == Concept.id)
        .where(RevisionItem.user_id == user.id)
    )
    all_rev_res = await db.execute(all_rev_stmt)
    all_rev_rows = all_rev_res.all()

    now_utc = datetime.now(timezone.utc)
    at_risk_revisions = []
    due_rev_count = 0

    for rev, concept in all_rev_rows:
        last_dt = rev.last_reviewed_at
        if last_dt.tzinfo is None:
            last_dt = last_dt.replace(tzinfo=timezone.utc)
        elapsed_days = max(0.0, (now_utc - last_dt).total_seconds() / 86400.0)
        s_val = rev.stability_days_s if (rev.stability_days_s and rev.stability_days_s > 0) else 3.0
        retention = retention_service.calculate_retention(elapsed_days, s_val)
        rev.retention_estimate = retention

        if retention <= 0.70:
            due_rev_count += 1
            title = rev.topic_title or (concept.name if concept else "Learned Concept")
            at_risk_revisions.append({
                "id": rev.id,
                "title": title,
                "subject": concept.subject if concept else rev.revision_type.replace("_", " ").title(),
                "revision_type": rev.revision_type or "field_curriculum",
                "retention_percent": round(retention * 100, 1),
                "days_since_reviewed": round(elapsed_days, 1),
                "urgency": "Critical" if retention < 0.50 else "Fading"
            })

    at_risk_revisions.sort(key=lambda x: x["retention_percent"])
    await db.commit()

    # 6. Priority Focus Recommendation
    priority_focus = await recommendation_service.get_next_priority_focus(db, user.id)

    has_data = bool(res_count > 0 or total_assessments > 0 or avg_p_l is not None or len(all_rev_rows) > 0)
    days_to_exam_val = profile.days_to_exam if (profile and profile.days_to_exam and profile.days_to_exam != 118) else None


    return {
        "has_data": has_data,
        "student": {
            "name": profile.name if profile else "Student",
            "education_tier": profile.education_tier if profile else "Class 10 (10th Boards)",
            "goal": profile.goal if profile else "10th Boards (CBSE)",
            "streak_days": profile.streak_days if profile else 1,
            "daily_available_hours": profile.daily_available_hours if profile else 3.5,
            "days_to_exam": days_to_exam_val
        },
        "metrics": {
            "resource_count": res_count,
            "assessments_completed": total_assessments,
            "average_mastery_percent": round(avg_p_l * 100, 1) if (avg_p_l is not None and total_assessments > 0) else None,
            "due_revisions_count": due_rev_count
        },
        "priority_focus": priority_focus,
        "at_risk_revisions": at_risk_revisions,
        "recent_assessments": [

            {
                "id": a.id,
                "title": a.title,
                "score": a.score,
                "total": a.total_questions,
                "percentage": a.percentage,
                "proficiency_tier": a.proficiency_tier,
                "latent_ability_theta": a.latent_ability_theta,
                "completed_at": a.completed_at
            }
            for a in recent_assessments
        ]
    }
