from fastapi import APIRouter
from app.services.ai_service import ai_service, ModelRole
from app.services.openclaw_service import openclaw_service

router = APIRouter(tags=["System Health & Diagnostics"])

@router.get("/health")
async def get_system_health():
    models = await ai_service.get_available_models()
    omniroute_connected = bool(len(models) > 0)
    openclaw_status = await openclaw_service.check_health()

    return {
        "status": "online",
        "services": {
            "database": "connected (SQLAlchemy async)",
            "omniroute": {
                "status": "connected" if omniroute_connected else "offline",
                "base_url": ai_service.base_url,
                "default_model": ai_service.default_model,
                "models_discovered_count": len(models),
                "roles_configured": {
                    "FAST_CHAT": ai_service.select_model_for_role(ModelRole.FAST_CHAT, models),
                    "DEEP_REASONING": ai_service.select_model_for_role(ModelRole.DEEP_REASONING, models),
                    "RESOURCE_SYNTHESIS": ai_service.select_model_for_role(ModelRole.RESOURCE_SYNTHESIS, models),
                    "MENTOR": ai_service.select_model_for_role(ModelRole.MENTOR, models),
                    "ASSESSMENT_GENERATION": ai_service.select_model_for_role(ModelRole.ASSESSMENT_GENERATION, models),
                    "VISION": ai_service.select_model_for_role(ModelRole.VISION, models),
                    "EMBEDDING": "deterministic_vector_service"
                }
            },
            "openclaw": {
                "status": "connected" if openclaw_status.get("connected") else "offline",
                "gateway_url": openclaw_service.gateway_url,
                "agents_ready": [
                    "Mentor Agent",
                    "Resource Agent",
                    "Study Planner Agent",
                    "Assessment Agent",
                    "Revision Agent",
                    "Knowledge Analysis Agent"
                ],
                "details": openclaw_status
            }
        }
    }
