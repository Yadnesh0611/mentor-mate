from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.resource import Resource, ResourceChunk
from app.services.embedding_service import embedding_service
from app.services.ai_service import ai_service

class RetrievedEvidence:
    def __init__(
        self,
        chunk_id: str,
        resource_id: str,
        document_name: str,
        page_number: Optional[int],
        slide_number: Optional[int],
        section_title: Optional[str],
        content: str,
        score: float
    ):
        self.chunk_id = chunk_id
        self.resource_id = resource_id
        self.document_name = document_name
        self.page_number = page_number
        self.slide_number = slide_number
        self.section_title = section_title
        self.content = content
        self.score = score

class RAGService:
    SIMILARITY_THRESHOLD = 0.20

    async def retrieve_evidence(
        self,
        db: AsyncSession,
        user_id: str,
        query: str,
        top_k: int = 4,
        resource_id: Optional[str] = None,
        folder_id: Optional[str] = None
    ) -> List[RetrievedEvidence]:
        stmt = (
            select(ResourceChunk, Resource.title)
            .join(Resource, ResourceChunk.resource_id == Resource.id)
            .where(ResourceChunk.user_id == user_id)
            .where(Resource.status == "ready")
        )
        if resource_id:
            stmt = stmt.where(ResourceChunk.resource_id == resource_id)
        elif folder_id:
            stmt = stmt.where(Resource.folder_id == folder_id)

        result = await db.execute(stmt)
        rows = result.all()
        if not rows:
            return []


        query_vec = embedding_service.generate_embedding(query)
        query_words = set(query.lower().split())

        scored: List[Tuple[float, ResourceChunk, str]] = []
        for chunk, doc_title in rows:
            if not chunk.embedding:
                continue
            cos_sim = embedding_service.cosine_similarity(query_vec, chunk.embedding)
            
            chunk_words = set(chunk.content.lower().split())
            overlap = len(query_words.intersection(chunk_words)) / max(1, len(query_words))
            hybrid_score = (cos_sim * 0.7) + (overlap * 0.3)

            if hybrid_score >= self.SIMILARITY_THRESHOLD:
                scored.append((hybrid_score, chunk, doc_title))

        scored.sort(key=lambda x: x[0], reverse=True)
        top_rows = scored[:top_k]

        evidence_list = []
        for score, chunk, doc_title in top_rows:
            evidence_list.append(RetrievedEvidence(
                chunk_id=chunk.id,
                resource_id=chunk.resource_id,
                document_name=doc_title,
                page_number=chunk.page_number,
                slide_number=chunk.slide_number,
                section_title=chunk.section_title,
                content=chunk.content,
                score=round(score, 3)
            ))
        return evidence_list

    async def answer_student_resource_query(
        self,
        db: AsyncSession,
        user_id: str,
        query: str,
        resource_id: Optional[str] = None
    ) -> Dict[str, Any]:
        evidence = await self.retrieve_evidence(db, user_id, query, top_k=4, resource_id=resource_id)

        if not evidence:
            return {
                "content": "I couldn\'t find enough support for that answer in your uploaded resources. Please make sure the topic is covered in your uploaded materials or ask general questions in the \'Ask Mentor\' tab.",
                "evidence_sufficient": False,
                "citations": []
            }

        context_parts = []
        citations = []
        for i, ev in enumerate(evidence):
            ref_str = ev.document_name
            if ev.page_number:
                ref_str += f" (Page {ev.page_number})"
            elif ev.slide_number:
                ref_str += f" (Slide {ev.slide_number})"
            if ev.section_title:
                ref_str += f" - {ev.section_title}"

            context_parts.append(f"[{i+1}] Source: {ref_str}\nExcerpt: {ev.content}")
            citations.append({
                "document_name": ev.document_name,
                "page_number": ev.page_number,
                "slide_number": ev.slide_number,
                "section_title": ev.section_title,
                "excerpt": ev.content[:240] + ("..." if len(ev.content) > 240 else ""),
                "relevance_score": ev.score
            })

        grounded_context = "\n\n".join(context_parts)
        system_prompt = (
            "You are the Student Resource AI for Mentor Mate. Your purpose is to answer the student\'s "
            "questions grounded STRICTLY and EXCLUSIVELY in their provided uploaded resource excerpts below.\n\n"
            "CRITICAL RULES:\n"
            "1. Answer ONLY using the facts, definitions, formulas, and derivations in the provided excerpts.\n"
            "2. Do NOT extrapolate or introduce external facts that are absent from the excerpts.\n"
            "3. Whenever quoting or drawing a point, reference the source by name/page.\n"
            "4. If the provided excerpts do not contain sufficient evidence to answer the question with certainty, "
            "state explicitly: \"I couldn\'t find enough support for that answer in your resources.\"\n\n"
            f"=== STUDENT RESOURCE EVIDENCE ===\n{grounded_context}"
        )

        answer = await ai_service.generate_chat(
            messages=[{"role": "user", "content": query}],
            system_prompt=system_prompt,
            model_role="FAST"
        )

        return {
            "content": answer,
            "evidence_sufficient": True,
            "citations": citations
        }

rag_service = RAGService()
