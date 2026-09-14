import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.models.user import User
from app.models.course import Course
from app.api.deps import get_current_user
from app.services.course_service import (
    check_course_readiness,
    generate_personalized_course,
    fetch_open_source_courses,
)

logger = logging.getLogger("courses_api")
router = APIRouter(prefix="/courses", tags=["Courses"])

class PersonalizedCourseGenerateRequest(BaseModel):
    custom_focus: Optional[str] = None

@router.get("/readiness", response_model=Dict[str, Any])
async def get_readiness(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Checks whether the student has met the diagnostic requirements for a personalized course."""
    return await check_course_readiness(db, current_user.id)

@router.get("/personalized", response_model=List[Dict[str, Any]])
async def list_personalized_courses(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all personalized courses generated and saved for this student."""
    stmt = (
        select(Course)
        .where(Course.user_id == current_user.id, Course.course_type == 'personalized')
        .order_by(desc(Course.created_at))
    )
    result = await db.execute(stmt)
    courses = result.scalars().all()
    return [
        {
            "id": c.id,
            "title": c.title,
            "field_of_study": c.field_of_study,
            "description": c.description,
            "level": c.level,
            "estimated_hours": c.estimated_hours,
            "modules": c.modules,
            "weak_areas_addressed": c.weak_areas_addressed,
            "data_sources_used": c.data_sources_used,
            "prerequisites": c.prerequisites,
            "status": c.status,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in courses
    ]

@router.post("/personalized/generate", response_model=Dict[str, Any])
async def generate_course(
    req: Optional[PersonalizedCourseGenerateRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Synthesize and persistently store a custom course for the student
    tailored to their specific misconceptions, weak BKT concepts, and syllabus notes.
    """
    try:
        custom_focus = req.custom_focus if req else None
        course = await generate_personalized_course(db, current_user.id, custom_focus)
        return {
            "id": course.id,
            "title": course.title,
            "field_of_study": course.field_of_study,
            "description": course.description,
            "level": course.level,
            "estimated_hours": course.estimated_hours,
            "modules": course.modules,
            "weak_areas_addressed": course.weak_areas_addressed,
            "data_sources_used": course.data_sources_used,
            "prerequisites": course.prerequisites,
            "status": course.status,
            "created_at": course.created_at.isoformat() if course.created_at else None,
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error generating personalized course: {e}")
        raise HTTPException(status_code=500, detail="Failed to synthesize personalized course.")

@router.get("/open-source", response_model=List[Dict[str, Any]])
async def get_open_source_courses(
    force_refresh: bool = Query(False),
    field_of_study: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve verified open-source courses and GitHub repositories tailored to student's field of study."""
    target_field = field_of_study or current_user.field_of_study or "Artificial Intelligence & Machine Learning (AIML)"
    return await fetch_open_source_courses(db, target_field, force_refresh)

@router.post("/open-source/sync", response_model=List[Dict[str, Any]])
async def sync_open_source_courses(
    field_of_study: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Force re-fetch and refresh live GitHub repositories for the student's field."""
    target_field = field_of_study or current_user.field_of_study or "Artificial Intelligence & Machine Learning (AIML)"
    return await fetch_open_source_courses(db, target_field, force_refresh=True)

@router.get("/{course_id}", response_model=Dict[str, Any])
async def get_course_details(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Fetch details of a single course."""
    stmt = select(Course).where(Course.id == course_id)
    course = (await db.execute(stmt)).scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.course_type == 'personalized' and course.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    return {
        "id": course.id,
        "course_type": course.course_type,
        "title": course.title,
        "field_of_study": course.field_of_study,
        "description": course.description,
        "level": course.level,
        "estimated_hours": course.estimated_hours,
        "modules": course.modules,
        "weak_areas_addressed": course.weak_areas_addressed,
        "data_sources_used": course.data_sources_used,
        "prerequisites": course.prerequisites,
        "external_url": course.external_url,
        "github_stars": course.github_stars,
        "source_platform": course.source_platform,
        "tags": course.tags,
        "status": course.status,
        "created_at": course.created_at.isoformat() if course.created_at else None,
    }

@router.delete("/{course_id}", response_model=Dict[str, Any])
async def delete_course(
    course_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a personalized course."""
    stmt = select(Course).where(Course.id == course_id)
    course = (await db.execute(stmt)).scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")

    await db.delete(course)
    await db.commit()
    return {"success": True, "message": "Course deleted successfully"}

@router.patch("/{course_id}/lessons/{lesson_id}/toggle", response_model=Dict[str, Any])
async def toggle_lesson(
    course_id: str,
    lesson_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle completion status for a lesson."""
    from app.services.course_service import toggle_lesson_completion
    try:
        updated = await toggle_lesson_completion(db, course_id, lesson_id, current_user.id)
        return {
            "id": updated.id,
            "title": updated.title,
            "field_of_study": updated.field_of_study,
            "description": updated.description,
            "level": updated.level,
            "estimated_hours": updated.estimated_hours,
            "modules": updated.modules,
            "weak_areas_addressed": updated.weak_areas_addressed,
            "data_sources_used": updated.data_sources_used,
            "prerequisites": updated.prerequisites,
            "status": updated.status,
            "created_at": updated.created_at.isoformat() if updated.created_at else None,
        }
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
