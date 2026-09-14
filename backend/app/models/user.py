import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = 'users'
    # Overall mastery score (0.0 - 100.0) computed from assessments, revisions, and mentor sessions
    mastery_score = Column(Float, default=0.0)
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default='student')
    field_of_study = Column(String(100), nullable=True)  # e.g., "Mathematics"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    profile = relationship('Profile', back_populates='user', uselist=False, cascade='all, delete-orphan')
    resources = relationship('Resource', back_populates='user', cascade='all, delete-orphan')
    knowledge_states = relationship('KnowledgeState', back_populates='user', cascade='all, delete-orphan')
    assessments = relationship('Assessment', back_populates='user', cascade='all, delete-orphan')
    revision_items = relationship('RevisionItem', back_populates='user', cascade='all, delete-orphan')
    schedules = relationship('StudySchedule', back_populates='user', cascade='all, delete-orphan')
    conversations = relationship('Conversation', back_populates='user', cascade='all, delete-orphan')
    study_plans = relationship('StudyPlan', back_populates='user', cascade='all, delete-orphan')
    courses = relationship('Course', back_populates='user', cascade='all, delete-orphan')


class Profile(Base):
    __tablename__ = 'profiles'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    education_tier = Column(String(100), default='Class 10 (10th Boards)')
    board_or_university = Column(String(100), default='CBSE')
    goal = Column(String(150), default='10th Boards (CBSE)')
    target_year = Column(Integer, default=2026)
    daily_available_hours = Column(Float, default=3.5)
    days_to_exam = Column(Integer, default=118)
    dark_mode = Column(Boolean, default=True)
    streak_days = Column(Integer, default=1)
    last_studied_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship('User', back_populates='profile')
