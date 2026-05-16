from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.scene_graph import scene_graph

router = APIRouter(prefix="/api/scenes", tags=["scenes"])


class SceneAddRequest(BaseModel):
    episode_id: str
    scene_number: int
    start_time: float
    end_time: float
    fingerprint_audio_hash: Optional[str] = None
    fingerprint_visual_hash: Optional[str] = None
    is_opening: bool = False
    is_ending: bool = False


@router.post("/add")
async def add_scene(req: SceneAddRequest):
    scene = {
        "scene_number": req.scene_number,
        "start_time": req.start_time,
        "end_time": req.end_time,
        "duration": round(req.end_time - req.start_time, 3),
        "fingerprint": {
            "audio_hash": req.fingerprint_audio_hash,
            "visual_hash": req.fingerprint_visual_hash,
        },
        "is_opening": req.is_opening,
        "is_ending": req.is_ending,
        "reactions": {},
    }
    scene_id = await scene_graph.add_scene(req.episode_id, scene)
    return {"scene_id": scene_id, "status": "added"}


@router.get("/{scene_id}")
async def get_scene(scene_id: str):
    scene = await scene_graph.get_scene(scene_id)
    if not scene:
        raise HTTPException(404, "Scene not found")
    return scene


@router.get("/episode/{episode_id}")
async def get_episode_scenes(episode_id: str):
    scenes = await scene_graph.get_episode_scenes(episode_id)
    return {"episode_id": episode_id, "scenes": scenes, "count": len(scenes)}


@router.get("/episode/{episode_id}/graph")
async def get_episode_graph(episode_id: str):
    return await scene_graph.get_episode_graph(episode_id)


@router.get("/episode/{episode_id}/heatmap")
async def get_emotion_heatmap(episode_id: str):
    return {"heatmap": await scene_graph.compute_emotion_heatmap(episode_id)}


@router.get("/timestamp/{episode_id}")
async def get_scene_for_timestamp(episode_id: str, timestamp: float):
    scene = await scene_graph.get_scene_for_timestamp(episode_id, timestamp)
    if not scene:
        raise HTTPException(404, "No scene found at this timestamp")
    return scene


@router.post("/resolve")
async def resolve_cross_source(source_scene_id: str, source_timestamp: float):
    result = await scene_graph.resolve_cross_source_timestamp(source_scene_id, source_timestamp)
    if not result:
        raise HTTPException(404, "Could not resolve timestamp")
    return result


@router.get("/fingerprint")
async def get_scene_by_fingerprint(audio_hash: str, visual_hash: str):
    scene = await scene_graph.get_scene_by_fingerprint(audio_hash, visual_hash)
    if not scene:
        raise HTTPException(404, "No scene found with this fingerprint")
    return scene


@router.get("/{scene_id}/reactions")
async def get_scene_reactions(scene_id: str):
    return {"reactions": await scene_graph.get_scene_reactions(scene_id)}
