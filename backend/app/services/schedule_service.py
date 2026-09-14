import json
import logging
import re
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.resource import Resource, ResourceChunk
from app.models.revision import RevisionItem
from app.models.assessment import Assessment, AssessmentResponse, AssessmentItem
from app.models.knowledge import KnowledgeState, Concept
from app.models.user import User, Profile
from app.services.ai_service import ai_service, ModelRole

logger = logging.getLogger('schedule_service')

TIME_RANGE_LABELS = {
    '3_days': '3 Days (Intensive Sprint)',
    '1_week': '1 Week (7-Day Plan)',
    '2_weeks': '2 Weeks (14-Day Roadmap)',
    '1_month': '1 Month (30-Day Milestone)'
}

TIME_RANGE_DAYS = {
    '3_days': 3,
    '1_week': 7,
    '2_weeks': 14,
    '1_month': 30
}

async def generate_schedule(
    db: AsyncSession,
    user_id: str,
    mode: str,
    time_range: str = '1_week',
    field_of_study: str = None
) -> dict:
    """Generate an AI-driven, non-hardcoded study schedule tailored to student diagnostics.
    mode: 'resource' (based on uploaded notes/resources) or 'general' (based on student goal/field of study).
    time_range: '3_days', '1_week', '2_weeks', '1_month'
    """
    num_days = TIME_RANGE_DAYS.get(time_range, 7)
    time_label = TIME_RANGE_LABELS.get(time_range, f"{num_days} Days")

    # 1. Fetch user & profile
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one_or_none()
    if not user:
        raise ValueError('User not found')

    prof_res = await db.execute(select(Profile).where(Profile.user_id == user_id))
    profile = prof_res.scalar_one_or_none()

    # Determine field of study / goal
    student_field = field_of_study or user.field_of_study or (profile.goal if profile else 'Computer Science / Engineering')

    # 2. Gather student monitoring & diagnostic data
    # (a) Weak topics from Revision items
    rev_res = await db.execute(
        select(RevisionItem.topic_title, RevisionItem.last_score)
        .where(RevisionItem.user_id == user_id)
        .order_by(RevisionItem.last_score.asc().nulls_first())
    )
    rev_rows = rev_res.fetchall()
    weak_revision_topics = []
    for r in rev_rows:
        topic_name = r.topic_title or "Core Curriculum Concept"
        if r.last_score is not None:
            weak_revision_topics.append(f"{topic_name} (score: {int(r.last_score * 100)}%)")
        else:
            weak_revision_topics.append(str(topic_name))
    weak_revision_topics = [t for t in weak_revision_topics if t][:8]

    # (b) Diagnostic assessment mistakes & low scores
    assess_res = await db.execute(
        select(Assessment.title, Assessment.percentage, Assessment.proficiency_tier)
        .where(Assessment.user_id == user_id, Assessment.status == 'completed')
        .order_by(Assessment.percentage.asc())
        .limit(5)
    )
    recent_assessments = [
        f"{a.title or 'Quiz'} ({int(a.percentage or 0)}% - {a.proficiency_tier or 'Standard'})"
        for a in assess_res.fetchall() if a
    ]

    # (c) Concept mastery from Bayesian Knowledge Tracing
    kt_res = await db.execute(
        select(Concept.name, KnowledgeState.p_l)
        .join(Concept, KnowledgeState.concept_id == Concept.id)
        .where(KnowledgeState.user_id == user_id)
        .order_by(KnowledgeState.p_l.asc())
        .limit(6)
    )
    low_mastery_concepts = [
        f"{row.name or 'Concept'} (Mastery P(L): {round(row.p_l or 0.0, 2)})"
        for row in kt_res.fetchall() if row and (row.p_l is None or row.p_l < 0.6)
    ]

    # 3. Gather resources (for resource mode or as context)
    res_list = await db.execute(
        select(Resource.id, Resource.title, Resource.subject, Resource.file_type, Resource.extracted_summary)
        .where(Resource.user_id == user_id)
    )
    all_resources = res_list.fetchall()
    resource_summaries = []
    for r in all_resources:
        snippet = f"- {r.title} [{r.subject}, {r.file_type}]"
        if r.extracted_summary:
            clean_sum = r.extracted_summary[:160].replace('\n', ' ')
            snippet += f": {clean_sum}..."
        resource_summaries.append(snippet)

    # 4. Build AI prompt
    daily_hours = profile.daily_available_hours if profile and profile.daily_available_hours else 3.0

    if mode == 'resource':
        if not resource_summaries:
            context_block = "The student has not uploaded any study notes yet. Base the schedule on core fundamental topics in their field of study while reminding them to upload their syllabi or class notes."
        else:
            context_block = "UPLOADED STUDENT RESOURCES:\n" + "\n".join(resource_summaries[:10])
        mode_instruction = f"""
Mode: RESOURCE-DRIVEN STUDY SCHEDULE.
You MUST prioritize and schedule concrete study sessions directly covering the topics and chapters from the student's uploaded resources listed above.
Allocate specific chapters/subtopics across the {num_days} days.
"""
    else:
        context_block = f"STUDENT FIELD OF STUDY / GOAL: {student_field}\n"
        mode_instruction = f"""
Mode: GENERAL CURRICULUM & FIELD ROADMAP.
The student is specializing in '{student_field}'. Create a structured, logically sequenced, practical learning schedule covering essential foundations, advanced architectures, and hands-on drills for {student_field} over {num_days} days.
"""

    diagnostics_block = f"""
STUDENT PERFORMANCE & DIAGNOSTICS:
- Daily Available Study Time: {daily_hours} hours/day
- Topics Requiring Immediate Reinforcement (Low Revision Scores): {', '.join(weak_revision_topics) if weak_revision_topics else 'None recorded yet (fresh start)'}
- Low Mastery Concepts: {', '.join(low_mastery_concepts) if low_mastery_concepts else 'None recorded yet'}
- Recent Test Diagnostics: {', '.join(recent_assessments) if recent_assessments else 'No tests completed yet'}
"""

    system_prompt = f"""
You are the Lead Academic Strategy AI for Mentor Mate.
Your mission is to generate a realistic, high-impact study schedule for a student over a span of {num_days} days ({time_label}).

{mode_instruction}
{context_block}
{diagnostics_block}

RULES:
1. Generate EXACTLY {num_days} day items (Day 1 to Day {num_days}).
2. Provide a clear 'title' and 'summary' highlighting how this plan addresses their strengths and targets their weaknesses.
3. For each day, include:
   - 'day_number': integer (1 to {num_days})
   - 'day_label': string (e.g. "Day 1: Foundations & Core Concepts")
   - 'focus_area': string (the primary topic for that day)
   - 'estimated_hours': number (around {daily_hours} hrs)
   - 'tasks': array of 3 to 4 actionable objects with:
       - 'task_title': string
       - 'task_type': one of ["Study", "Revision", "Practice", "Project", "Deep Dive"]
       - 'duration_minutes': integer
       - 'details': string explaining what specifically to learn or solve
4. Explicitly weave in spaced review for the student's identified weak topics so they retain difficult concepts.
5. You MUST return ONLY a valid, parseable JSON object matching this schema without any markdown commentary outside the JSON:

{{
  "title": "{student_field if mode == 'general' else 'Resource-Based'} Study Schedule ({time_label})",
  "mode": "{mode}",
  "time_range": "{time_range}",
  "total_days": {num_days},
  "field_of_study": "{student_field}",
  "summary": "2-3 sentence overview of this custom strategic plan",
  "days": [
    {{
      "day_number": 1,
      "day_label": "Day 1: ...",
      "focus_area": "...",
      "estimated_hours": {daily_hours},
      "tasks": [
        {{
          "task_title": "...",
          "task_type": "Study",
          "duration_minutes": 60,
          "details": "..."
        }}
      ]
    }}
  ]
}}
"""

    try:
        response = await ai_service.generate_chat(
            messages=[
                {"role": "system", "content": "You are a master academic curriculum planner. Output purely valid JSON."},
                {"role": "user", "content": system_prompt}
            ],
            role=ModelRole.RESOURCE_SYNTHESIS,
            temperature=0.3,
        )

        schedule_data = None
        # Try finding JSON block
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            try:
                schedule_data = json.loads(json_match.group(0))
            except Exception as pe:
                logger.warning(f"Regex json parse failed: {pe}")

        if not schedule_data:
            # Fallback to direct json loads
            schedule_data = json.loads(response)

        # Ensure required keys exist
        if "days" not in schedule_data or not isinstance(schedule_data["days"], list):
            raise ValueError("Invalid days array in schedule JSON")

        schedule_data["mode"] = mode
        schedule_data["time_range"] = time_range
        schedule_data["field_of_study"] = student_field
        if "title" not in schedule_data:
            schedule_data["title"] = f"{student_field} Study Plan ({time_label})"

        return schedule_data

    except Exception as e:
        logger.error(f"AI schedule generation failed: {e}. Generating structured fallback plan based on diagnostics.")
        # Create a reliable fallback structure using student real data so user is never blocked
        fallback_days = []
        for d in range(1, num_days + 1):
            if mode == 'resource' and resource_summaries:
                res_idx = (d - 1) % len(resource_summaries)
                day_focus = all_resources[res_idx].title if all_resources else f"{student_field} Core Concepts"
            else:
                day_focus = weak_revision_topics[(d - 1) % len(weak_revision_topics)] if weak_revision_topics else f"{student_field} Module {d}"

            fallback_days.append({
                "day_number": d,
                "day_label": f"Day {d}: {day_focus}",
                "focus_area": day_focus,
                "estimated_hours": daily_hours,
                "tasks": [
                    {
                        "task_title": f"Deep Dive: {day_focus}",
                        "task_type": "Study",
                        "duration_minutes": 60,
                        "details": f"Review core theories, definitions, and applications related to {day_focus}."
                    },
                    {
                        "task_title": "Concept Drill & Problem Solving",
                        "task_type": "Practice",
                        "duration_minutes": 45,
                        "details": "Solve end-of-chapter problems or practical implementation exercises."
                    },
                    {
                        "task_title": "Active Recall & Flashcard Review",
                        "task_type": "Revision",
                        "duration_minutes": 30,
                        "details": "Test memory on formulas, algorithms, and key principles to reinforce retention."
                    }
                ]
            })

        return {
            "title": f"{student_field} Strategic Plan ({time_label})",
            "mode": mode,
            "time_range": time_range,
            "total_days": num_days,
            "field_of_study": student_field,
            "summary": f"A comprehensive {num_days}-day study roadmap configured for {student_field}, focusing on persistent retention and targeted practice.",
            "days": fallback_days
        }

