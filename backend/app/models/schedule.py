import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class StudySchedule(Base):
    __tablename__ = 'study_schedules'
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    mode = Column(String(20), nullable=False)  # 'resource' or 'general'
    time_range = Column(String(50), default='1_week')  # '3_days', '1_week', '2_weeks', '1_month', etc.
    field_of_study = Column(String(100), nullable=True)  # e.g. 'Artificial Intelligence & Machine Learning (AIML)', 'Cybersecurity'
    title = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    plan_json = Column(JSON, nullable=False)  # stores schedule dict

    user = relationship('User', back_populates='schedules')
