from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    resource_id: Optional[str] = None
    folder_id: Optional[str] = None


class CitationOut(BaseModel):
    document_name: str
    page_number: Optional[int] = None
    slide_number: Optional[int] = None
    section_title: Optional[str] = None
    excerpt: str
    relevance_score: float

class MessageOut(BaseModel):
    id: str
    conversation_id: Optional[str] = None
    role: str
    content: str
    evidence_sufficient: bool
    citations: List[CitationOut] = []
    created_at: datetime

class ConversationOut(BaseModel):
    id: str
    title: str
    group_tag: Optional[str] = None
    mode: str
    resource_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    group_tag: Optional[str] = None

