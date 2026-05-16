"""API Routes — AI Detection & Fingerprinting"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.models.schemas import DetectionResult

router = APIRouter()


class MatchByAudioRequest(BaseModel):
    fingerprints: list[int]
    duration: float = 3.0


class MatchByVisualRequest(BaseModel):
    embeddings: list[list[float]]
    count: int = 1


class HybridMatchRequest(BaseModel):
    audio_fingerprints: list[int] | None = None
    visual_embeddings: list[list[float]] | None = None
    subtitle_text: str | None = None
    source_url: str | None = None


@router.post("/match-episode")
async def match_episode(req: HybridMatchRequest):
    """
    Hybrid endpoint: accepts audio fingerprints, visual embeddings,
    and/or subtitle text. Returns best-guess episode match.
    """
    # Stub: In production, calls fingerprint → FAISS → scene resolve pipeline
    return {
        "matched": False,
        "anime_title": None,
        "episode_number": None,
        "timestamp": 0.0,
        "confidence": 0.0,
        "method": "none",
        "message": "AI detection engine not deployed. See docs/AI-ARCHITECTURE.md",
    }


@router.post("/detect")
async def detect_timestamp(fingerprints: list[int]):
    """Stub: detect timestamp from audio fingerprints"""
    return DetectionResult(
        confidence=0.0,
        method="audio",
        details={"fingerprint_count": len(fingerprints)},
    )


@router.post("/embed")
async def compute_embedding(text: str):
    """Stub: compute text embedding for subtitle matching"""
    return {"embedding": [], "dimension": 384}


@router.get("/status")
async def ai_status():
    return {
        "audio_fingerprint": "deployed" if False else "not deployed",
        "visual_matching": "not deployed",
        "subtitle_matching": "not deployed",
        "scene_detection": "not deployed",
        "vector_index_size": 0,
    }
