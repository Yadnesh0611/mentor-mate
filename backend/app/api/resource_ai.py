from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.user import User
from app.models.conversation import Conversation, Message, Citation
from app.schemas.chat import ChatRequest, MessageOut, ConversationOut, CitationOut, ConversationUpdate
from app.services.rag_service import rag_service
from app.api.deps import get_current_user

router = APIRouter(prefix="/resource-ai", tags=["Student Resource AI (Grounded)"])

@router.post("/chat", response_model=MessageOut)
async def chat_with_resources(
    req: ChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # 1. Resolve or create conversation
    conv = None
    if req.conversation_id:
        c_stmt = select(Conversation).where(
            Conversation.id == req.conversation_id,
            Conversation.user_id == user.id,
            Conversation.mode == "resource_grounded"
        )
        res = await db.execute(c_stmt)
        conv = res.scalar_one_or_none()

    if not conv:
        conv = Conversation(
            user_id=user.id,
            title=req.message[:50].strip() or "Resource Exploration",
            mode="resource_grounded",
            resource_id=req.resource_id
        )
        db.add(conv)
        await db.flush()

    # 2. Record student's message
    user_msg = Message(
        conversation_id=conv.id,
        role="user",
        content=req.message.strip()
    )
    db.add(user_msg)
    await db.flush()

    # 3. Grounded Resource AI Agent Workflow (OpenClaw + OmniRoute)
    from app.services.openclaw_service import openclaw_service
    
    # Retrieve previous messages for conversation context
    hist_stmt = (
        select(Message)
        .where(Message.conversation_id == conv.id)
        .order_by(Message.created_at.asc())
    )
    hist_res = await db.execute(hist_stmt)
    prev_messages = hist_res.scalars().all()[-4:]
    formatted_history = [{"role": m.role, "content": m.content} for m in prev_messages if m.id != user_msg.id]

    rag_result = await openclaw_service.run_resource_agent(
        user_id=user.id,
        query=req.message.strip(),
        resource_id=req.resource_id,
        folder_id=req.folder_id,
        history=formatted_history,
        db=db
    )


    # 4. Record Assistant response & citations
    asst_msg = Message(
        conversation_id=conv.id,
        role="assistant",
        content=rag_result["content"],
        evidence_sufficient=rag_result["evidence_sufficient"]
    )
    db.add(asst_msg)
    await db.flush()

    saved_citations = []
    for cit in rag_result.get("citations", []):
        c_entry = Citation(
            message_id=asst_msg.id,
            resource_id=req.resource_id or "res_unknown",
            document_name=cit["document_name"],
            page_number=cit.get("page_number"),
            slide_number=cit.get("slide_number"),
            section_title=cit.get("section_title"),
            excerpt=cit["excerpt"],
            relevance_score=cit["relevance_score"]
        )
        db.add(c_entry)
        saved_citations.append(CitationOut(
            document_name=cit["document_name"],
            page_number=cit.get("page_number"),
            slide_number=cit.get("slide_number"),
            section_title=cit.get("section_title"),
            excerpt=cit["excerpt"],
            relevance_score=cit["relevance_score"]
        ))

    await db.commit()
    await db.refresh(asst_msg)

    return MessageOut(
        id=asst_msg.id,
        conversation_id=conv.id,
        role=asst_msg.role,
        content=asst_msg.content,
        evidence_sufficient=asst_msg.evidence_sufficient,
        citations=saved_citations,
        created_at=asst_msg.created_at
    )

@router.get("/conversations", response_model=List[ConversationOut])
async def list_conversations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Conversation)
        .where(Conversation.user_id == user.id, Conversation.mode == "resource_grounded")
        .order_by(Conversation.updated_at.desc())
    )
    res = await db.execute(stmt)
    return res.scalars().all()

@router.get("/conversations/{conversation_id}/messages", response_model=List[MessageOut])
async def get_messages(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    c_stmt = select(Conversation).where(
        Conversation.id == conversation_id,
        Conversation.user_id == user.id
    )
    c_res = await db.execute(c_stmt)
    if not c_res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Conversation not found")

    m_stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    m_res = await db.execute(m_stmt)
    messages = m_res.scalars().all()

    out = []
    for m in messages:
        cit_stmt = select(Citation).where(Citation.message_id == m.id)
        cit_res = await db.execute(cit_stmt)
        cits = cit_res.scalars().all()
        out.append(MessageOut(
            id=m.id,
            conversation_id=conversation_id,
            role=m.role,
            content=m.content,
            evidence_sufficient=m.evidence_sufficient,
            citations=[
                CitationOut(
                    document_name=c.document_name,
                    page_number=c.page_number,
                    slide_number=c.slide_number,
                    section_title=c.section_title,
                    excerpt=c.excerpt,
                    relevance_score=c.relevance_score
                )
                for c in cits
            ],
            created_at=m.created_at
        ))
    return out

@router.put("/conversations/{conversation_id}", response_model=ConversationOut)
async def update_conversation(
    conversation_id: str,
    req: ConversationUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    c_stmt = select(Conversation).where(
        Conversation.id == conversation_id,
        Conversation.user_id == user.id
    )
    c_res = await db.execute(c_stmt)
    conv = c_res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    if req.title is not None:
        conv.title = req.title.strip() or conv.title
    if req.group_tag is not None:
        conv.group_tag = req.group_tag.strip() or None

    await db.commit()
    await db.refresh(conv)
    return conv

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    c_stmt = select(Conversation).where(
        Conversation.id == conversation_id,
        Conversation.user_id == user.id
    )
    c_res = await db.execute(c_stmt)
    conv = c_res.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.delete(conv)
    await db.commit()
    return {"message": "Conversation deleted successfully", "id": conversation_id}

