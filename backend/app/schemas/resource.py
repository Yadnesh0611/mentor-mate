from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime

class ResourceChunkOut(BaseModel):
    id: str
    chunk_index: int
    page_number: Optional[int] = None
    slide_number: Optional[int] = None
    section_title: Optional[str] = None
    content: str

class ResourceChunkEdit(BaseModel):
    id: Optional[str] = None
    chunk_index: int
    page_number: Optional[int] = None
    slide_number: Optional[int] = None
    section_title: Optional[str] = None
    content: str

class ResourceChunksUpdateRequest(BaseModel):
    chunks: List[ResourceChunkEdit]

class ResourceOut(BaseModel):
    id: str
    folder_id: Optional[str] = None
    title: str
    file_name: str
    file_type: str
    file_size_bytes: int
    status: str
    error_message: Optional[str] = None
    subject: str
    extracted_summary: Optional[str] = None
    extracted_formulas: Optional[List[Any]] = None
    chunk_count: int
    is_verified: bool = False
    created_at: datetime

class StudyFolderCreate(BaseModel):
    name: str
    subject: Optional[str] = "General"
    description: Optional[str] = None

class StudyFolderUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    description: Optional[str] = None

class StudyFolderOut(BaseModel):
    id: str
    name: str
    subject: str
    description: Optional[str] = None
    resource_count: int = 0
    resources: List[ResourceOut] = []
    created_at: datetime
    updated_at: datetime

class SetFolderRequest(BaseModel):
    folder_id: Optional[str] = None

