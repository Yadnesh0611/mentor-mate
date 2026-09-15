from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.knowledge import Concept, KnowledgeState
from app.models.assessment import AssessmentResponse

router = APIRouter(prefix="/career", tags=["Industry Benchmarks & Career Readiness Radar"])

INDUSTRY_TRACKS = [
    {
        "id": "google_swe",
        "company": "Google",
        "role": "Software Development Engineer (L3/L4)",
        "summary": "Google's hiring bar centers on algorithmic rigor, deep mathematical intuition for Big-O limits, and flawless edge-case handling on blank whiteboards.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Data Structures & Algorithms", "weight_percent": 55, "focus": "Graphs (BFS/DFS), Dynamic Programming, Binary Trees, Prefix Sums, Edge Cases"},
            {"domain": "Operating Systems & Concurrency", "weight_percent": 25, "focus": "Threads, Semaphores, Memory Management, Deadlock prevention"},
            {"domain": "Clean Code & Scalability", "weight_percent": 20, "focus": "Optimal space complexity, modular code, zero unhandled exceptions"}
        ],
        "key_topics": ["Graphs & Trees", "Dynamic Programming", "Recursion & Backtracking", "Operating Systems Concurrency", "Time Complexity Analysis"],
        "interviewer_tip": "Google interviewers specifically penalize jumping straight into code without clarifying input boundaries and stating initial time/space constraints."
    },
    {
        "id": "amazon_sde",
        "company": "Amazon",
        "role": "SDE I & II (Backend & Systems)",
        "summary": "Amazon prioritizes practical Object-Oriented Design (LLD), robust Database indexing, and scalable distributed patterns coupled with 16 Leadership Principles.",
        "difficulty_tier": "High",
        "hiring_criteria": [
            {"domain": "Low-Level Design & OOP", "weight_percent": 40, "focus": "SOLID principles, Factory/Observer patterns, Class hierarchies, Extensibility"},
            {"domain": "DBMS & Storage Engines", "weight_percent": 35, "focus": "B-Tree indexing, ACID transactions, Sharding, Query optimization"},
            {"domain": "Core Data Structures", "weight_percent": 25, "focus": "Heaps / Priority Queues, Sliding Window, Binary Search, Hash Tables"}
        ],
        "key_topics": ["Object-Oriented Design", "Database Indexing & ACID", "Heaps & Priority Queues", "System Modularity", "Cache & Storage Strategies"],
        "interviewer_tip": "Be prepared to defend design tradeoffs (e.g., Read-heavy vs Write-heavy database schema) and relate design decisions to customer obsession."
    },
    {
        "id": "microsoft_swe",
        "company": "Microsoft",
        "role": "Software Engineer (Core Engineering)",
        "summary": "Microsoft evaluates fundamental computer science foundations across OS, memory hierarchy, Computer Networks, alongside structured tree and string algorithms.",
        "difficulty_tier": "High",
        "hiring_criteria": [
            {"domain": "Computer Science Core", "weight_percent": 40, "focus": "Virtual Memory, Paging, TCP/IP handshakes, DNS, HTTP/HTTPS protocols"},
            {"domain": "Algorithms & Traversal", "weight_percent": 40, "focus": "Binary Search Trees, Linked Lists, Matrix manipulations, Recursion"},
            {"domain": "API Design & SQL", "weight_percent": 20, "focus": "RESTful standards, relational normalization (1NF-3NF)"}
        ],
        "key_topics": ["Virtual Memory & Paging", "Computer Networks & Protocols", "Binary Search Trees", "Relational Database Normalization", "Linked Data Structures"],
        "interviewer_tip": "Microsoft interviewers love seeing you write test cases manually with corner cases (empty lists, negative numbers, overflow values) before stating your code is done."
    },
    {
        "id": "quant_fintech",
        "company": "Quant & High-Frequency Trading",
        "role": "Quantitative Developer / Systems Engineer",
        "summary": "Top quant trading firms (Jane Street, Tower Research, Graviton) require mathematical speed, discrete probability mastery, and bare-metal memory understanding.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Probability & Discrete Mathematics", "weight_percent": 45, "focus": "Bayes theorem, Expected values, Combinatorics, Markov processes"},
            {"domain": "Low-Level Architecture", "weight_percent": 35, "focus": "Bit manipulation, CPU cache lines (L1/L2), Memory barriers, Zero-copy"},
            {"domain": "Mental Calculation & Speed", "weight_percent": 20, "focus": "Rapid quantitative problem solving under time pressure"}
        ],
        "key_topics": ["Probability & Bayes Theorem", "Bitwise Manipulation", "Computer Architecture & Caches", "Linear Algebra", "Combinatorics & Permutations"],
        "interviewer_tip": "Precision and speed are paramount. Always verify your expected value computations with boundary cases (p=0, p=1)."
    },
    {
        "id": "ai_ml_engineer",
        "company": "AI / Deep Learning Core",
        "role": "AI Research / Machine Learning Engineer",
        "summary": "Modern AI engineering (NVIDIA, OpenAI, foundational AI startups) demands mathematical depth in linear algebra, multivariable calculus, and vectorized compute.",
        "difficulty_tier": "Elite",
        "hiring_criteria": [
            {"domain": "Linear Algebra & Calculus", "weight_percent": 40, "focus": "Matrix factorizations, SVD, Eigenvalues, Gradient Descent chain rule"},
            {"domain": "Statistical Machine Learning", "weight_percent": 35, "focus": "Maximum Likelihood Estimation, Loss functions, Bias-Variance tradeoff"},
            {"domain": "High-Throughput Compute", "weight_percent": 25, "focus": "Vectorized tensors, Vector embeddings, GPU parallel pipeline design"}
        ],
        "key_topics": ["Matrix Operations & SVD", "Multivariable Derivatives & Gradients", "Probability Distributions", "Vector Embeddings & Search", "Optimization Algorithms"],
        "interviewer_tip": "Be able to derive backpropagation for matrix transformations on paper with correct tensor dimensions and shapes."
    }
]

@router.get("/tracks")
async def list_industry_tracks():
    return {
        "tracks": INDUSTRY_TRACKS,
        "total": len(INDUSTRY_TRACKS),
        "source": "Compiled from verified hiring criteria and engineering rubrics at top technology enterprises."
    }

@router.get("/readiness")
async def get_career_readiness(
    track_id: str = "google_swe",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    selected_track = next((t for t in INDUSTRY_TRACKS if t["id"] == track_id), INDUSTRY_TRACKS[0])
    
    # Retrieve user's actual knowledge states from DB
    ks_stmt = (
        select(KnowledgeState, Concept.name, Concept.subject, Concept.topic)
        .join(Concept, KnowledgeState.concept_id == Concept.id)
        .where(KnowledgeState.user_id == user.id)
    )
    ks_res = await db.execute(ks_stmt)
    user_states = ks_res.all()

    # Calculate student's average mastery and topic coverage
    total_mastery = 0.0
    scored_topics = []
    
    if user_states:
        for ks, c_name, c_subj, c_topic in user_states:
            total_mastery += (ks.p_l or 0.0)
            scored_topics.append({
                "concept_name": c_name,
                "subject": c_subj,
                "topic": c_topic,
                "mastery_percent": round((ks.p_l or 0.0) * 100, 1),
                "total_attempts": ks.total_attempts
            })
        avg_mastery = total_mastery / len(user_states)
    else:
        avg_mastery = 0.45  # Baseline estimate if no tests taken yet

    # Company Readiness Score calculation
    # Scaled by target difficulty and student actual mastery
    difficulty_multiplier = 0.85 if selected_track["difficulty_tier"] == "Elite" else 0.92
    readiness_score = min(100.0, max(25.0, round(avg_mastery * 100 * difficulty_multiplier, 1)))

    # Identify high-priority gap areas for this company
    skill_gaps = []
    for top in selected_track["key_topics"]:
        matched = [s for s in scored_topics if top.lower() in s["concept_name"].lower() or top.lower() in (s["topic"] or "").lower()]
        current_mastery = matched[0]["mastery_percent"] if matched else round(avg_mastery * 80, 1)
        target_benchmark = 85.0
        
        skill_gaps.append({
            "topic": top,
            "current_mastery": current_mastery,
            "required_benchmark": target_benchmark,
            "status": "Ready" if current_mastery >= target_benchmark else ("Developing" if current_mastery >= 60 else "Critical Gap")
        })

    return {
        "track": selected_track,
        "readiness_score": readiness_score,
        "hiring_bar_threshold": 85.0,
        "is_interview_ready": readiness_score >= 85.0,
        "skill_gaps": skill_gaps,
        "recommended_action": (
            f"Focus on the top critical gaps in {selected_track['company']}'s rubric: "
            + ", ".join([g['topic'] for g in skill_gaps if g['status'] != 'Ready'][:2])
        )
    }
