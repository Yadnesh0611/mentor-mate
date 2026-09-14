import pytest
import asyncio
import math
from datetime import datetime, timezone
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.database import Base
from app.core.config import settings
from app.models.user import User, Profile
from app.models.resource import Resource, ResourceChunk
from app.models.knowledge import Concept, KnowledgeState, StudyPlan
from app.models.assessment import Assessment, AssessmentItem
from app.models.revision import RevisionItem
from app.services.ai_service import ai_service, ModelRole, AIServiceUnavailableError
from app.services.openclaw_service import openclaw_service
from app.services.agent_tools import agent_tools, SecurityViolationError
from app.services.embedding_service import embedding_service
from app.services.retention_service import retention_service

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture
async def test_db():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


# =========================================================================
# 1. OmniRoute Connectivity & Model Routing
# =========================================================================
@pytest.mark.anyio
async def test_omniroute_connectivity_and_models():
    """Verify live connectivity to OmniRoute gateway on port 20128 and model discovery."""
    models = await ai_service.get_available_models()
    assert len(models) > 0, "OmniRoute gateway should expose active models"

    # Test logical role selections
    fast_model = ai_service.select_model_for_role(ModelRole.FAST_CHAT, models)
    reasoning_model = ai_service.select_model_for_role(ModelRole.DEEP_REASONING, models)
    synthesis_model = ai_service.select_model_for_role(ModelRole.RESOURCE_SYNTHESIS, models)
    mentor_model = ai_service.select_model_for_role(ModelRole.MENTOR, models)
    assessment_model = ai_service.select_model_for_role(ModelRole.ASSESSMENT_GENERATION, models)

    assert fast_model is not None
    assert reasoning_model is not None
    assert synthesis_model is not None
    assert mentor_model is not None
    assert assessment_model is not None

@pytest.mark.anyio
async def test_omniroute_live_chat_generation():
    """Test actual live chat completion round-trip through OmniRoute."""
    response = await ai_service.generate_chat(
        messages=[{"role": "user", "content": "Reply with 'OmniRoute verified' in 2 words."}],
        role=ModelRole.FAST_CHAT,
        agent_name="ConnectivityTest"
    )
    assert response is not None
    assert len(response.strip()) > 0


# =========================================================================
# 2. OpenClaw Gateway Connectivity
# =========================================================================
@pytest.mark.anyio
async def test_openclaw_gateway_health():
    """Test live OpenClaw gateway health status."""
    health = await openclaw_service.check_health()
    assert health["gateway_url"] == settings.OPENCLAW_GATEWAY_URL
    assert health["status"] in ["online", "offline"]
    # If gateway is running on 18789, it should report connected
    if health["connected"]:
        assert health["status"] == "online"


# =========================================================================
# 3. Security Test: Strict Cross-User Access Isolation
# =========================================================================
@pytest.mark.anyio
async def test_cross_user_isolation_security(test_db: AsyncSession):
    """
    CRITICAL SECURITY MANDATE:
    Student A uploads resources and creates learning state.
    Student B attempts to access Student A's data through agent tools.
    Every cross-user attempt MUST be rejected with SecurityViolationError.
    """
    # 1. Create Student A and Student B
    user_a = User(id="student_a_uuid", email="student_a@mentormate.internal", hashed_password="pw")
    user_b = User(id="student_b_uuid", email="student_b@mentormate.internal", hashed_password="pw")
    test_db.add_all([user_a, user_b])
    await test_db.flush()

    # 2. Student A uploads a confidential physics resource
    res_a = Resource(
        id="res_physics_a",
        user_id=user_a.id,
        title="Optics Confidential Notes",
        file_name="optics.pdf",
        file_path="uploads/optics.pdf",
        file_type="pdf",
        status="ready",
        chunk_count=1
    )
    test_db.add(res_a)
    await test_db.flush()

    chunk_a = ResourceChunk(
        id="chunk_a_1",
        resource_id=res_a.id,
        user_id=user_a.id,
        chunk_index=0,
        page_number=1,
        section_title="Total Internal Reflection",
        content="Critical angle formula is sin(theta_c) = n2 / n1.",
        embedding=embedding_service.generate_embedding("Critical angle formula is sin(theta_c) = n2 / n1.")
    )
    test_db.add(chunk_a)
    await test_db.commit()

    # 3. Security Attempt 1: Student B tries to retrieve Student A's resource metadata
    with pytest.raises(SecurityViolationError, match="does not belong to student"):
        await agent_tools.get_resource(user_id=user_b.id, resource_id=res_a.id, db=test_db)

    # 4. Security Attempt 2: Student B tries to retrieve Student A's raw chunks
    with pytest.raises(SecurityViolationError, match="does not belong to student"):
        await agent_tools.retrieve_resource_chunks(user_id=user_b.id, resource_id=res_a.id, db=test_db)

    # 5. Security Attempt 3: Student B searches resources for Student A's content
    results_b = await agent_tools.search_student_resources(
        user_id=user_b.id,
        query="Critical angle formula sin(theta_c)",
        top_k=5,
        db=test_db
    )
    assert len(results_b) == 0, "Student B must receive ZERO chunks from Student A"

    # 6. Student A searches and receives their own chunk
    results_a = await agent_tools.search_student_resources(
        user_id=user_a.id,
        query="Critical angle formula sin(theta_c)",
        top_k=5,
        db=test_db
    )
    assert len(results_a) == 1
    assert results_a[0]["chunk_id"] == "chunk_a_1"


# =========================================================================
# 4. Student Resource AI Grounding & Refusal Test
# =========================================================================
@pytest.mark.anyio
async def test_resource_ai_grounding_and_refusal(test_db: AsyncSession):
    """
    Test flow:
    1. Query supported by uploaded resource -> grounded answer with citations.
    2. Query unsupported by uploaded resource -> refusal message:
       'I couldn't find enough support for that answer in your uploaded resources.'
    """
    user = User(id="user_grounding_test", email="grounding@test.org", hashed_password="pw")
    test_db.add(user)
    await test_db.flush()

    res = Resource(
        id="res_photosynthesis",
        user_id=user.id,
        title="Plant Biology",
        file_name="bio.pdf",
        file_path="uploads/bio.pdf",
        file_type="pdf",
        status="ready",
        chunk_count=1
    )
    test_db.add(res)
    await test_db.flush()

    chunk = ResourceChunk(
        id="chunk_bio_1",
        resource_id=res.id,
        user_id=user.id,
        chunk_index=0,
        page_number=12,
        section_title="Chloroplast Thylakoid Membrane",
        content="The light-dependent reactions of photosynthesis take place in the thylakoid membrane using chlorophyll pigment.",
        embedding=embedding_service.generate_embedding("The light-dependent reactions of photosynthesis take place in the thylakoid membrane.")
    )
    test_db.add(chunk)
    await test_db.commit()

    # Case A: Supported question
    ans_supported = await openclaw_service.run_resource_agent(
        user_id=user.id,
        query="Where do the light-dependent reactions of photosynthesis take place?",
        resource_id=res.id,
        history=[],
        db=test_db
    )
    assert ans_supported["evidence_sufficient"] is True
    assert len(ans_supported["citations"]) > 0
    assert "thylakoid" in ans_supported["content"].lower()

    # Case B: Unsupported question
    ans_unsupported = await openclaw_service.run_resource_agent(
        user_id=user.id,
        query="What is the capital city of France during the Renaissance?",
        resource_id=res.id,
        history=[],
        db=test_db
    )
    assert ans_unsupported["evidence_sufficient"] is False
    assert ans_unsupported["citations"] == []
    assert "I couldn't find enough support for that answer in your uploaded resources." in ans_unsupported["content"]


# =========================================================================
# 5. Study Planner Agent & Persistence Test
# =========================================================================
@pytest.mark.anyio
async def test_study_planner_persists_plan(test_db: AsyncSession):
    """
    Test that the Study Planning Agent constructs and persists a structured plan
    in the database rather than discarding it.
    """
    user = User(id="user_study_planner", email="study_planner@test.org", hashed_password="pw")
    prof = Profile(user_id=user.id, name="Aarav", education_tier="Class 10", goal="CBSE Science 2026")
    concept = Concept(id="conc_optics", name="Lens Formula", subject="Physics", topic="Optics")
    ks = KnowledgeState(user_id=user.id, concept_id=concept.id, p_l=0.42, total_attempts=4, correct_attempts=1)

    test_db.add_all([user, prof, concept, ks])
    await test_db.commit()

    plan_result = await openclaw_service.run_study_planner_agent(
        user_id=user.id,
        db=test_db,
        custom_goal="Target 95% in Physics Boards"
    )

    assert plan_result["plan_id"] is not None
    assert plan_result["title"] is not None
    assert "milestones" in plan_result["plan_structure"]

    # Verify directly from Database
    stmt = select(StudyPlan).where(StudyPlan.id == plan_result["plan_id"])
    res = await test_db.execute(stmt)
    saved_plan = res.scalar_one_or_none()
    assert saved_plan is not None
    assert saved_plan.user_id == user.id
    assert saved_plan.status == "active"


# =========================================================================
# 6. Revision Agent & Deterministic Mathematics Test
# =========================================================================
@pytest.mark.anyio
async def test_revision_agent_and_retention_mathematics(test_db: AsyncSession):
    """
    Test that Revision Agent leverages deterministic half-life calculation:
    R(t) = 2^(-t/H) and Mentor Mate heuristic H_new = H_old * (1 + 1.8 * (1 - R))
    """
    user = User(id="user_rev_agent", email="rev_agent@test.org", hashed_password="pw")
    concept = Concept(id="conc_snell", name="Snell's Law", subject="Physics", topic="Refraction")
    
    # 3 days elapsed with half-life H = 3.0 -> R(t) = 0.50 (due for review)
    rev_item = RevisionItem(
        id="rev_snell",
        user_id=user.id,
        concept_id=concept.id,
        stability_days_s=3.0,
        last_reviewed_at=datetime.fromtimestamp(datetime.now(timezone.utc).timestamp() - (3 * 86400), tz=timezone.utc),
        next_review_at=datetime.now(timezone.utc)
    )
    test_db.add_all([user, concept, rev_item])
    await test_db.commit()

    # 1. Query agent for due challenge
    agent_output = await openclaw_service.run_revision_agent(user_id=user.id, db=test_db)
    assert agent_output["has_due_items"] is True
    assert agent_output["target_item"]["concept_name"] == "Snell's Law"
    assert abs(agent_output["target_item"]["retention"] - 0.50) < 0.05
    assert len(agent_output["challenge_prompt"]) > 0

    # 2. Record successful recall review
    event_result = await agent_tools.record_learning_event(
        user_id=user.id,
        event_data={"concept_id": concept.id, "is_correct": True},
        db=test_db
    )
    # H_new = 3.0 * (1 + 1.8 * (1 - 0.50)) = 5.7
    assert event_result["new_half_life_days"] > 5.0
    assert event_result["next_review_at"] is not None


# =========================================================================
# 7. Knowledge Analysis Agent Test
# =========================================================================
@pytest.mark.anyio
async def test_knowledge_analysis_agent(test_db: AsyncSession):
    """
    Test that Knowledge Analysis Agent identifies weak vs strong concepts
    and returns explainable recommendations.
    """
    user = User(id="user_ka_agent", email="ka_agent@test.org", hashed_password="pw")
    prof = Profile(user_id=user.id, name="Pooja")
    c1 = Concept(id="c_weak", name="Electric Flux", subject="Physics", topic="Electrostatics")
    c2 = Concept(id="c_strong", name="Ohm's Law", subject="Physics", topic="Current")
    ks1 = KnowledgeState(user_id=user.id, concept_id=c1.id, p_l=0.35, total_attempts=5, correct_attempts=1)
    ks2 = KnowledgeState(user_id=user.id, concept_id=c2.id, p_l=0.92, total_attempts=6, correct_attempts=6)

    test_db.add_all([user, prof, c1, c2, ks1, ks2])
    await test_db.commit()

    analysis = await openclaw_service.run_knowledge_analysis_agent(user_id=user.id, db=test_db)
    assert analysis["weak_count"] == 1
    assert analysis["strong_count"] == 1
    assert len(analysis["recommendations"]) > 0
    assert "Electric Flux" in str(analysis["summary"]["weak_concepts"])
    assert "Ohm's Law" in str(analysis["summary"]["strong_concepts"])
