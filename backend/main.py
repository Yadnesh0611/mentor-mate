import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.api.auth import router as auth_router
from app.api.resources import router as resources_router
from app.api.resource_ai import router as resource_ai_router
from app.api.mentor import router as mentor_router
from app.api.assessments import router as assessments_router
from app.api.revision import router as revision_router
from app.api.knowledge import router as knowledge_router
from app.api.dashboard import router as dashboard_router
from app.api.health import router as health_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("mentormate")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing Mentor Mate database tables...")
    await init_db()
    logger.info("Mentor Mate backend successfully started and ready for academic twin workloads.")
    yield
    logger.info("Mentor Mate backend shutting down cleanly.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request
from fastapi.responses import JSONResponse
from app.services.ai_service import AIServiceUnavailableError
from app.services.agent_tools import SecurityViolationError

@app.exception_handler(AIServiceUnavailableError)
async def ai_service_unavailable_handler(request: Request, exc: AIServiceUnavailableError):
    return JSONResponse(
        status_code=503,
        content={
            "detail": "AI Gateway (OmniRoute) is temporarily unavailable. Please retry shortly.",
            "error_code": "AI_SERVICE_UNAVAILABLE"
        }
    )

@app.exception_handler(SecurityViolationError)
async def security_violation_handler(request: Request, exc: SecurityViolationError):
    return JSONResponse(
        status_code=403,
        content={
            "detail": str(exc),
            "error_code": "SECURITY_VIOLATION"
        }
    )

# Mount all API routers
api_prefix = settings.API_V1_STR
app.include_router(auth_router, prefix=api_prefix)
app.include_router(resources_router, prefix=api_prefix)
app.include_router(resource_ai_router, prefix=api_prefix)
app.include_router(mentor_router, prefix=api_prefix)
app.include_router(assessments_router, prefix=api_prefix)
app.include_router(revision_router, prefix=api_prefix)
app.include_router(knowledge_router, prefix=api_prefix)
app.include_router(dashboard_router, prefix=api_prefix)
from app.api.mastery import router as mastery_router
from app.api.schedule import router as schedule_router
from app.api.courses import router as courses_router
from app.api.wellbeing import router as wellbeing_router
from app.api.career import router as career_router

app.include_router(mastery_router, prefix=api_prefix)
app.include_router(schedule_router, prefix=api_prefix)
app.include_router(courses_router, prefix=api_prefix)
app.include_router(wellbeing_router, prefix=api_prefix)
app.include_router(career_router, prefix=api_prefix)
app.include_router(health_router, prefix=api_prefix)


@app.get("/")
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": "1.0.0",
        "status": "active",
        "docs": f"{settings.API_V1_STR}/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
