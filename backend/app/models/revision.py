import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class RevisionItem(Base):
    __tablename__ = 'revision_items'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    concept_id = Column(String(36), ForeignKey('concepts.id', ondelete='CASCADE'), index=True, nullable=True)
    
    # Type 1 ('field_curriculum') vs Type 2 ('study_material')
    revision_type = Column(String(50), default='field_curriculum', nullable=False)
    source_context = Column(String(50), default='curriculum')  # 'curriculum', 'test', 'mentor', 'notes_upload'
    
    # Context references
    resource_id = Column(String(36), ForeignKey('resources.id', ondelete='SET NULL'), nullable=True)
    folder_id = Column(String(36), ForeignKey('study_folders.id', ondelete='SET NULL'), nullable=True)
    topic_title = Column(String(255), nullable=True)

    
    # Generated Multi-Format Study Materials
    flashcards = Column(JSON, nullable=True)     # list of { "front": str, "back": str, "hint": str }
    mindmap_code = Column(Text, nullable=True)   # Mermaid mindmap / flowchart syntax
    quick_summary = Column(Text, nullable=True)  # Key takeaways / summary bullets
    speed_quiz = Column(JSON, nullable=True)     # list of { "question": str, "options": list[str], "correct_answer": str, "explanation": str }
    last_score = Column(Float, nullable=True)

    # Ebbinghaus parameters: R(t) = 2^(-t / S)
    stability_days_s = Column(Float, default=3.0)  # S parameter (half-life in days)
    last_reviewed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    next_review_at = Column(DateTime, nullable=False)
    review_count = Column(Integer, default=0)
    retention_estimate = Column(Float, default=1.0)
    priority = Column(String(20), default='Medium')  # High, Medium, Low
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship('User', back_populates='revision_items')
    concept = relationship('Concept', back_populates='revision_items')

