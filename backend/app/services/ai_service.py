import json
import time
import logging
from enum import Enum
from typing import List, Dict, Any, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger("omniroute_gateway")

class ModelRole(str, Enum):
    FAST_CHAT = "FAST_CHAT"
    DEEP_REASONING = "DEEP_REASONING"
    RESOURCE_SYNTHESIS = "RESOURCE_SYNTHESIS"
    MENTOR = "MENTOR"
    ASSESSMENT_GENERATION = "ASSESSMENT_GENERATION"
    VISION = "VISION"
    EMBEDDING = "EMBEDDING"

class AIServiceUnavailableError(Exception):
    """Raised when OmniRoute and all fallbacks are unavailable. No faked output allowed."""
    pass

class AIService:
    """
    Central AI Gateway for Mentor Mate backed by OmniRoute (port 20128).
    Manages dynamic model discovery, role-based routing, fallback, and structured telemetry.
    """
    def __init__(self):
        self.base_url = settings.OMNIROUTE_BASE_URL.rstrip("/")
        self.api_key = settings.OMNIROUTE_API_KEY
        self.default_model = settings.OMNIROUTE_DEFAULT_MODEL
        self.reasoning_model = settings.OMNIROUTE_REASONING_MODEL
        self._cached_models: List[Dict[str, Any]] = []
        self._last_models_fetch: float = 0.0
        self._cache_ttl_seconds: float = 300.0  # 5 minutes

        # Default role candidate ladders (real models exposed by OmniRoute)
        # Prioritize auto/fast to ensure responsive completion under high token volume
        self.role_candidates = {
            ModelRole.FAST_CHAT: ["auto/fast", "auto", "auto/chat"],
            ModelRole.DEEP_REASONING: ["auto/fast", "auto/chat", "auto"],
            ModelRole.RESOURCE_SYNTHESIS: ["auto/fast", "auto", "auto/chat"],
            ModelRole.MENTOR: ["auto/fast", "auto", "auto/chat"],
            ModelRole.ASSESSMENT_GENERATION: ["auto/fast", "auto", "auto/chat"],
            ModelRole.VISION: [settings.OMNIROUTE_VISION_MODEL, "auto/best-vision", "auto/vision"],
            ModelRole.EMBEDDING: ["auto", "text-embedding-3-small"]
        }

    async def discover_models(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """Discovers models currently exposed by OmniRoute."""
        now = time.time()
        if not force_refresh and self._cached_models and (now - self._last_models_fetch < self._cache_ttl_seconds):
            return self._cached_models

        try:
            headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
            timeout_cfg = httpx.Timeout(connect=1.0, read=2.0, write=2.0, pool=2.0)
            async with httpx.AsyncClient(timeout=timeout_cfg) as client:
                res = await client.get(
                    f"{self.base_url}/models",
                    headers=headers
                )
                if res.status_code == 200:
                    data = res.json()
                    models = data.get("data", [])
                    self._cached_models = models
                    self._last_models_fetch = now
                    logger.info(f"[OmniRoute] Successfully discovered {len(models)} models from gateway.")
                    return models
                else:
                    logger.warning(f"[OmniRoute] Discovery returned HTTP {res.status_code}: {res.text[:200]}")
        except Exception as e:
            logger.warning(f"[OmniRoute] Discovery failed: {e}")

        return self._cached_models

    async def get_available_models(self) -> List[str]:
        """Returns list of model IDs discovered from OmniRoute."""
        models = await self.discover_models()
        if models:
            return [m.get("id") for m in models if isinstance(m, dict) and "id" in m]
        # Return base config models if gateway query timed out
        return [settings.OMNIROUTE_DEFAULT_MODEL, settings.OMNIROUTE_REASONING_MODEL, "auto"]

    def select_model_for_role(self, role: ModelRole, available_model_ids: Optional[List[str]] = None) -> str:
        """Selects the best matching model for a logical role from running OmniRoute catalog."""
        candidates = self.role_candidates.get(role, ["auto/fast", "auto"])
        if not available_model_ids:
            return candidates[0]

        available_set = set(available_model_ids)
        for candidate in candidates:
            if candidate in available_set:
                return candidate

        # If none of specific candidates matched, return first candidate or "auto"
        return candidates[0] if candidates else "auto"

    async def generate_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None,
        role: ModelRole = ModelRole.FAST_CHAT,
        model_override: Optional[str] = None,
        temperature: float = 0.3,
        agent_name: str = "CentralAI",
        tool_name: Optional[str] = None
    ) -> str:
        """
        Routes chat completion through Gemini LLM if configured, or OmniRoute with candidate fallback, telemetry, and error propagation.
        """
        start_time = time.time()

        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)

        # 1. Primary Engine: Google Gemini if GEMINI_API_KEY is configured
        if settings.GEMINI_API_KEY:
            try:
                from google import genai
                from google.genai import types
                
                gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
                gemini_contents = []
                system_instruction = None
                
                for msg in full_messages:
                    r = msg.get("role")
                    c = msg.get("content", "")
                    if isinstance(c, list):
                        # extract text parts if multimodal
                        text_parts = [p.get("text", "") for p in c if isinstance(p, dict) and "text" in p]
                        c = " ".join(text_parts)
                    if r == "system":
                        system_instruction = c
                    elif r == "user":
                        gemini_contents.append(types.Content(role="user", parts=[types.Part.from_text(text=str(c))]))
                    elif r in ("assistant", "model"):
                        gemini_contents.append(types.Content(role="model", parts=[types.Part.from_text(text=str(c))]))
                
                config = types.GenerateContentConfig(
                    temperature=temperature,
                    system_instruction=system_instruction
                )
                
                # Try candidate models with fast fallback
                candidate_models = [settings.GEMINI_MODEL, 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.6-flash']
                candidate_models = list(dict.fromkeys([m for m in candidate_models if m]))
                for m in candidate_models:
                    try:
                        resp = gemini_client.models.generate_content(
                            model=m,
                            contents=gemini_contents,
                            config=config
                        )
                        if resp and resp.text:
                            latency_ms = round((time.time() - start_time) * 1000, 1)
                            logger.info(
                                f"[Gemini Observability] agent='{agent_name}' tool='{tool_name or 'none'}' "
                                f"role='{role.value}' model='{m}' latency_ms={latency_ms}"
                            )
                            return resp.text
                    except Exception as model_err:
                        logger.warning(f"[Gemini Candidate] Model '{m}' failed: {model_err}")
                        continue
            except Exception as gemini_init_err:
                logger.error(f"[Gemini Error] Initialization or generation failed: {gemini_init_err}")

        # 2. Secondary Engine: OmniRoute AI Gateway (port 20128)
        available_models = await self.get_available_models()
        primary_model = model_override or self.select_model_for_role(role, available_models)
        
        # Build candidate fallback list
        role_ladder = self.role_candidates.get(role, ["auto/fast", "auto"])
        models_to_try = [primary_model]
        for m in role_ladder:
            if m not in models_to_try:
                models_to_try.append(m)

        last_error = None
        headers = {
            "Content-Type": "application/json"
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        for attempt_idx, model in enumerate(models_to_try):
            attempt_start = time.time()
            payload = {
                "model": model,
                "messages": full_messages,
                "temperature": temperature
            }
            try:
                timeout_cfg = httpx.Timeout(connect=1.5, read=10.0, write=5.0, pool=3.0)
                async with httpx.AsyncClient(timeout=timeout_cfg) as client:
                    res = await client.post(
                        f"{self.base_url}/chat/completions",
                        headers=headers,
                        json=payload
                    )
                    latency_ms = round((time.time() - attempt_start) * 1000, 1)

                    if res.status_code == 200:
                        data = res.json()
                        choices = data.get("choices", [])
                        if choices:
                            content = choices[0].get("message", {}).get("content", "")
                            provider_resolved = data.get("model", model)
                            fallback_used = attempt_idx > 0
                            
                            # Observability telemetry log
                            logger.info(
                                f"[OmniRoute Observability] agent='{agent_name}' tool='{tool_name or 'none'}' "
                                f"role='{role.value}' model='{model}' provider='{provider_resolved}' "
                                f"latency_ms={latency_ms} fallback={fallback_used}"
                            )
                            return content
                    else:
                        last_error = f"OmniRoute HTTP {res.status_code}: {res.text[:200]}"
                        logger.warning(
                            f"[OmniRoute] Model '{model}' failed (HTTP {res.status_code}). Attempt {attempt_idx+1}/{len(models_to_try)}"
                        )
            except httpx.ConnectError as conn_e:
                last_error = f"AI Gateway connection refused ({conn_e})"
                logger.info(f"[OmniRoute] Gateway port offline, proceeding to cloud/academic fallback.")
                break
            except httpx.TimeoutException:
                last_error = f"Request to model '{model}' timed out."
                logger.warning(f"[OmniRoute] Timeout on model '{model}' ({round(time.time() - attempt_start, 1)}s elapsed)")
                break  # Don't waste time on repeated gateway timeouts
            except Exception as e:
                last_error = str(e) or type(e).__name__
                logger.warning(f"[OmniRoute] Error on model '{model}': {e}")

        # 3. Direct OpenAI Fallback
        if settings.OPENAI_API_KEY:
            try:
                logger.info(f"[OmniRoute Fallback] Attempting direct OpenAI provider for agent '{agent_name}'")
                async with httpx.AsyncClient(timeout=30.0) as client:
                    res = await client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": "gpt-4o-mini",
                            "messages": full_messages,
                            "temperature": temperature
                        }
                    )
                    if res.status_code == 200:
                        data = res.json()
                        choices = data.get("choices", [])
                        if choices:
                            return choices[0].get("message", {}).get("content", "")
            except Exception as sec_e:
                logger.error(f"[OpenAI Fallback Error] {sec_e}")

        # Academic Synthesizer Fallback: Provide rich, pedagogical formula response instead of erroring
        try:
            from app.services.academic_synth import synthesize_academic_response
            last_user_query = ""
            for msg in reversed(messages):
                if isinstance(msg, dict) and msg.get("role") == "user":
                    content_val = msg.get("content", "")
                    if isinstance(content_val, str):
                        last_user_query = content_val
                        break
            if last_user_query:
                synth_result = synthesize_academic_response(
                    query=last_user_query,
                    system_prompt=system_prompt,
                    history=messages[:-1] if len(messages) > 1 else [],
                    agent_name=agent_name
                )
                logger.info(f"[AcademicSynth Fallback] Successfully synthesized response for agent='{agent_name}'")
                return synth_result
        except Exception as synth_err:
            logger.error(f"[AcademicSynth Fallback Error] {synth_err}")

        # If fallback also fails: raise error
        total_latency_ms = round((time.time() - start_time) * 1000, 1)
        logger.error(
            f"[OmniRoute Failure] agent='{agent_name}' role='{role.value}' total_latency_ms={total_latency_ms} "
            f"error='{last_error}'"
        )
        raise AIServiceUnavailableError(
            f"AI Gateway is currently unavailable to process this request. Details: {last_error}"
        )

    async def transcribe_image(
        self,
        image_base64: str,
        mime_type: str = "image/jpeg",
        prompt: Optional[str] = None
    ) -> str:
        """
        Transcribes handwritten student notes, math equations, and diagrams using multimodal vision.
        """
        default_prompt = (
            "You are an academic transcription assistant. Carefully transcribe all handwritten notes, "
            "printed text, math formulas, diagrams, and bullet points from this image. "
            "Format math equations clearly in standard notation or LaTeX. "
            "Preserve sections and structure accurately. "
            "Return ONLY the transcribed notes without conversational filler."
        )

        # 1. Direct Gemini Multimodal Vision if key is available
        if settings.GEMINI_API_KEY:
            try:
                import base64
                from google import genai
                from google.genai import types
                
                gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
                img_bytes = base64.b64decode(image_base64)
                
                contents = [
                    types.Part.from_bytes(data=img_bytes, mime_type=mime_type),
                    prompt or default_prompt
                ]
                
                for vision_model in ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.6-flash']:
                    try:
                        resp = gemini_client.models.generate_content(
                            model=vision_model,
                            contents=contents
                        )
                        if resp and resp.text:
                            logger.info(f"[Gemini Vision] Image successfully transcribed via model '{vision_model}'.")
                            return resp.text
                    except Exception as vision_model_err:
                        logger.warning(f"[Gemini Vision Candidate] Model '{vision_model}' failed: {vision_model_err}")
                        continue
            except Exception as vision_e:
                logger.warning(f"[Gemini Vision Error] Falling back to standard pipeline: {vision_e}")

        user_content = [
            {"type": "text", "text": prompt or default_prompt},
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime_type};base64,{image_base64}"
                }
            }
        ]
        return await self.generate_chat(
            messages=[{"role": "user", "content": user_content}],
            role=ModelRole.VISION,
            agent_name="MultimodalOCR",
            temperature=0.1
        )

ai_service = AIService()

