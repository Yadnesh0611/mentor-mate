import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class StudyFolder(Base):
    __tablename__ = 'study_folders'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    name = Column(String(255), nullable=False)
    subject = Column(String(100), default='General')
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    resources = relationship('Resource', back_populates='folder')

class Resource(Base):
    __tablename__ = 'resources'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    folder_id = Column(String(36), ForeignKey('study_folders.id', ondelete='SET NULL'), index=True, nullable=True)
    title = Column(String(255), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)  # pdf, docx, pptx, txt, png, jpg, jpeg, webp
    file_size_bytes = Column(Integer, default=0)
    status = Column(String(50), default='uploaded')  # uploaded, processing, ready, failed
    error_message = Column(Text, nullable=True)
    subject = Column(String(100), default='General')
    extracted_summary = Column(Text, nullable=True)
    extracted_formulas = Column(JSON, nullable=True)  # List of formula strings or objects
    chunk_count = Column(Integer, default=0)
    is_verified = Column(Boolean, default=False)  # Student reviewed and confirmed extraction
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship('User', back_populates='resources')
    folder = relationship('StudyFolder', back_populates='resources')
    chunks = relationship('ResourceChunk', back_populates='resource', cascade='all, delete-orphan')

class ResourceChunk(Base):
    __tablename__ = 'resource_chunks'

    id = Column(String(36), primary_key=True, default=generate_uuid)
    resource_id = Column(String(36), ForeignKey('resources.id', ondelete='CASCADE'), index=True, nullable=False)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), index=True, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, nullable=True)
    slide_number = Column(Integer, nullable=True)
    section_title = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    embedding = Column(JSON, nullable=True)  # Vector of floats
    token_estimate = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    resource = relationship('Resource', back_populates='chunks')

