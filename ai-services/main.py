"""SyncSaga AI Service — Media Intelligence API"""

import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from contextlib import asynccontextmanager

from fingerprint.service import FingerprintService
from visual.service import VisualService
from scene.service import SceneService
from subtitle.service import SubtitleService

app = FastAPI(title="SyncSaga AI Service", version="2.0.0")

fingerprint_svc = FingerprintService()
visual_svc = VisualService()
scene_svc = SceneService()
subtitle_svc = SubtitleService()


class AudioMatchRequest(BaseModel):
    hashes: list[int]
    count: int = 50


class VisualMatchRequest(BaseModel):
    embedding: list[float]
    top_k: int = 5


class SceneDetectRequest(BaseModel):
    video_path: str
    threshold: float = 0.3


class SubtitleEmbedRequest(BaseModel):
    text: str


@app.get("/health")
async def health():
    models = {
        "fingerprint": fingerprint_svc.ready,
        "visual": visual_svc.ready,
        "scene": scene_svc.ready,
        "subtitle": subtitle_svc.ready,
    }
    return {"status": "ok", "models": models}


@app.post("/fingerprint/match")
async def match_audio(req: AudioMatchRequest):
    result = await fingerprint_svc.match(req.hashes, req.count)
    return result


@app.post("/visual/match")
async def match_visual(req: VisualMatchRequest):
    result = await visual_svc.match(req.embedding, req.top_k)
    return result


@app.post("/scene/detect")
async def detect_scenes(req: SceneDetectRequest):
    result = await scene_svc.detect(req.video_path, req.threshold)
    return result


@app.post("/subtitle/embed")
async def embed_subtitle(req: SubtitleEmbedRequest):
    result = await subtitle_svc.embed(req.text)
    return result


@app.post("/hybrid/match")
async def hybrid_match(
    audio_hashes: list[int] | None = None,
    visual_embedding: list[float] | None = None,
    subtitle_text: str | None = None,
):
    """
    Hybrid detection: combines all signals with confidence weighting.
    Priority: audio > visual > subtitle
    """
    signals = []
    weights = {"audio": 0.4, "visual": 0.3, "subtitle": 0.2}

    if audio_hashes:
        audio_result = await fingerprint_svc.match(audio_hashes, 30)
        signals.append(audio_result)

    if visual_embedding:
        visual_result = await visual_svc.match(visual_embedding, 3)
        signals.append(visual_result)

    if subtitle_text:
        subtitle_result = await subtitle_svc.embed(subtitle_text)
        signals.append(subtitle_result)

    if not signals:
        return {"matched": False, "confidence": 0.0, "method": "none"}

    best = max(signals, key=lambda s: s.get("confidence", 0) * weights.get(s.get("method", ""), 0.1))
    return {
        "matched": best.get("confidence", 0) > 0.7,
        "episode_id": best.get("episode_id"),
        "timestamp": best.get("timestamp", 0.0),
        "confidence": best.get("confidence", 0.0),
        "method": best.get("method", "none"),
        "signals": signals,
    }
