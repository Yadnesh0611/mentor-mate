from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.user import User
from app.services.mastery_service import calculate_mastery, calculate_comprehensive_performance
from app.api.deps import get_current_user

router = APIRouter()

@router.get("/mastery/performance", response_model=dict)
async def get_my_performance(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve comprehensive real-time performance analytics for the authenticated student."""
    return await calculate_comprehensive_performance(db, current_user.id)

@router.get("/students/{user_id}/performance", response_model=dict)
async def get_student_performance(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve comprehensive performance analytics for a given student ID."""
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return await calculate_comprehensive_performance(db, user_id)

@router.get("/students/{user_id}/mastery", response_model=dict)
async def get_mastery(user_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Users can only fetch their own mastery
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    result = await db.execute(
        "SELECT mastery_score FROM users WHERE id = :uid",
        {"uid": user_id}
    )
    mastery = result.scalar_one_or_none()
    if mastery is None:
        raise HTTPException(status_code=404, detail="User not found")
    return {"mastery_score": mastery}

@router.post("/students/{user_id}/mastery/recalculate", response_model=dict)
async def recalculate_mastery(user_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    new_score = await calculate_mastery(db, user_id)
    await db.execute(
        "UPDATE users SET mastery_score = :score WHERE id = :uid",
        {"score": new_score, "uid": user_id}
    )
    await db.commit()
    return {"mastery_score": new_score}

