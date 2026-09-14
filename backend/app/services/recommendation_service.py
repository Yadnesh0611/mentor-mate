from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone
from app.models.knowledge import KnowledgeState, Concept
from app.models.revision import RevisionItem
from app.models.user import Profile
from app.models.resource import Resource
from app.models.assessment import Assessment

class RecommendationService:
    async def get_next_priority_focus(
        self,
        db: AsyncSession,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        # Fetch profile to identify student's chosen field/goal
        prof_stmt = select(Profile).where(Profile.user_id == user_id)
        prof_res = await db.execute(prof_stmt)
        profile = prof_res.scalar_one_or_none()
        field_name = profile.goal if profile and profile.goal else (profile.education_tier if profile else "your coursework")

        # 1. Flow Step 1: Check if user has completed ANY assessments
        ass_count_stmt = select(func.count(Assessment.id)).where(
            Assessment.user_id == user_id,
            Assessment.status == "completed"
        )
        ass_count = (await db.execute(ass_count_stmt)).scalar() or 0

        if ass_count == 0:
            return {
                "title": f"Take Diagnostic Quiz",
                "concept_name": f"Initial Baseline Quiz ({field_name})",
                "subject": "Diagnostic",
                "topic": field_name,
                "urgency": "High",
                "action": "assessments",
                "reason": f"Start by taking a quick diagnostic quiz in {field_name} to gauge your baseline strengths and identify topics to focus on.",
                "recommended_action": "Start Diagnostic Quiz"
            }

        # 2. Flow Step 2: If test taken but no course materials uploaded yet
        res_count_stmt = select(func.count(Resource.id)).where(Resource.user_id == user_id)
        res_count = (await db.execute(res_count_stmt)).scalar() or 0

        if res_count == 0:
            return {
                "title": "Upload Your Course Materials",
                "concept_name": "Course Notes & Syllabus",
                "subject": "Coursework",
                "topic": "Study Materials",
                "urgency": "Medium",
                "action": "resources",
                "reason": f"Upload your syllabus, lecture slides, or chapter notes so Mentor Mate can tailor practice questions and citations to your exact curriculum.",
                "recommended_action": "Upload Notes"
            }

        # 3. Flow Step 3: Check for critical decaying revision items
        rev_stmt = (
            select(RevisionItem, Concept)
            .join(Concept, RevisionItem.concept_id == Concept.id)
            .where(RevisionItem.user_id == user_id)
            .order_by(RevisionItem.retention_estimate.asc())
            .limit(1)
        )
        rev_res = await db.execute(rev_stmt)
        rev_row = rev_res.first()

        if rev_row and rev_row[0].retention_estimate < 0.75:
            rev_item, concept = rev_row
            return {
                "title": f"Review {concept.name}",
                "concept_name": concept.name,
                "subject": concept.subject,
                "topic": concept.topic,
                "urgency": "High",
                "action": "review",
                "estimated_retention": round(rev_item.retention_estimate * 100, 1),
                "reason": f"It's time to review {concept.name}. A quick refresher will keep it fresh in your memory.",
                "recommended_action": "Start Review"
            }

        # 4. Flow Step 4: Check for lowest mastery concept where the student has actually attempted questions
        ks_stmt = (
            select(KnowledgeState, Concept)
            .join(Concept, KnowledgeState.concept_id == Concept.id)
            .where(
                KnowledgeState.user_id == user_id,
                KnowledgeState.total_attempts > 0
            )
            .order_by(KnowledgeState.p_l.asc())
            .limit(1)
        )
        ks_res = await db.execute(ks_stmt)
        ks_row = ks_res.first()

        if ks_row:
            ks, concept = ks_row
            pct = round(ks.p_l * 100, 1)
            return {
                "title": f"Practice {concept.name}",
                "concept_name": concept.name,
                "subject": concept.subject,
                "topic": concept.topic,
                "urgency": "Medium",
                "action": "assessments",
                "estimated_mastery": pct,
                "reason": f"Your understanding of {concept.name} is currently at {pct}%. Take a quick practice quiz to strengthen this topic.",
                "recommended_action": "Take Practice Quiz"
            }

        # 5. Flow Step 5: All caught up
        return {
            "title": "Explore Course Notes or Ask Mentor",
            "concept_name": "Keep Learning",
            "subject": "General",
            "topic": "Study Space",
            "urgency": "Low",
            "action": "mentor",
            "reason": "All caught up! Ask your Study Mentor about tricky problems or upload additional notes to keep expanding your knowledge.",
            "recommended_action": "Ask Study Mentor"
        }

recommendation_service = RecommendationService()
