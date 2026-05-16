"""SyncSaga v2 Core Configuration"""

import os
from typing import List


class Settings:
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-change-me")

    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
    BACKEND_HOST: str = os.getenv("BACKEND_HOST", "0.0.0.0")
    BACKEND_URL: str = os.getenv("BACKEND_URL", "http://localhost:8000")
    CORS_ORIGINS: List[str] = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8000").split(",")

    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://syncsaga:syncsaga@localhost:5432/syncsaga")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    REDIS_SYNC_CHANNEL: str = os.getenv("REDIS_SYNC_CHANNEL", "sync:events")

    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    QDRANT_COLLECTION: str = os.getenv("QDRANT_COLLECTION", "anime_fingerprints")

    OPENCLIP_MODEL: str = os.getenv("OPENCLIP_MODEL", "ViT-B-32")
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "base")
    FAISS_INDEX_PATH: str = os.getenv("FAISS_INDEX_PATH", "./data/indexes/fingerprint.index")

    CELERY_BROKER_URL: str = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/1")
    CELERY_RESULT_BACKEND: str = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")

    # Sync thresholds
    DRIFT_SOFT_CORRECTION_SEC: float = 1.5
    DRIFT_HARD_CORRECTION_SEC: float = 3.0
    SOFT_CORRECTION_SPEED: float = 1.03
    AUTO_RESYNC_INTERVAL_SEC: int = 4
    LATENCY_SAMPLE_WINDOW: int = 10
    SYNC_CONFIDENCE_THRESHOLD: float = 0.7


settings = Settings()
