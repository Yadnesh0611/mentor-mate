from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class AssessmentStartRequest(BaseModel):
    mode: str = 'field_of_study'  # 'field_of_study', 'folder', 'resource', 'weakness'
    difficulty_mode: str = 'adaptive'  # 'adaptive', 'foundational', 'intermediate', 'advanced'
    resource_id: Optional[str] = None
    folder_id: Optional[str] = None
    subject: Optional[str] = None
    topic: Optional[str] = None
    question_types: Optional[List[str]] = None  # ['mcq', 'short_answer', 'long_answer', 'diagram']
    num_questions: int = 4

class AssessmentItemOut(BaseModel):
    id: str
    question_number: int
    question_type: str = 'mcq'
    question_text: str
    options: Optional[List[str]] = None
    diagram_code: Optional[str] = None
    diagram_type: Optional[str] = None
    hints: Optional[List[str]] = None
    rubric_hints: Optional[List[str]] = None

class AssessmentAnswerRequest(BaseModel):
    item_id: str
    selected_index: Optional[int] = None
    text_response: Optional[str] = None
    response_time_ms: int = 5000

class AssessmentAnswerOut(BaseModel):
    is_correct: bool
    score_awarded: float = 1.0
    correct_index: Optional[int] = None
    ai_feedback: Optional[str] = None
    explanation: str
    error_type: Optional[str] = None
    prior_p_l: float
    posterior_p_l: float
    is_complete: bool
    score: int
    total_questions: int
    next_question: Optional[AssessmentItemOut] = None

class AssessmentReportOut(BaseModel):
    id: str
    title: str
    subject: str
    score: int
    total_questions: int
    percentage: float
    proficiency_tier: str
    latent_ability_theta: float
    created_at: datetime
    completed_at: Optional[datetime] = None
