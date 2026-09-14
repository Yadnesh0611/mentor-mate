from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import settings

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    connect_args={"timeout": 30.0} if "sqlite" in settings.DATABASE_URL else {}
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

from sqlalchemy import text

async def init_db():
    import app.models  # Ensure all models are registered on Base.metadata
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

        # Ensure dynamic assessment columns exist in SQLite without resetting DB
        if "sqlite" in settings.DATABASE_URL:
            def migrate_sqlite_columns(sync_conn):
                try:
                    res = sync_conn.execute(text("PRAGMA table_info(assessment_items)")).fetchall()
                    existing_items_cols = {row[1] for row in res}
                    if "question_type" not in existing_items_cols:
                        sync_conn.execute(text("ALTER TABLE assessment_items ADD COLUMN question_type VARCHAR(50) DEFAULT 'mcq'"))
                    if "rubric" not in existing_items_cols:
                        sync_conn.execute(text("ALTER TABLE assessment_items ADD COLUMN rubric JSON"))
                    if "diagram_code" not in existing_items_cols:
                        sync_conn.execute(text("ALTER TABLE assessment_items ADD COLUMN diagram_code TEXT"))
                    if "diagram_type" not in existing_items_cols:
                        sync_conn.execute(text("ALTER TABLE assessment_items ADD COLUMN diagram_type VARCHAR(50)"))

                    # assessments columns
                    res_assess = sync_conn.execute(text("PRAGMA table_info(assessments)")).fetchall()
                    existing_assess_cols = {row[1] for row in res_assess}
                    if "difficulty_mode" not in existing_assess_cols:
                        sync_conn.execute(text("ALTER TABLE assessments ADD COLUMN difficulty_mode VARCHAR(50) DEFAULT 'adaptive'"))

                    res_resp = sync_conn.execute(text("PRAGMA table_info(assessment_responses)")).fetchall()
                    existing_resp_cols = {row[1] for row in res_resp}
                    if "text_response" not in existing_resp_cols:
                        sync_conn.execute(text("ALTER TABLE assessment_responses ADD COLUMN text_response TEXT"))
                    if "score_awarded" not in existing_resp_cols:
                        sync_conn.execute(text("ALTER TABLE assessment_responses ADD COLUMN score_awarded REAL DEFAULT 0.0"))
                    if "ai_feedback" not in existing_resp_cols:
                        sync_conn.execute(text("ALTER TABLE assessment_responses ADD COLUMN ai_feedback TEXT"))
                    if "missing_concepts" not in existing_resp_cols:
                        sync_conn.execute(text("ALTER TABLE assessment_responses ADD COLUMN missing_concepts JSON"))

                    # revision_items columns
                    res_rev = sync_conn.execute(text("PRAGMA table_info(revision_items)")).fetchall()
                    existing_rev_cols = {row[1] for row in res_rev}
                    if "revision_type" not in existing_rev_cols:
                        sync_conn.execute(text("ALTER TABLE revision_items ADD COLUMN revision_type VARCHAR(50) DEFAULT 'field_curriculum'"))
                    if "source_context" not in existing_rev_cols:
                        sync_conn.execute(text("ALTER TABLE revision_items ADD COLUMN source_context VARCHAR(50) DEFAULT 'curriculum'"))
                    if "topic_title" not in existing_rev_cols:
                        sync_conn.execute(text("ALTER TABLE revision_items ADD COLUMN topic_title VARCHAR(255)"))
                    if "resource_id" not in existing_rev_cols:
                        sync_conn.execute(text("ALTER TABLE revision_items ADD COLUMN resource_id VARCHAR(36)"))
                    if "folder_id" not in existing_rev_cols:
                        sync_conn.execute(text("ALTER TABLE revision_items ADD COLUMN folder_id VARCHAR(36)"))
                    if "flashcards" not in existing_rev_cols:
                        sync_conn.execute(text("ALTER TABLE revision_items ADD COLUMN flashcards JSON"))
                    if "mindmap_code" not in existing_rev_cols:
                        sync_conn.execute(text("ALTER TABLE revision_items ADD COLUMN mindmap_code TEXT"))
                    if "quick_summary" not in existing_rev_cols:
                        sync_conn.execute(text("ALTER TABLE revision_items ADD COLUMN quick_summary TEXT"))
                    if "speed_quiz" not in existing_rev_cols:
                        sync_conn.execute(text("ALTER TABLE revision_items ADD COLUMN speed_quiz JSON"))
                    if "last_score" not in existing_rev_cols:
                        sync_conn.execute(text("ALTER TABLE revision_items ADD COLUMN last_score REAL"))

                    # users columns
                    res_user = sync_conn.execute(text("PRAGMA table_info(users)")).fetchall()
                    existing_user_cols = {row[1] for row in res_user}
                    if "mastery_score" not in existing_user_cols:
                        sync_conn.execute(text("ALTER TABLE users ADD COLUMN mastery_score REAL DEFAULT 0.0"))
                    if "field_of_study" not in existing_user_cols:
                        sync_conn.execute(text("ALTER TABLE users ADD COLUMN field_of_study VARCHAR(100)"))

                    # study_schedules table columns
                    res_sched = sync_conn.execute(text("PRAGMA table_info(study_schedules)")).fetchall()
                    existing_sched_cols = {row[1] for row in res_sched}
                    if existing_sched_cols:
                        if "time_range" not in existing_sched_cols:
                            sync_conn.execute(text("ALTER TABLE study_schedules ADD COLUMN time_range VARCHAR(50) DEFAULT '1_week'"))
                        if "field_of_study" not in existing_sched_cols:
                            sync_conn.execute(text("ALTER TABLE study_schedules ADD COLUMN field_of_study VARCHAR(100)"))
                        if "title" not in existing_sched_cols:
                            sync_conn.execute(text("ALTER TABLE study_schedules ADD COLUMN title VARCHAR(255)"))
                except Exception as e:
                    import logging
                    logging.getLogger("mentormate").warning(f"Column migration check note: {e}")

            await conn.run_sync(migrate_sqlite_columns)


