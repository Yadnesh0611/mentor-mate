from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class UserRegister(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=2)
    education_tier: str = 'Class 10 (10th Boards)'
    board_or_university: str = 'CBSE'
    goal: str = '10th Boards (CBSE)'
    target_year: int = 2026
    daily_available_hours: float = 3.5

class UserLogin(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    education_tier: Optional[str] = None
    board_or_university: Optional[str] = None
    goal: Optional[str] = None
    daily_available_hours: Optional[float] = None
    days_to_exam: Optional[int] = None
    dark_mode: Optional[bool] = None

class UserOut(BaseModel):
    id: str
    email: str
    role: str

class ProfileOut(BaseModel):
    id: str
    user_id: str
    name: str
    education_tier: str
    board_or_university: Optional[str] = None
    goal: Optional[str] = None
    target_year: Optional[int] = 2026
    daily_available_hours: Optional[float] = 2.0
    days_to_exam: Optional[int] = None
    streak_days: Optional[int] = 1
    dark_mode: Optional[bool] = False

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: UserOut
    profile: ProfileOut
