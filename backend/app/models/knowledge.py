import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Concept(Base):
    __tablename__ = 'concepts'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(150), unique=True, index=True, nullable=False)
    subject = Column(String(100), index=True, nullable=False)
    topic = Column(String(150), index=True, nullable=False)
    description = Column(Text, nullable=True)
    difficulty_base = Column(Float, default=0.5)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    knowledge_states = relationship('KnowledgeState', back_populates='concept', cascade='all, delete-orphan')
    assessment_items = relationship('AssessmentItem', back_populates='concept')
    revision_items = relationship('RevisionItem', back_populates='concept')

class KnowledgeState(Base):
    __tablename__ = 'knowledge_states'
    __table_args__ = (
        UniqueConstraint('user_id', 'concept_id', name='uq_user_concept_knowledge'),
    )

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    concept_id = Column(String(36), ForeignKey('concepts.id', ondelete='CASCADE'), index=True, nullable=False)
    
    # Bayesian Knowledge Tracing Parameters
    p_l = Column(Float, default=0.35)       # Latent mastery probability P(L_t)
    p_t = Column(Float, default=0.15)       # Transition probability P(T)
    p_g = Column(Float, default=0.20)       # Guess probability P(G)
    p_s = Column(Float, default=0.10)       # Slip probability P(S)
    
    uncertainty = Column(Float, default=0.25)
    total_attempts = Column(Integer, default=0)
    correct_attempts = Column(Integer, default=0)
    last_observed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship('User', back_populates='knowledge_states')
    concept = relationship('Concept', back_populates='knowledge_states')

class StudyPlan(Base):
    __tablename__ = 'study_plans'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    title = Column(String(200), nullable=False)
    goal = Column(String(255), nullable=True)
    target_date = Column(DateTime, nullable=True)
    plan_structure = Column(Text, nullable=False)  # JSON-encoded plan milestones and daily priorities
    status = Column(String(50), default='active')
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship('User', back_populates='study_plans')

