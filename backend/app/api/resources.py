import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.resource import Resource, ResourceChunk, StudyFolder
from app.schemas.resource import (
    ResourceOut, ResourceChunkOut, StudyFolderCreate,
    StudyFolderOut, StudyFolderUpdate, SetFolderRequest,
    ResourceChunksUpdateRequest
)
from app.services.extraction_service import document_extractor
from app.services.chunking_service import chunking_service
from app.services.embedding_service import embedding_service
from app.api.deps import get_current_user, get_current_user_flexible


router = APIRouter(prefix="/resources", tags=["Student Resources"])

# =============================================================================
# STUDY UNITS / FOLDERS
# =============================================================================

@router.get("/folders", response_model=List[StudyFolderOut])
async def list_study_folders(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(StudyFolder)
        .where(StudyFolder.user_id == user.id)
        .order_by(StudyFolder.created_at.desc())
    )
    res = await db.execute(stmt)
    folders = res.scalars().all()

    # Fetch resources for each folder
    out = []
    for f in folders:
        r_stmt = (
            select(Resource)
            .where(Resource.folder_id == f.id, Resource.user_id == user.id)
            .order_by(Resource.created_at.desc())
        )
        r_res = await db.execute(r_stmt)
        folder_resources = r_res.scalars().all()

        res_outs = [
            ResourceOut(
                id=r.id,
                folder_id=r.folder_id,
                title=r.title,
                file_name=r.file_name,
                file_type=r.file_type,
                file_size_bytes=r.file_size_bytes,
                status=r.status,
                error_message=r.error_message,
                subject=r.subject,
                extracted_summary=r.extracted_summary,
                extracted_formulas=r.extracted_formulas,
                chunk_count=r.chunk_count,
                is_verified=r.is_verified,
                created_at=r.created_at
            )
            for r in folder_resources
        ]

        out.append(StudyFolderOut(
            id=f.id,
            name=f.name,
            subject=f.subject,
            description=f.description,
            resource_count=len(folder_resources),
            resources=res_outs,
            created_at=f.created_at,
            updated_at=f.updated_at
        ))
    return out

@router.post("/folders", response_model=StudyFolderOut)
async def create_study_folder(
    payload: StudyFolderCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    folder = StudyFolder(
        user_id=user.id,
        name=payload.name.strip(),
        subject=payload.subject.strip() if payload.subject else "General",
        description=payload.description.strip() if payload.description else None
    )
    db.add(folder)
    await db.commit()
    await db.refresh(folder)

    return StudyFolderOut(
        id=folder.id,
        name=folder.name,
        subject=folder.subject,
        description=folder.description,
        resource_count=0,
        resources=[],
        created_at=folder.created_at,
        updated_at=folder.updated_at
    )

@router.put("/folders/{folder_id}", response_model=StudyFolderOut)
async def update_study_folder(
    folder_id: str,
    payload: StudyFolderUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(StudyFolder).where(StudyFolder.id == folder_id, StudyFolder.user_id == user.id)
    res = await db.execute(stmt)
    folder = res.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Study unit / folder not found")

    if payload.name is not None:
        folder.name = payload.name.strip()
    if payload.subject is not None:
        folder.subject = payload.subject.strip()
    if payload.description is not None:
        folder.description = payload.description.strip()

    await db.commit()
    await db.refresh(folder)

    # Fetch resources
    r_stmt = select(Resource).where(Resource.folder_id == folder.id, Resource.user_id == user.id)
    r_res = await db.execute(r_stmt)
    folder_resources = r_res.scalars().all()

    return StudyFolderOut(
        id=folder.id,
        name=folder.name,
        subject=folder.subject,
        description=folder.description,
        resource_count=len(folder_resources),
        resources=[
            ResourceOut(
                id=r.id,
                folder_id=r.folder_id,
                title=r.title,
                file_name=r.file_name,
                file_type=r.file_type,
                file_size_bytes=r.file_size_bytes,
                status=r.status,
                error_message=r.error_message,
                subject=r.subject,
                extracted_summary=r.extracted_summary,
                extracted_formulas=r.extracted_formulas,
                chunk_count=r.chunk_count,
                is_verified=r.is_verified,
                created_at=r.created_at
            )
            for r in folder_resources
        ],
        created_at=folder.created_at,
        updated_at=folder.updated_at
    )

@router.delete("/folders/{folder_id}")
async def delete_study_folder(
    folder_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(StudyFolder).where(StudyFolder.id == folder_id, StudyFolder.user_id == user.id)
    res = await db.execute(stmt)
    folder = res.scalar_one_or_none()
    if not folder:
        raise HTTPException(status_code=404, detail="Study unit / folder not found")

    # Unassign attached resources rather than deleting them
    unassign_stmt = (
        update(Resource)
        .where(Resource.folder_id == folder_id, Resource.user_id == user.id)
        .values(folder_id=None)
    )
    await db.execute(unassign_stmt)
    await db.delete(folder)
    await db.commit()
    return {"message": "Study unit folder deleted successfully", "id": folder_id}

@router.put("/{resource_id}/folder")
async def assign_resource_folder(
    resource_id: str,
    payload: SetFolderRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Resource).where(Resource.id == resource_id, Resource.user_id == user.id)
    res = await db.execute(stmt)
    resource = res.scalar_one_or_none()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    if payload.folder_id:
        f_stmt = select(StudyFolder).where(StudyFolder.id == payload.folder_id, StudyFolder.user_id == user.id)
        f_res = await db.execute(f_stmt)
        if not f_res.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Target folder not found")

    resource.folder_id = payload.folder_id
    await db.commit()
    await db.refresh(resource)
    return {"message": "Resource folder updated", "resource_id": resource_id, "folder_id": resource.folder_id}

# =============================================================================
# RESOURCE UPLOAD & MANAGEMENT
# =============================================================================

@router.post("/upload", response_model=ResourceOut)
async def upload_resource(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    subject: Optional[str] = Form("General"),
    folder_id: Optional[str] = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename missing")

    filename = file.filename
    ext = filename.split(".")[-1].lower() if "." in filename else ""
    if ext not in ["pdf", "docx", "doc", "pptx", "ppt", "txt", "md", "png", "jpg", "jpeg", "webp", "bmp", "tiff"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '.{ext}'. Supported formats: PDF, DOCX, PPTX, TXT, Markdown, PNG, JPG, WEBP, BMP."
        )

    clean_name = f"{uuid.uuid4().hex[:10]}_{filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, clean_name)
    
    content_bytes = await file.read()
    file_size = len(content_bytes)
    with open(file_path, "wb") as f:
        f.write(content_bytes)

    doc_title = title.strip() if title and title.strip() else filename.rsplit(".", 1)[0]

    # Verify folder ownership if specified
    valid_folder_id = None
    if folder_id:
        f_stmt = select(StudyFolder).where(StudyFolder.id == folder_id, StudyFolder.user_id == user.id)
        f_res = await db.execute(f_stmt)
        if f_res.scalar_one_or_none():
            valid_folder_id = folder_id

    # Create Resource record
    resource = Resource(
        user_id=user.id,
        folder_id=valid_folder_id,
        title=doc_title,
        file_name=filename,
        file_path=file_path,
        file_type=ext,
        file_size_bytes=file_size,
        status="processing",
        subject=subject.strip() if subject else "General"
    )
    db.add(resource)
    await db.commit()
    await db.refresh(resource)

    # Process extraction & embeddings
    try:
        sections = await document_extractor.extract_async(file_path, ext)
        chunks = chunking_service.chunk_sections(sections)

        for c in chunks:
            emb = embedding_service.generate_embedding(c.content)
            r_chunk = ResourceChunk(
                resource_id=resource.id,
                user_id=user.id,
                chunk_index=c.chunk_index,
                page_number=c.page_number,
                slide_number=c.slide_number,
                section_title=c.section_title,
                content=c.content,
                embedding=emb,
                token_estimate=c.token_estimate
            )
            db.add(r_chunk)

        resource.chunk_count = len(chunks)
        resource.status = "ready"
        if sections:
            resource.extracted_summary = f"Extracted {len(sections)} sections and {len(chunks)} searchable knowledge chunks."
        await db.commit()
        await db.refresh(resource)

    except Exception as e:
        resource.status = "failed"
        resource.error_message = str(e)
        await db.commit()
        await db.refresh(resource)
        raise HTTPException(status_code=500, detail=f"Failed to process document: {e}")

    return resource

@router.get("", response_model=List[ResourceOut])
async def list_resources(
    folder_id: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Resource)
        .where(Resource.user_id == user.id)
    )
    if folder_id:
        stmt = stmt.where(Resource.folder_id == folder_id)

    stmt = stmt.order_by(Resource.created_at.desc())
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/{resource_id}")
async def get_resource_detail(
    resource_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Resource).where(Resource.id == resource_id, Resource.user_id == user.id)
    res = await db.execute(stmt)
    resource = res.scalar_one_or_none()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    chunk_stmt = (
        select(ResourceChunk)
        .where(ResourceChunk.resource_id == resource_id, ResourceChunk.user_id == user.id)
        .order_by(ResourceChunk.chunk_index.asc())
    )
    chunk_res = await db.execute(chunk_stmt)
    chunks = chunk_res.scalars().all()

    return {
        "id": resource.id,
        "folder_id": resource.folder_id,
        "title": resource.title,
        "file_name": resource.file_name,
        "file_type": resource.file_type,
        "file_size_bytes": resource.file_size_bytes,
        "status": resource.status,
        "subject": resource.subject,
        "chunk_count": resource.chunk_count,
        "is_verified": resource.is_verified,
        "created_at": resource.created_at,
        "resource": {
            "id": resource.id,
            "folder_id": resource.folder_id,
            "title": resource.title,
            "file_name": resource.file_name,
            "file_type": resource.file_type,
            "file_size_bytes": resource.file_size_bytes,
            "status": resource.status,
            "subject": resource.subject,
            "chunk_count": resource.chunk_count,
            "is_verified": resource.is_verified,
            "created_at": resource.created_at
        },
        "chunks": [
            {
                "id": c.id,
                "chunk_index": c.chunk_index,
                "page_number": c.page_number,
                "slide_number": c.slide_number,
                "section_title": c.section_title,
                "content": c.content
            }
            for c in chunks
        ]
    }

@router.get("/{resource_id}/file")
async def get_resource_file(
    resource_id: str,
    download: bool = False,
    user: User = Depends(get_current_user_flexible),
    db: AsyncSession = Depends(get_db)
):

    """
    Streams the raw uploaded file (image, PDF, etc.) for direct side-by-side preview.
    """
    stmt = select(Resource).where(Resource.id == resource_id, Resource.user_id == user.id)
    res = await db.execute(stmt)
    resource = res.scalar_one_or_none()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    if not os.path.exists(resource.file_path):
        raise HTTPException(status_code=404, detail="File on disk not found")

    media_types = {
        "pdf": "application/pdf",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "jfif": "image/jpeg",
        "webp": "image/webp",
        "bmp": "image/bmp",
        "txt": "text/plain",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    }
    media_type = media_types.get(resource.file_type.lower(), "application/octet-stream")


    disposition = "attachment" if download else "inline"

    return FileResponse(
        resource.file_path,
        media_type=media_type,
        filename=resource.file_name,
        content_disposition_type=disposition
    )

@router.get("/{resource_id}/chunks")
async def get_resource_chunks_list(
    resource_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    return await get_resource_detail(resource_id=resource_id, user=user, db=db)

@router.put("/{resource_id}/chunks")
async def update_resource_chunks(
    resource_id: str,
    payload: ResourceChunksUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Interactive Verification & Editing:
    Saves student-verified text changes for each section/chunk and regenerates vector embeddings.
    """
    stmt = select(Resource).where(Resource.id == resource_id, Resource.user_id == user.id)
    res = await db.execute(stmt)
    resource = res.scalar_one_or_none()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    # Delete existing chunks and recreate with updated student content and refreshed embeddings
    del_stmt = delete(ResourceChunk).where(ResourceChunk.resource_id == resource_id)
    await db.execute(del_stmt)

    new_chunks = []
    for idx, c in enumerate(payload.chunks):
        content = c.content.strip()
        if not content:
            continue
        emb = embedding_service.generate_embedding(content)
        chunk = ResourceChunk(
            resource_id=resource.id,
            user_id=user.id,
            chunk_index=idx,
            page_number=c.page_number,
            slide_number=c.slide_number,
            section_title=c.section_title or f"Section {idx + 1}",
            content=content,
            embedding=emb,
            token_estimate=len(content.split())
        )
        db.add(chunk)
        new_chunks.append(chunk)

    resource.chunk_count = len(new_chunks)
    resource.is_verified = True
    resource.extracted_summary = f"Student verified and updated {len(new_chunks)} knowledge sections."
    await db.commit()
    await db.refresh(resource)

    return {
        "message": "Resource content verified and re-indexed successfully",
        "resource_id": resource_id,
        "is_verified": True,
        "chunk_count": len(new_chunks)
    }

@router.delete("/{resource_id}")
async def delete_resource(
    resource_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Resource).where(Resource.id == resource_id, Resource.user_id == user.id)
    res = await db.execute(stmt)
    resource = res.scalar_one_or_none()
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")

    # Clean up file on disk if exists
    if os.path.exists(resource.file_path):
        try:
            os.remove(resource.file_path)
        except Exception:
            pass

    await db.delete(resource)
    await db.commit()
    return {"message": "Resource and associated vector knowledge deleted successfully", "id": resource_id}

