import math
import pytest
from app.services.bkt_service import bkt_service
from app.services.irt_service import irt_service
from app.services.retention_service import retention_service
from app.services.embedding_service import embedding_service
from app.services.chunking_service import chunking_service, Chunk
from app.services.extraction_service import ExtractedSection
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token

def test_bkt_mathematics():
    # Test correct observation increases mastery
    prior = 0.35
    p_t = 0.15
    p_g = 0.20
    p_s = 0.10
    
    evidence_p_l, next_p_l = bkt_service.update_mastery(prior, is_correct=True, p_t=p_t, p_g=p_g, p_s=p_s)
    # Correct response should significantly boost latent probability
    assert next_p_l > prior
    assert next_p_l > 0.60

    # Test incorrect observation decreases mastery
    evidence_p_l_wrong, next_p_l_wrong = bkt_service.update_mastery(prior, is_correct=False, p_t=p_t, p_g=p_g, p_s=p_s)
    assert next_p_l_wrong < next_p_l
    assert evidence_p_l_wrong < prior

def test_irt_2pl_formulation():
    # When ability theta equals difficulty b, probability must be exactly 0.50
    p_mid = irt_service.probability_correct(theta=0.5, difficulty_b=0.5, discrimination_a=1.0)
    assert abs(p_mid - 0.5) < 1e-4

    # High ability student on easy question should have high probability
    p_high = irt_service.probability_correct(theta=2.0, difficulty_b=0.0, discrimination_a=1.5)
    assert p_high > 0.90

    # Test MAP estimation convergence
    responses = [
        {"is_correct": True, "difficulty": 0.2, "discrimination": 1.0},
        {"is_correct": True, "difficulty": 0.6, "discrimination": 1.0},
        {"is_correct": True, "difficulty": 1.0, "discrimination": 1.2}
    ]
    theta = irt_service.estimate_ability_map(responses)
    assert theta > 0.5  # Consistent correct answers on higher difficulties yields positive latent ability

def test_ebbinghaus_retention_decay():
    # 1. Exact Proof Points: H = 3
    # H = 3, t = 0  → R = 1
    r_t0 = retention_service.calculate_retention(elapsed_days=0.0, half_life_days_h=3.0)
    assert abs(r_t0 - 1.0) < 1e-6

    # H = 3, t = 3  → R = 0.5
    r_t3 = retention_service.calculate_retention(elapsed_days=3.0, half_life_days_h=3.0)
    assert abs(r_t3 - 0.5) < 1e-6

    # H = 3, t = 6  → R = 0.25
    r_t6 = retention_service.calculate_retention(elapsed_days=6.0, half_life_days_h=3.0)
    assert abs(r_t6 - 0.25) < 1e-6

    # H = 3, t = 9  → R = 0.125
    r_t9 = retention_service.calculate_retention(elapsed_days=9.0, half_life_days_h=3.0)
    assert abs(r_t9 - 0.125) < 1e-6

    # 2. Verify increasing t decreases R (monotonic decay)
    r1 = retention_service.calculate_retention(elapsed_days=1.0, half_life_days_h=4.0)
    r2 = retention_service.calculate_retention(elapsed_days=2.0, half_life_days_h=4.0)
    r3 = retention_service.calculate_retention(elapsed_days=3.0, half_life_days_h=4.0)
    assert r1 > r2 > r3

    # 3. Verify increasing H slows decay
    r_small_h = retention_service.calculate_retention(elapsed_days=3.0, half_life_days_h=2.0)
    r_large_h = retention_service.calculate_retention(elapsed_days=3.0, half_life_days_h=6.0)
    assert r_large_h > r_small_h

    # 4. Verify H <= 0 is rejected
    with pytest.raises(ValueError, match="Memory half-life H must be greater than zero"):
        retention_service.calculate_retention(elapsed_days=1.0, half_life_days_h=0.0)

    with pytest.raises(ValueError, match="Memory half-life H must be greater than zero"):
        retention_service.calculate_retention(elapsed_days=1.0, half_life_days_h=-2.5)

    # 5. Verify negative elapsed time is rejected
    with pytest.raises(ValueError, match="Elapsed time t cannot be negative"):
        retention_service.calculate_retention(elapsed_days=-1.0, half_life_days_h=3.0)

    # 6. Verify no NaN / Infinity
    for t in [0.0, 0.5, 10.0, 100.0]:
        for h in [0.5, 3.0, 30.0]:
            val = retention_service.calculate_retention(elapsed_days=t, half_life_days_h=h)
            assert not math.isnan(val)
            assert not math.isinf(val)
            assert 0.0 <= val <= 1.0

    # 7. Verify revision scheduling produces valid future dates with Mentor Mate heuristic
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    new_h, next_review_at = retention_service.update_half_life_after_review(
        current_half_life_h=3.0,
        is_remembered=True,
        current_retention=0.5
    )
    # H_new = 3.0 * (1 + 1.8 * (1 - 0.5)) = 3.0 * (1 + 0.9) = 5.7
    assert abs(new_h - 5.7) < 1e-2
    assert next_review_at > now


def test_embedding_cosine_similarity():
    vec1 = embedding_service.generate_embedding("Refraction and Snell\'s law convex lens focal point")
    vec2 = embedding_service.generate_embedding("Snell\'s law optical refraction ray optics")
    vec3 = embedding_service.generate_embedding("Organic chemistry benzene rings aromatic IUPAC")

    sim_optics = embedding_service.cosine_similarity(vec1, vec2)
    sim_cross = embedding_service.cosine_similarity(vec1, vec3)

    assert sim_optics > sim_cross
    assert sim_optics > 0.35

def test_semantic_chunking_metadata():
    sections = [
        ExtractedSection(content="Word " * 500, page_number=1, section_title="Introduction to Optics"),
        ExtractedSection(content="Formula " * 200, page_number=2, section_title="Lens Formula")
    ]
    chunks = chunking_service.chunk_sections(sections)
    assert len(chunks) >= 2
    assert chunks[0].page_number == 1
    assert chunks[0].section_title == "Introduction to Optics"
    assert chunks[-1].page_number == 2

def test_security_auth():
    pwd = "StudentPassword2026!"
    hashed = get_password_hash(pwd)
    assert verify_password(pwd, hashed)
    assert not verify_password("WrongPassword", hashed)

    token = create_access_token("user_12345")
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "user_12345"

def test_nptel_courses_curation():
    from app.services.course_service import CURATED_OPEN_SOURCE_COURSES
    assert "aiml" in CURATED_OPEN_SOURCE_COURSES
    assert "general_cs" in CURATED_OPEN_SOURCE_COURSES
    assert "electronics_electrical" in CURATED_OPEN_SOURCE_COURSES
    assert "mechanical" in CURATED_OPEN_SOURCE_COURSES
    
    # Check that NPTEL courses from top IITs exist with official Swayam links
    all_courses = []
    for field, courses in CURATED_OPEN_SOURCE_COURSES.items():
        all_courses.extend(courses)
    
    nptel_courses = [c for c in all_courses if "NPTEL" in c.get("source_platform", "")]
    assert len(nptel_courses) >= 6
    for nc in nptel_courses:
        assert nc["external_url"].startswith("https://swayam.gov.in/explorer?searchText=")
        assert any(inst in nc["description"] for inst in ["IIT", "IISc", "NPTEL", "Prof."])
        assert len(nc["modules"]) > 0

def test_tech_job_matching_and_career_tracks():
    from app.api.career import TECH_JOB_LISTINGS, INDUSTRY_TRACKS
    assert len(TECH_JOB_LISTINGS) >= 10
    assert len(INDUSTRY_TRACKS) >= 40
    
    # Test job listing integrity
    for job in TECH_JOB_LISTINGS:
        assert "id" in job
        assert "company" in job
        assert "role" in job
        assert "required_skills" in job
        assert len(job["required_skills"]) > 0
        assert job["apply_url"].startswith("https://www.linkedin.com/jobs/search/?keywords=")
    
    # Test track rubrics
    google_track = next((t for t in INDUSTRY_TRACKS if t["id"] == "google_swe"), None)
    assert google_track is not None
    assert google_track["company"] == "Google"
    assert len(google_track["hiring_criteria"]) > 0
    assert len(google_track["key_topics"]) > 0



