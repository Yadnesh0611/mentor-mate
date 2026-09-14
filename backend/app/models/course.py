import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Course(Base):
    __tablename__ = 'courses'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=True, index=True)
    
    # 'personalized' or 'open_source'
    course_type = Column(String(50), nullable=False, default='personalized', index=True)
    
    title = Column(String(255), nullable=False)
    field_of_study = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    level = Column(String(50), default='Intermediate')  # 'Beginner', 'Intermediate', 'Advanced'
    estimated_hours = Column(Integer, default=20)
    
    # Structured modules and lessons
    modules = Column(JSON, nullable=False, default=list)
    
    # Metadata for personalized courses
    weak_areas_addressed = Column(JSON, nullable=True, default=list)
    data_sources_used = Column(JSON, nullable=True, default=dict)
    prerequisites = Column(JSON, nullable=True, default=list)
    
    # Metadata for open source / web courses
    external_url = Column(String(512), nullable=True)
    github_stars = Column(Integer, nullable=True, default=0)
    source_platform = Column(String(100), nullable=True)  # 'GitHub', 'MIT OpenCourseWare', 'Stanford Open', 'Fast.ai', etc.
    tags = Column(JSON, nullable=True, default=list)
    
    status = Column(String(50), default='active')
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship('User', back_populates='courses')
