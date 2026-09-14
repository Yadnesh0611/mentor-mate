from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User, Profile
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserOut, ProfileOut, ProfileUpdate
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
async def register(req: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check duplicate
    stmt = select(User).where(User.email == req.email.lower().strip())
    existing = await db.execute(stmt)
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    user = User(
        email=req.email.lower().strip(),
        hashed_password=get_password_hash(req.password),
        role="student"
    )
    db.add(user)
    await db.flush()

    profile = Profile(
        user_id=user.id,
        name=req.name.strip(),
        education_tier=req.education_tier,
        board_or_university=req.board_or_university,
        goal=req.goal,
        target_year=req.target_year,
        daily_available_hours=req.daily_available_hours
    )
    db.add(profile)
    await db.commit()
    await db.refresh(user)
    await db.refresh(profile)

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut(id=user.id, email=user.email, role=user.role),
        profile=ProfileOut(
            id=profile.id,
            user_id=profile.user_id,
            name=profile.name,
            education_tier=profile.education_tier,
            board_or_university=profile.board_or_university,
            goal=profile.goal,
            target_year=profile.target_year,
            daily_available_hours=profile.daily_available_hours,
            days_to_exam=profile.days_to_exam,
            streak_days=profile.streak_days,
            dark_mode=profile.dark_mode
        )
    )

@router.post("/login", response_model=TokenResponse)
async def login(req: UserLogin, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == req.email.lower().strip())
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    stmt_prof = select(Profile).where(Profile.user_id == user.id)
    prof_res = await db.execute(stmt_prof)
    profile = prof_res.scalar_one_or_none()

    if not profile:
        profile = Profile(
            user_id=user.id,
            name=user.email.split("@")[0].capitalize()
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut(id=user.id, email=user.email, role=user.role),
        profile=ProfileOut(
            id=profile.id,
            user_id=profile.user_id,
            name=profile.name,
            education_tier=profile.education_tier,
            board_or_university=profile.board_or_university,
            goal=profile.goal,
            target_year=profile.target_year,
            daily_available_hours=profile.daily_available_hours,
            days_to_exam=profile.days_to_exam,
            streak_days=profile.streak_days,
            dark_mode=profile.dark_mode
        )
    )

@router.get("/me")
async def get_me(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(Profile).where(Profile.user_id == user.id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    return {
        "user": {"id": user.id, "email": user.email, "role": user.role},
        "profile": {
            "name": profile.name if profile else "Student",
            "education_tier": profile.education_tier if profile else "Class 10 (10th Boards)",
            "board": profile.board_or_university if profile else "CBSE",
            "goal": profile.goal if profile else "10th Boards (CBSE)",
            "target_year": profile.target_year if profile else 2026,
            "daily_available_hours": profile.daily_available_hours if profile else 3.5,
            "days_to_exam": profile.days_to_exam if profile else 118,
            "streak_days": profile.streak_days if profile else 1,
            "dark_mode": profile.dark_mode if profile else True
        }
    }

@router.put("/profile")
async def update_profile(
    req: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Profile).where(Profile.user_id == user.id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if req.name is not None:
        profile.name = req.name.strip()
    if req.education_tier is not None:
        profile.education_tier = req.education_tier
    if req.board_or_university is not None:
        profile.board_or_university = req.board_or_university
    if req.goal is not None:
        profile.goal = req.goal
    if req.daily_available_hours is not None:
        profile.daily_available_hours = req.daily_available_hours
    if req.days_to_exam is not None:
        profile.days_to_exam = req.days_to_exam
    if req.dark_mode is not None:
        profile.dark_mode = req.dark_mode

    await db.commit()
    await db.refresh(profile)
    return {"message": "Profile updated successfully", "profile": profile}

@router.post("/mark-studied")
async def mark_studied(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Profile).where(Profile.user_id == user.id)
    result = await db.execute(stmt)
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    now = datetime.now(timezone.utc)
    profile.streak_days += 1
    profile.last_studied_at = now
    await db.commit()
    return {
        "message": "Today recorded as studied in student twin model",
        "streak_days": profile.streak_days
    }
