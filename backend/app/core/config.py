import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = 'Mentor Mate Academic Twin'
    API_V1_STR: str = '/api/v1'
    SECRET_KEY: str = os.getenv('SECRET_KEY', 'change-this-to-a-secure-random-secret-key-in-production')
    ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database: Supports SQLite (aiosqlite) or PostgreSQL (asyncpg)
    DATABASE_URL: str = os.getenv(
        'DATABASE_URL', 
        f'sqlite+aiosqlite:///{BASE_DIR}/mentormate.db'
    )

    # File uploads
    UPLOAD_DIR: str = str(BASE_DIR / 'uploads')
    MAX_UPLOAD_SIZE_MB: int = 50

    # OmniRoute AI Gateway
    OMNIROUTE_BASE_URL: str = os.getenv('OMNIROUTE_BASE_URL', 'http://localhost:20128/v1')
    OMNIROUTE_API_KEY: str = os.getenv('OMNIROUTE_API_KEY', '')
    OMNIROUTE_DEFAULT_MODEL: str = os.getenv('OMNIROUTE_DEFAULT_MODEL', 'auto/fast')
    OMNIROUTE_REASONING_MODEL: str = os.getenv('OMNIROUTE_REASONING_MODEL', 'auto/chat')
    OMNIROUTE_VISION_MODEL: str = os.getenv('OMNIROUTE_VISION_MODEL', 'auto/best-vision')

    # OpenClaw Agent Gateway
    OPENCLAW_GATEWAY_URL: str = os.getenv('OPENCLAW_GATEWAY_URL', 'http://127.0.0.1:18789')
    OPENCLAW_TOKEN: str = os.getenv('OPENCLAW_TOKEN', '')

    # Optional direct cloud fallback keys
    OPENAI_API_KEY: str = os.getenv('OPENAI_API_KEY', '')
    GEMINI_API_KEY: str = os.getenv('GEMINI_API_KEY', '')
    GEMINI_MODEL: str = os.getenv('GEMINI_MODEL', 'gemini-3.6-flash')

    # CORS
    CORS_ORIGINS: list[str] = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'https://mentor-mate-ivory.vercel.app'
    ]

    class Config:
        case_sensitive = True
        env_file = '.env'
        extra = 'ignore'

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
