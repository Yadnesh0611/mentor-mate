from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.user import User, Profile
from app.models.conversation import Conversation, Message
from app.schemas.chat import ChatRequest, MessageOut, ConversationOut, ConversationUpdate
from app.services.ai_service import ai_service
from app.api.deps import get_current_user

router = APIRouter(prefix="/mentor", tags=["Ask Mentor (General Socratic AI)"])

@router.post("/chat", response_model=MessageOut)
async def chat_with_mentor(
    req: ChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Get student profile for contextual grounding
    prof_stmt = select(Profile).where(Profile.user_id == user.id)
    prof_res = await db.execute(prof_stmt)
    profile = prof_res.scalar_one_or_none()

    tier = profile.education_tier if profile else "Class 10"
    goal = profile.goal if profile else "Board & Entrance Exams"

    # 1. Resolve or create conversation
    conv = None
    if req.conversation_id:
        c_stmt = select(Conversation).where(
            Conversation.id == req.conversation_id,
            Conversation.user_id == user.id,
            Conversation.mode == "ask_mentor"
        )
        res = await db.execute(c_stmt)
        conv = res.scalar_one_or_none()

    if not conv:
        conv = Conversation(
            user_id=user.id,
            title=req.message[:50].strip() or "Socratic Mentorship",
            mode="ask_mentor"
        )
        db.add(conv)
        await db.flush()

    # 2. Record user message
    user_msg = Message(
        conversation_id=conv.id,
        role="user",
        content=req.message.strip()
    )
    db.add(user_msg)
    await db.flush()

    # 3. Retrieve conversation history (up to last 6 messages)
    hist_stmt = (
        select(Message)
        .where(Message.conversation_id == conv.id)
        .order_by(Message.created_at.asc())
    )
    hist_res = await db.execute(hist_stmt)
    prev_messages = hist_res.scalars().all()[-6:]

    formatted_history = [
        {"role": m.role, "content": m.content}
        for m in prev_messages
    ]

    from app.services.openclaw_service import openclaw_service
    agent_result = await openclaw_service.run_mentor_agent(
        user_id=user.id,
        message=req.message.strip(),
        history=formatted_history,
        db=db
    )
    answer = agent_result["content"]

    # 4. Record Assistant response
    asst_msg = Message(
        conversation_id=conv.id,
        role="assistant",
        content=answer,
        evidence_sufficient=True
    )
    db.add(asst_msg)
    await db.commit()
    await db.refresh(asst_msg)

    # 5. Connect to Revision System: record topic study session & start memory decay
    try:
        from datetime import datetime, timezone, timedelta
        from app.models.revision import RevisionItem
        topic_title = (conv.title or req.message)[:60].strip()
        now_utc = datetime.now(timezone.utc)

        r_stmt = select(RevisionItem).where(
            RevisionItem.user_id == user.id,
            RevisionItem.topic_title.ilike(f"%{topic_title[:25]}%")
        )
        r_res = await db.execute(r_stmt)
        existing_rev = r_res.scalars().first()

        if existing_rev:
            existing_rev.last_reviewed_at = now_utc
            existing_rev.retention_estimate = 1.0
            existing_rev.review_count = (existing_rev.review_count or 0) + 1
            existing_rev.source_context = "mentor"
        else:
            from app.models.knowledge import Concept
            c_stmt = select(Concept).where(Concept.name == topic_title[:150])
            c_res = await db.execute(c_stmt)
            c_obj = c_res.scalar_one_or_none()
            if not c_obj:
                c_obj = Concept(
                    name=topic_title[:150],
                    subject=(goal or "Curriculum")[:100],
                    topic=topic_title[:150],
                    description=f"Curriculum concept discussed in Socratic Mentor session: {topic_title}"
                )
                db.add(c_obj)
                await db.flush()

            new_rev = RevisionItem(
                user_id=user.id,
                concept_id=c_obj.id,
                topic_title=topic_title,
                revision_type="field_curriculum",
                source_context="mentor",
                stability_days_s=3.0,
                last_reviewed_at=now_utc,
                next_review_at=now_utc + timedelta(days=3.0),
                retention_estimate=1.0,
                review_count=1,
                priority="Medium"
            )
            db.add(new_rev)

        await db.commit()
    except Exception as rev_err:
        import logging
        logging.getLogger("mentormate").warning(f"Mentor revision link note: {rev_err}")


    return MessageOut(
        id=asst_msg.id,
        conversation_id=conv.id,
        role=asst_msg.role,
        content=asst_msg.content,
        evidence_sufficient=True,
        citations=[],
        created_at=asst_msg.created_at
    )

@router.get("/conversations", response_model=List[ConversationOut])
async def list_conversations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = (
        select(Conversation)
        .where(Conversation.user_id == user.id, Conversation.mode == "ask_mentor")
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

    return [
        MessageOut(
            id=m.id,
            conversation_id=conversation_id,
            role=m.role,
            content=m.content,
            evidence_sufficient=True,
            citations=[],
            created_at=m.created_at
        )
        for m in messages
    ]

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

