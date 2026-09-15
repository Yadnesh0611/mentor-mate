import logging
from typing import Dict, Any, List
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.models.assessment import Assessment, AssessmentItem, AssessmentResponse
from app.models.revision import RevisionItem
from app.models.knowledge import KnowledgeState, Concept
from app.models.resource import Resource
from app.models.conversation import Conversation, Message
from app.models.schedule import StudySchedule
from app.models.user import User, Profile

logger = logging.getLogger('mastery_service')

async def calculate_mastery(db: AsyncSession, user_id: str) -> float:
    """Calculate overall mastery score for a student (0-100%)."""
    perf = await calculate_comprehensive_performance(db, user_id)
    return perf["overall_mastery"]

async def calculate_comprehensive_performance(db: AsyncSession, user_id: str) -> Dict[str, Any]:
    """Calculate granular, real diagnostic and graphical performance metrics for the student."""
    # 1. Fetch User and Profile
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    prof_res = await db.execute(select(Profile).where(Profile.user_id == user_id))
    profile = prof_res.scalar_one_or_none()

    # 2. Assessments Performance
    ass_stmt = (
        select(Assessment)
        .where(Assessment.user_id == user_id, Assessment.status == 'completed')
        .order_by(Assessment.completed_at.asc())
    )
    assessments = (await db.execute(ass_stmt)).scalars().all()
    completed_assessments_count = len(assessments)

    ass_avg = 0.0
    recent_trend = []
    difficulty_breakdown = {"foundational": 0, "intermediate": 0, "advanced": 0, "adaptive": 0}

    if assessments:
        total_pct = sum(a.percentage or 0.0 for a in assessments)
        ass_avg = total_pct / completed_assessments_count
        for idx, a in enumerate(assessments):
            recent_trend.append({
                "index": idx + 1,
                "label": f"Quiz #{idx + 1}",
                "title": a.title,
                "percentage": round(a.percentage or 0.0, 1),
                "score": f"{a.score}/{a.total_questions}",
                "proficiency_tier": a.proficiency_tier or "Standard",
                "completed_at": a.completed_at.isoformat() if a.completed_at else None
            })
            mode = (a.difficulty_mode or "adaptive").lower()
            if mode in difficulty_breakdown:
                difficulty_breakdown[mode] += 1
            else:
                difficulty_breakdown["adaptive"] += 1

    # 3. Revision Retention Performance (Ebbinghaus Stability)
    rev_stmt = select(RevisionItem).where(RevisionItem.user_id == user_id)
    revisions = (await db.execute(rev_stmt)).scalars().all()
    total_revisions = len(revisions)

    scored_revisions = [r for r in revisions if r.last_score is not None]
    rev_avg = (sum(r.last_score for r in scored_revisions) / len(scored_revisions) * 100.0) if scored_revisions else 0.0

    retention_scores = [r.retention_estimate for r in revisions if r.retention_estimate is not None]
    avg_retention = (sum(retention_scores) / len(retention_scores) * 100.0) if retention_scores else 100.0

    revisions_breakdown = {
        "field_curriculum": sum(1 for r in revisions if r.revision_type == 'field_curriculum'),
        "study_material": sum(1 for r in revisions if r.revision_type == 'study_material'),
        "high_retention": sum(1 for r in revisions if (r.retention_estimate or 1.0) > 0.70),
        "at_risk": sum(1 for r in revisions if (r.retention_estimate or 1.0) <= 0.70)
    }

    # 4. Bayesian Knowledge Tracing & Concepts
    ks_stmt = (
        select(KnowledgeState, Concept)
        .join(Concept, KnowledgeState.concept_id == Concept.id)
        .where(KnowledgeState.user_id == user_id)
        .order_by(desc(KnowledgeState.p_l))
    )
    all_ks_rows = (await db.execute(ks_stmt)).all()
    
    # Filter out zero-attempt concepts from unrelated subjects if user has a defined field of study
    user_field_str = (user.field_of_study or (profile.goal if profile else "")).lower()
    ks_rows = []
    for ks, c in all_ks_rows:
        if ks.total_attempts and ks.total_attempts > 0:
            ks_rows.append((ks, c))
        elif not user_field_str or any(kw in (c.subject or "").lower() or kw in (c.topic or "").lower() or kw in c.name.lower() for kw in ["ai", "machine", "learning", "data", "cs", "computer", "code", "python", "java", "math", "calculus", "neural", "rag", "llm", "software", "engineering", user_field_str[:6]]):
            ks_rows.append((ks, c))

    total_concepts = len(ks_rows)
    mastered_concepts_count = sum(1 for ks, c in ks_rows if ks.p_l >= 0.75)
    in_progress_concepts_count = sum(1 for ks, c in ks_rows if 0.40 <= ks.p_l < 0.75)
    struggling_concepts_count = sum(1 for ks, c in ks_rows if ks.p_l < 0.40)

    concept_mastery_list = [
        {
            "concept_id": c.id,
            "concept_name": c.name,
            "topic": c.topic or c.subject or "General",
            "subject": c.subject or "Core",
            "mastery_percent": round(ks.p_l * 100, 1),
            "p_l": round(ks.p_l, 4),
            "uncertainty": round(ks.uncertainty or 0.1, 3),
            "total_attempts": ks.total_attempts or 0,
            "correct_attempts": ks.correct_attempts or 0,
            "status": "Mastered" if ks.p_l >= 0.75 else ("Developing" if ks.p_l >= 0.40 else "Needs Work")
        }
        for ks, c in ks_rows
    ]

    # 5. Study Notes & Resources Uploaded
    res_count = (await db.execute(select(func.count(Resource.id)).where(Resource.user_id == user_id))).scalar() or 0

    # 6. Mentor Study Sessions & Activity
    conv_stmt = select(func.count(Conversation.id)).where(Conversation.user_id == user_id)
    conv_count = (await db.execute(conv_stmt)).scalar() or 0

    sched_stmt = select(func.count(StudySchedule.id)).where(StudySchedule.user_id == user_id)
    sched_count = (await db.execute(sched_stmt)).scalar() or 0

    # 7. Overall Composite Mastery Calculation
    # Formula: Assessments (50%) + Revisions (25%) + Concept Mastery (15%) + Consistent Activity (10%)
    active_components = 0
    composite_sum = 0.0

    if completed_assessments_count > 0:
        composite_sum += ass_avg * 0.50
        active_components += 1
    if scored_revisions:
        composite_sum += rev_avg * 0.25
        active_components += 1
    elif total_revisions > 0:
        composite_sum += avg_retention * 0.20
        active_components += 1
    if total_concepts > 0:
        avg_concept_pl = (sum(ks.p_l for ks, c in ks_rows) / total_concepts) * 100.0
        composite_sum += avg_concept_pl * 0.15
        active_components += 1

    # Activity bonus up to 10%
    activity_score = min(10.0, (res_count * 2.0) + (conv_count * 1.5) + (sched_count * 2.0))
    composite_sum += activity_score

    overall_mastery = round(max(0.0, min(100.0, composite_sum)), 1)

    # 8. Proficiency Tier Classification
    if overall_mastery >= 85.0:
        tier = "Advanced Scholar"
        tier_description = "Demonstrating high retention and consistent problem-solving across core disciplines."
    elif overall_mastery >= 65.0:
        tier = "Solid Mastery"
        tier_description = "Good grasp of key curriculum units with targeted areas for active recall refinement."
    elif overall_mastery >= 40.0:
        tier = "Building Foundation"
        tier_description = "Actively developing core concept frameworks and test strategies."
    elif overall_mastery > 0.0 or res_count > 0 or total_revisions > 0:
        tier = "Getting Started"
        tier_description = "Materials registered. Begin practice quizzes and reviews to build your mastery curve."
    else:
        tier = "Fresh Horizon"
        tier_description = "Take your first practice quiz, generate smart reviews, or upload study notes to ignite real-time analytics."

    # If no BKT concepts exist yet, derive knowledge items from registered revision items & curriculum
    if not concept_mastery_list and (revisions or res_count > 0):
        derived_list = []
        for r in revisions:
            title = r.topic_title
            if not title and r.quick_summary:
                first_line = r.quick_summary.split('\n')[0].strip("- *# ")
                if first_line:
                    title = first_line[:40]
            if not title:
                title = "Field Curriculum Module"
            ret = round((r.retention_estimate or 1.0) * 100, 1)
            derived_list.append({
                "concept_id": r.id,
                "concept_name": title,
                "topic": "Active Recall Module",
                "subject": "Field Curriculum" if r.revision_type == 'field_curriculum' else "Study Material",
                "mastery_percent": ret,
                "p_l": round((r.retention_estimate or 1.0), 3),
                "uncertainty": 0.15,
                "total_attempts": r.review_count or 1,
                "correct_attempts": 1 if ret >= 70 else 0,
                "status": "Mastered" if ret >= 85 else ("Developing" if ret >= 50 else "Needs Work"),
                "source": "revision"
            })
        concept_mastery_list = derived_list

    # Radar / Domain Analysis
    subject_domains: Dict[str, List[float]] = {}
    for c_info in concept_mastery_list:
        sub = c_info["subject"]
        if sub not in subject_domains:
            subject_domains[sub] = []
        subject_domains[sub].append(c_info["mastery_percent"])

    domain_strengths = [
        {
            "domain": domain,
            "average_mastery": round(sum(scores) / len(scores), 1),
            "concept_count": len(scores)
        }
        for domain, scores in subject_domains.items()
    ]

    # Dynamic actionable recommendations
    recommendations = []
    if completed_assessments_count == 0:
        recommendations.append("Take your first adaptive practice quiz to benchmark your knowledge and ignite your Bayesian Knowledge Curve.")
    elif ass_avg < 70.0:
        recommendations.append("Focus on foundational quizzes to reinforce core concepts before attempting advanced tests.")
    else:
        recommendations.append("High assessment performance! Try advanced challenge modes to test complex edge cases.")

    if revisions_breakdown["at_risk"] > 0:
        recommendations.append(f"{revisions_breakdown['at_risk']} revision topic(s) have passed their memory decay curve — do a quick review now.")
    elif total_revisions == 0:
        recommendations.append("Generate flashcards and mindmaps in the Revision tab to reinforce key definitions.")
    else:
        recommendations.append("Your memory retention stability is optimal! Continue spaced repetitions to lock in long-term retention.")

    if sched_count == 0:
        recommendations.append("Create an AI study schedule in the Schedule tab to structure your weekly goals.")

    final_concepts_tracked = total_concepts if total_concepts > 0 else len(concept_mastery_list)
    final_mastered_concepts = mastered_concepts_count if total_concepts > 0 else sum(1 for c in concept_mastery_list if c["mastery_percent"] >= 85)

    return {
        "overall_mastery": overall_mastery,
        "proficiency_tier": tier,
        "tier_description": tier_description,
        "student": {
            "name": profile.name if profile else (user.email.split('@')[0] if user else "Student"),
            "field_of_study": user.field_of_study or (profile.goal if profile else "General Engineering"),
            "streak_days": profile.streak_days if profile else 1,
            "daily_hours": profile.daily_available_hours if profile else 3.5
        },
        "stats": {
            "assessments_completed": completed_assessments_count,
            "assessments_average_percent": round(ass_avg, 1),
            "revisions_count": total_revisions,
            "average_retention_percent": round(avg_retention, 1),
            "concepts_tracked": final_concepts_tracked,
            "mastered_concepts": final_mastered_concepts,
            "in_progress_concepts": in_progress_concepts_count,
            "struggling_concepts": struggling_concepts_count,
            "resources_uploaded": res_count,
            "mentor_conversations": conv_count,
            "schedules_created": sched_count
        },
        "assessment_trend": recent_trend,
        "difficulty_breakdown": difficulty_breakdown,
        "revisions_breakdown": revisions_breakdown,
        "concepts": concept_mastery_list,
        "domain_strengths": domain_strengths,
        "recommendations": recommendations
    }

