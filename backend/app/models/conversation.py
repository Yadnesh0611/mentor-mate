import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Conversation(Base):
    __tablename__ = 'conversations'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    title = Column(String(255), default='New Academic Conversation')
    group_tag = Column(String(100), nullable=True, default=None)  # e.g., 'Physics', 'Exam Prep', 'Algebra', 'General'
    mode = Column(String(50), nullable=False)  # resource_grounded, ask_mentor
    resource_id = Column(String(36), ForeignKey('resources.id', ondelete='SET NULL'), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship('User', back_populates='conversations')
    messages = relationship('Message', back_populates='conversation', cascade='all, delete-orphan')

class Message(Base):
    __tablename__ = 'messages'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey('conversations.id', ondelete='CASCADE'), index=True, nullable=False)
    role = Column(String(20), nullable=False)  # user, assistant
    content = Column(Text, nullable=False)
    evidence_sufficient = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    conversation = relationship('Conversation', back_populates='messages')
    citations = relationship('Citation', back_populates='message', cascade='all, delete-orphan')

class Citation(Base):
    __tablename__ = 'citations'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    message_id = Column(String(36), ForeignKey('messages.id', ondelete='CASCADE'), index=True, nullable=False)
    resource_id = Column(String(36), ForeignKey('resources.id', ondelete='CASCADE'), nullable=False)
    chunk_id = Column(String(36), nullable=True)
    document_name = Column(String(255), nullable=False)
    page_number = Column(Integer, nullable=True)
    slide_number = Column(Integer, nullable=True)
    section_title = Column(String(255), nullable=True)
    excerpt = Column(Text, nullable=False)
    relevance_score = Column(Float, default=0.0)

    message = relationship('Message', back_populates='citations')
