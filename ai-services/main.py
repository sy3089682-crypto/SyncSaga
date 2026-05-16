import os
import time
import uuid
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from contextlib import asynccontextmanager
from typing import Optional

from fingerprint.service import FingerprintService
from visual.service import VisualService
from scene.service import SceneService
from subtitle.service import SubtitleService


@asynccontextmanager
async def lifespan(app: FastAPI):
    await fingerprint_svc.initialize()
    await visual_svc.initialize()
    await scene_svc.initialize()
    await subtitle_svc.initialize()
    yield

app = FastAPI(title="SyncSaga AI Service", version="2.0.0", lifespan=lifespan)

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

class IndexEpisodeRequest(BaseModel):
    episode_id: str
    audio_path: Optional[str] = None
    srt_content: Optional[str] = None
    frames: Optional[list[dict]] = None

class OPEDDetectRequest(BaseModel):
    audio_path: str

class HybridMatchRequest(BaseModel):
    audio_hashes: Optional[list[int]] = None
    visual_embedding: Optional[list[float]] = None
    subtitle_text: Optional[str] = None


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "models": {
            "fingerprint": fingerprint_svc.ready,
            "visual": visual_svc.ready,
            "scene": scene_svc.ready,
            "subtitle": subtitle_svc.ready,
        },
        "fingerprint_index_size": len(fingerprint_svc.index),
        "visual_vectors_count": len(visual_svc.vectors),
        "subtitle_embeddings_count": len(subtitle_svc.embeddings),
    }

@app.get("/fingerprint/extract")
async def extract_fingerprint(audio_bytes: bytes):
    hashes = await fingerprint_svc.extract(audio_bytes)
    return {"hash_count": len(hashes), "hashes": hashes[:100]}

@app.post("/fingerprint/match")
async def match_audio(req: AudioMatchRequest):
    return await fingerprint_svc.match(req.hashes, req.count)

@app.post("/fingerprint/index")
async def index_episode_fingerprint(req: IndexEpisodeRequest):
    if not req.audio_path:
        raise HTTPException(400, "audio_path required")
    await fingerprint_svc.index_from_path(req.episode_id, req.audio_path)
    return {"status": "indexed", "episode_id": req.episode_id, "index_size": len(fingerprint_svc.index)}

@app.post("/visual/extract")
async def extract_visual(file: UploadFile = File(...)):
    image_bytes = await file.read()
    embedding = await visual_svc.extract_embedding(image_bytes)
    return {"embedding": embedding[:64], "dim": len(embedding)}

@app.post("/visual/match")
async def match_visual(req: VisualMatchRequest):
    return await visual_svc.match(req.embedding, req.top_k)

@app.post("/scene/detect")
async def detect_scenes(req: SceneDetectRequest):
    scenes = await scene_svc.detect(req.video_path, req.threshold)
    return {"scenes": scenes, "count": len(scenes)}

@app.post("/scene/detect-frames")
async def detect_scenes_from_frames(files: list[UploadFile] = File(...)):
    frames = [await f.read() for f in files]
    scenes = await scene_svc.detect_from_frames(frames)
    return {"scenes": scenes, "count": len(scenes)}

@app.get("/scene/detect-op-ed")
async def detect_op_ed(audio_path: str):
    result = await scene_svc.detect_op_ed_spectrogram(audio_path)
    return result

@app.post("/subtitle/embed")
async def embed_subtitle(req: SubtitleEmbedRequest):
    return await subtitle_svc.embed(req.text)

@app.post("/subtitle/index")
async def index_subtitles(req: IndexEpisodeRequest):
    if not req.srt_content:
        raise HTTPException(400, "srt_content required")
    await subtitle_svc.index_from_srt(req.episode_id, req.srt_content)
    return {"status": "indexed", "episode_id": req.episode_id}

@app.post("/subtitle/match-quote")
async def match_quote(text: str):
    return await subtitle_svc.match_quote(text)

@app.post("/hybrid/match")
async def hybrid_match(req: HybridMatchRequest):
    t0 = time.time()
    signals = []

    if req.audio_hashes:
        audio_result = await fingerprint_svc.match(req.audio_hashes, 30)
        signals.append(audio_result)

    if req.visual_embedding:
        visual_result = await visual_svc.match(req.visual_embedding, 3)
        signals.append(visual_result)

    if req.subtitle_text:
        subtitle_result = await subtitle_svc.embed(req.subtitle_text)
        signals.append(subtitle_result)

    if not signals:
        return {"matched": False, "confidence": 0.0, "method": "none", "latency_ms": 0}

    weights = {"audio": 0.4, "visual": 0.3, "subtitle": 0.2}
    best = max(signals, key=lambda s: s.get("confidence", 0) * weights.get(s.get("method", ""), 0.1))

    combined_confidence = sum(
        s.get("confidence", 0) * weights.get(s.get("method", ""), 0.1)
        for s in signals
    ) / sum(weights.get(s.get("method", ""), 0.1) for s in signals)

    latency_ms = int((time.time() - t0) * 1000)

    return {
        "matched": best.get("confidence", 0) > 0.7,
        "episode_id": best.get("episode_id"),
        "timestamp": best.get("timestamp", 0.0),
        "confidence": round(combined_confidence, 4),
        "method": best.get("method", "none"),
        "latency_ms": latency_ms,
        "signals": signals,
    }

@app.post("/scene/compute-fingerprint")
async def compute_scene_fingerprint(audio: UploadFile = File(...), frame: UploadFile = File(...)):
    audio_bytes = await audio.read()
    frame_bytes = await frame.read()
    result = await scene_svc.compute_scene_fingerprint(audio_bytes, frame_bytes)
    return result

@app.get("/preprocess/episode")
async def preprocess_episode(
    episode_id: str,
    video_path: str,
    audio_path: Optional[str] = None,
    srt_path: Optional[str] = None,
):
    results = {"episode_id": episode_id}

    scenes = await scene_svc.detect(video_path)
    results["scenes"] = scenes

    op_ed = await scene_svc.detect_op_ed_spectrogram(audio_path or video_path)
    results["op_ed"] = op_ed

    if audio_path:
        await fingerprint_svc.index_from_path(episode_id, audio_path)
        results["fingerprints_indexed"] = len(fingerprint_svc.index)

    if srt_path:
        with open(srt_path, 'r') as f:
            srt_content = f.read()
        await subtitle_svc.index_from_srt(episode_id, srt_content)
        results["subtitle_segments"] = len(subtitle_svc.embeddings)

    return results
