from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.schedule_service import generate_schedule
from app.models.schedule import StudySchedule
from datetime import datetime, timezone

router = APIRouter(prefix="/schedule", tags=["Study Schedule"])

class ScheduleGenerateRequest(BaseModel):
    mode: str = "general"  # 'resource' or 'general'
    time_range: str = "1_week"  # '3_days', '1_week', '2_weeks', '1_month'
    field_of_study: Optional[str] = None  # e.g., 'Artificial Intelligence & Machine Learning (AIML)'

@router.get("/latest")
async def get_latest_schedule(
    mode: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve the student's latest stored schedule from database so it never disappears on page refresh or tab switch."""
    stmt = select(StudySchedule).where(StudySchedule.user_id == current_user.id)
    if mode:
        stmt = stmt.where(StudySchedule.mode == mode)
    stmt = stmt.order_by(desc(StudySchedule.created_at))

    result = await db.execute(stmt)
    schedule_entry = result.scalars().first()

    if not schedule_entry:
        return {"has_schedule": False, "schedule": None}

    return {
        "has_schedule": True,
        "schedule_id": schedule_entry.id,
        "mode": schedule_entry.mode,
        "time_range": schedule_entry.time_range,
        "field_of_study": schedule_entry.field_of_study,
        "title": schedule_entry.title,
        "created_at": schedule_entry.created_at.isoformat() if schedule_entry.created_at else None,
        "schedule": schedule_entry.plan_json
    }

@router.get("/all")
async def list_all_schedules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all saved schedules in history for this student."""
    stmt = select(StudySchedule).where(StudySchedule.user_id == current_user.id).order_by(desc(StudySchedule.created_at))
    result = await db.execute(stmt)
    schedules = result.scalars().all()

    return [
        {
            "id": s.id,
            "mode": s.mode,
            "time_range": s.time_range,
            "field_of_study": s.field_of_study,
            "title": s.title,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "total_days": s.plan_json.get("total_days") if isinstance(s.plan_json, dict) else None,
            "schedule": s.plan_json
        }
        for s in schedules
    ]

@router.post("/generate")
async def generate_and_save_schedule(
    req: ScheduleGenerateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a fresh AI schedule and persistently store it into database."""
    if req.mode not in ["resource", "general"]:
        raise HTTPException(status_code=400, detail="Mode must be either 'resource' or 'general'")

    # Generate plan using AI service & real student diagnostics
    schedule_dict = await generate_schedule(
        db=db,
        user_id=current_user.id,
        mode=req.mode,
        time_range=req.time_range,
        field_of_study=req.field_of_study
    )

    # Persist into DB so it never disappears
    title = schedule_dict.get("title") or f"{req.field_of_study or current_user.field_of_study or 'Study'} Schedule"
    field = req.field_of_study or schedule_dict.get("field_of_study") or current_user.field_of_study

    # Update user's field_of_study if specified
    if req.field_of_study:
        current_user.field_of_study = req.field_of_study
        db.add(current_user)

    new_schedule = StudySchedule(
        user_id=current_user.id,
        mode=req.mode,
        time_range=req.time_range,
        field_of_study=field,
        title=title,
        plan_json=schedule_dict,
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_schedule)
    await db.commit()
    await db.refresh(new_schedule)

    return {
        "schedule_id": new_schedule.id,
        "mode": new_schedule.mode,
        "time_range": new_schedule.time_range,
        "field_of_study": new_schedule.field_of_study,
        "title": new_schedule.title,
        "created_at": new_schedule.created_at.isoformat() if new_schedule.created_at else None,
        "schedule": schedule_dict
    }

@router.delete("/{schedule_id}")
async def delete_schedule(
    schedule_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a saved schedule."""
    stmt = select(StudySchedule).where(StudySchedule.id == schedule_id, StudySchedule.user_id == current_user.id)
    result = await db.execute(stmt)
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")

    await db.delete(schedule)
    await db.commit()
    return {"success": True, "message": "Schedule deleted successfully"}

