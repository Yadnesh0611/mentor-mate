from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.wellbeing import WellbeingCheckIn

router = APIRouter(prefix="/wellbeing", tags=["Student Mental Well-Being & Burnout Shield"])

class WellbeingCheckInRequest(BaseModel):
    state: str = Field(..., description="'energized' | 'focused' | 'overwhelmed' | 'exhausted'")
    stress_level: float = Field(default=2.0, ge=1.0, le=5.0)
    sleep_hours: Optional[float] = Field(default=None, ge=0.0, le=24.0)
    notes: Optional[str] = None

class WellbeingCheckInResponse(BaseModel):
    id: str
    state: str
    stress_level: float
    sleep_hours: Optional[float]
    burnout_risk: str
    recommended_schedule_mode: str
    pacing_advice: str
    created_at: datetime

VERIFIED_HELPLINES = [
    {
        "name": "Tele-MANAS (National Tele Mental Health Programme)",
        "agency": "Ministry of Health & Family Welfare, Govt. of India",
        "contact": "14416 / 1800-891-4416",
        "availability": "24x7, Free, Confidential",
        "languages": "20+ Indian Languages",
        "description": "Comprehensive psychological support and mental health counseling across India."
    },
    {
        "name": "KIRAN Mental Health Helpline",
        "agency": "Ministry of Social Justice & Empowerment",
        "contact": "1800-599-0019",
        "availability": "24x7, Toll-Free",
        "languages": "13 Languages (English, Hindi, Telugu, Tamil, Marathi, etc.)",
        "description": "Early screening, first-aid, psychological support, and distress management."
    },
    {
        "name": "Vandrevala Foundation for Mental Health",
        "agency": "Vandrevala Foundation",
        "contact": "+91 9999 666 555",
        "availability": "24x7 Free Counseling",
        "languages": "English, Hindi & Major Regional Languages",
        "description": "Dedicated clinical counseling for academic anxiety, burnout, and depression."
    },
    {
        "name": "NIMHANS Student & Youth Psychosocial Support",
        "agency": "National Institute of Mental Health and Neuro-Sciences",
        "contact": "080-46110007",
        "availability": "Standard Support Hours",
        "languages": "English, Hindi, Kannada",
        "description": "Premier institute guidance on cognitive fatigue, panic, and study burnout."
    }
]

NEUROBIOLOGY_RESETS = [
    {
        "id": "physiological_sigh",
        "title": "Physiological Sigh (Cyclic Sighing)",
        "duration_seconds": 90,
        "mechanism": "Stanford Neurobiology (Huberman Lab, 2023): Two quick inhales through nose followed by a slow, extended exhale through mouth rapidly offloads carbon dioxide and triggers parasympathetic vagal nerve calming.",
        "steps": [
            "1. Deep inhale through your nose filling 80% capacity.",
            "2. Sharp top-off second inhale to pop open collapsed alveoli.",
            "3. Slow, steady, relaxed mouth exhale until empty (4-6 seconds).",
            "4. Repeat 3 to 5 times."
        ]
    },
    {
        "id": "box_breathing",
        "title": "Box Breathing (4-4-4-4 Pacing)",
        "duration_seconds": 120,
        "mechanism": "Autonomic nervous system stabilization used by aerospace pilots and medical residents to break acute test anxiety and cognitive freeze.",
        "steps": [
            "1. Inhale slowly for 4 seconds.",
            "2. Hold air gently for 4 seconds.",
            "3. Exhale smoothly for 4 seconds.",
            "4. Hold empty for 4 seconds.",
            "5. Repeat 4 continuous cycles."
        ]
    }
]

@router.post("/checkin", response_model=WellbeingCheckInResponse)
async def submit_checkin(
    req: WellbeingCheckInRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    clean_state = req.state.lower().strip()
    if clean_state not in ["energized", "focused", "overwhelmed", "exhausted"]:
        clean_state = "focused"

    # Burnout risk determination
    if clean_state in ["overwhelmed", "exhausted"] or req.stress_level >= 4.0:
        burnout_risk = "high"
        schedule_mode = "compressed"
        pacing_advice = (
            "Your energy level indicates high cognitive load. Mentor Mate has compressed your study plan: "
            "focus solely on 2 essential spaced review concepts today. Take a 15-minute screen-free break."
        )
    elif req.stress_level >= 3.0 or clean_state == "overwhelmed":
        burnout_risk = "moderate"
        schedule_mode = "balanced"
        pacing_advice = (
            "Moderate fatigue detected. Maintain steady 25-minute Pomodoro sessions with mandatory 5-minute pauses."
        )
    else:
        burnout_risk = "low"
        schedule_mode = "standard"
        pacing_advice = "Cognitive state is optimal. Great window for tackling deep reasoning concepts and diagnostic challenges."

    entry = WellbeingCheckIn(
        user_id=user.id,
        state=clean_state,
        stress_level=req.stress_level,
        sleep_hours=req.sleep_hours,
        notes=req.notes,
        burnout_risk=burnout_risk
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    return WellbeingCheckInResponse(
        id=entry.id,
        state=entry.state,
        stress_level=entry.stress_level,
        sleep_hours=entry.sleep_hours,
        burnout_risk=entry.burnout_risk,
        recommended_schedule_mode=schedule_mode,
        pacing_advice=pacing_advice,
        created_at=entry.created_at
    )

@router.get("/status")
async def get_wellbeing_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(WellbeingCheckIn)
        .where(WellbeingCheckIn.user_id == user.id)
        .order_by(desc(WellbeingCheckIn.created_at))
        .limit(7)
    )
    res = await db.execute(stmt)
    history = res.scalars().all()

    latest = history[0] if history else None
    
    current_state = latest.state if latest else "focused"
    burnout_risk = latest.burnout_risk if latest else "low"
    stress_level = latest.stress_level if latest else 2.0

    return {
        "latest_checkin": {
            "state": current_state,
            "burnout_risk": burnout_risk,
            "stress_level": stress_level,
            "sleep_hours": latest.sleep_hours if latest else None,
            "created_at": latest.created_at if latest else None
        } if latest else None,
        "history_count": len(history),
        "recent_states": [h.state for h in history],
        "burnout_risk": burnout_risk,
        "active_pacing_strategy": "compressed" if burnout_risk == "high" else "standard",
        "emergency_disclaimer": "Mentor Mate offers cognitive study pacing tools and evidence-based relaxation guides. It is not medical treatment. If you feel severe distress, reach out to institutional counseling or Tele-MANAS."
    }

@router.get("/emergency-resources")
async def get_emergency_resources():
    return {
        "verified_helplines": VERIFIED_HELPLINES,
        "neurobiology_resets": NEUROBIOLOGY_RESETS,
        "campus_advisory": "Exam pressure and syllabus backlogs are common at premier institutions like BITS, IITs, and NITs. Prioritize sleep and active emotional regulation over all-nighters."
    }
