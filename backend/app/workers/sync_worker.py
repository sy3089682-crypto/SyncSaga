"""Celery Workers for AI Processing + Sync"""

from celery import Celery
from app.core.config import settings

app = Celery(
    "syncsaga",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,
    worker_prefetch_multiplier=1,
)


@app.task(bind=True, max_retries=3)
def process_audio_fingerprint(self, episode_id: str, audio_path: str):
    """Extract and index audio fingerprints for an episode."""
    # TODO: Call Panako/chromaprint to extract fingerprints
    # Store in fingerprint_landmarks table + FAISS index
    return {"episode_id": episode_id, "fingerprints_indexed": 0, "status": "stub"}


@app.task(bind=True, max_retries=3)
def process_visual_embeddings(self, episode_id: str, video_path: str):
    """Extract keyframes and compute CLIP embeddings."""
    # TODO: Extract frames every 2-5s, compute OpenCLIP embeddings,
    # store in Qdrant vector DB
    return {"episode_id": episode_id, "embeddings_indexed": 0, "status": "stub"}


@app.task(bind=True, max_retries=3)
def process_scene_detection(self, episode_id: str, video_path: str):
    """Detect scene boundaries using PySceneDetect."""
    return {"episode_id": episode_id, "scenes_detected": 0, "status": "stub"}


@app.task(bind=True, max_retries=3)
def process_subtitles(self, episode_id: str, subtitle_path: str | None = None):
    """Transcribe audio to text using Whisper, store subtitle embeddings."""
    return {"episode_id": episode_id, "segments": 0, "status": "stub"}


@app.task(bind=True)
def match_audio_fingerprint(self, hashes: list[int]) -> dict:
    """Match audio fingerprint hashes against the FAISS index."""
    return {"matched": False, "episode_id": None, "timestamp": 0.0, "confidence": 0.0}


@app.task(bind=True)
def match_visual_similarity(self, embedding: list[float]) -> dict:
    """Search Qdrant for visual similarity."""
    return {"matched": False, "episode_id": None, "timestamp": 0.0, "confidence": 0.0}


@app.task(bind=True)
def process_hybrid_detection(
    self,
    audio_hashes: list[int] | None = None,
    visual_embedding: list[float] | None = None,
    subtitle_text: str | None = None,
) -> dict:
    """
    Hybrid detection: combine all signals with confidence scoring.
    Priority: audio > visual > subtitle > predicted
    """
    results = []
    if audio_hashes:
        results.append({"method": "audio", "confidence": 0.0})
    if visual_embedding:
        results.append({"method": "visual", "confidence": 0.0})
    if subtitle_text:
        results.append({"method": "subtitle", "confidence": 0.0})

    return {
        "matched": False,
        "episode_id": None,
        "timestamp": 0.0,
        "confidence": 0.0,
        "method": "none",
        "signals": results,
    }
