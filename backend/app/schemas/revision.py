from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class FlashcardItem(BaseModel):
    front: str
    back: str
    hint: Optional[str] = None

class SpeedQuizItem(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    explanation: str

class RevisionItemOut(BaseModel):
    id: str
    concept_id: Optional[str] = None
    concept_name: Optional[str] = None
    topic_title: Optional[str] = None
    subject: Optional[str] = None
    topic: Optional[str] = None
    revision_type: str = 'field_curriculum'
    source_context: str = 'curriculum'
    resource_id: Optional[str] = None
    folder_id: Optional[str] = None
    flashcards: Optional[List[Any]] = None
    mindmap_code: Optional[str] = None
    quick_summary: Optional[str] = None
    speed_quiz: Optional[List[Any]] = None
    last_score: Optional[float] = None
    stability_days_s: float
    half_life_days_h: float
    retention_estimate: float
    last_reviewed_at: datetime
    next_review_at: datetime
    review_count: int
    priority: str
    is_at_risk: bool = False

class RevisionCompleteRequest(BaseModel):
    is_remembered: bool = True
    score: Optional[float] = None
    difficulty_rating: Optional[str] = None # 'again', 'hard', 'good', 'easy'

class RevisionGenerateRequest(BaseModel):
    revision_type: str = 'field_curriculum' # 'field_curriculum' or 'study_material'
    topic_or_subject: Optional[str] = None
    concept_id: Optional[str] = None
    resource_id: Optional[str] = None
    folder_id: Optional[str] = None
    custom_focus: Optional[str] = None

class AtRiskConceptOut(BaseModel):
    id: str
    title: str
    subject: Optional[str] = None
    revision_type: str
    retention_estimate: float
    days_since_reviewed: float
    urgency: str # 'critical' (R < 0.50), 'fading' (0.50 <= R <= 0.70)
    concept_id: Optional[str] = None
    source_context: Optional[str] = None

