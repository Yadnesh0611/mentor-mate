import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Assessment(Base):
    __tablename__ = 'assessments'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    subject = Column(String(100), default='General')
    status = Column(String(50), default='in_progress')  # in_progress, completed
    score = Column(Integer, default=0)
    total_questions = Column(Integer, default=5)
    percentage = Column(Float, default=0.0)
    proficiency_tier = Column(String(50), default='Assessing')
    difficulty_mode = Column(String(50), default='adaptive')  # adaptive, foundational, intermediate, advanced
    latent_ability_theta = Column(Float, default=0.0)  # IRT ability theta
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)

    user = relationship('User', back_populates='assessments')
    items = relationship('AssessmentItem', back_populates='assessment', cascade='all, delete-orphan')
    responses = relationship('AssessmentResponse', back_populates='assessment', cascade='all, delete-orphan')

class AssessmentItem(Base):
    __tablename__ = 'assessment_items'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    assessment_id = Column(String(36), ForeignKey('assessments.id', ondelete='CASCADE'), index=True, nullable=False)
    concept_id = Column(String(36), ForeignKey('concepts.id', ondelete='SET NULL'), nullable=True)
    question_number = Column(Integer, nullable=False)
    question_type = Column(String(50), default='mcq')  # mcq, short_answer, long_answer, diagram
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=True)  # list of 4 options for mcq, None for open-ended
    correct_index = Column(Integer, nullable=True)  # correct option index for mcq
    rubric = Column(JSON, nullable=True)  # list of key evaluation points / criteria
    diagram_code = Column(Text, nullable=True)  # Mermaid diagram or visual schema
    diagram_type = Column(String(50), nullable=True)  # mermaid, flowchart, class_diagram, circuit
    hints = Column(JSON, nullable=True)  # list of Socratic hints
    explanation = Column(Text, nullable=False)
    difficulty = Column(Float, default=0.5)  # b parameter
    discrimination_a = Column(Float, default=1.0)  # a parameter
    misconception_map = Column(JSON, nullable=True)  # dict {distractor_index: misconception_type}

    assessment = relationship('Assessment', back_populates='items')
    concept = relationship('Concept', back_populates='assessment_items')
    responses = relationship('AssessmentResponse', back_populates='item', cascade='all, delete-orphan')

class AssessmentResponse(Base):
    __tablename__ = 'assessment_responses'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    assessment_id = Column(String(36), ForeignKey('assessments.id', ondelete='CASCADE'), index=True, nullable=False)
    item_id = Column(String(36), ForeignKey('assessment_items.id', ondelete='CASCADE'), index=True, nullable=False)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    selected_index = Column(Integer, nullable=True)  # option index for mcq
    text_response = Column(Text, nullable=True)  # written answer for short/long/diagram
    score_awarded = Column(Float, default=0.0)  # normalized score (0.0 to 1.0)
    ai_feedback = Column(Text, nullable=True)  # diagnostic AI feedback
    missing_concepts = Column(JSON, nullable=True)  # list of missing points
    is_correct = Column(Boolean, nullable=False)
    response_time_ms = Column(Integer, default=0)
    error_type = Column(String(100), nullable=True)
    prior_p_l = Column(Float, nullable=True)
    posterior_p_l = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    assessment = relationship('Assessment', back_populates='responses')
    item = relationship('AssessmentItem', back_populates='responses')
