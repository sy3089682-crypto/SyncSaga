"""API Routes — Clips"""

from fastapi import APIRouter
from pydantic import BaseModel
from uuid import UUID, uuid4

router = APIRouter()


class CreateClipRequest(BaseModel):
    user_id: UUID
    anime_title: str
    episode_number: int | None = None
    start_time: float
    end_time: float
    title: str | None = None


@router.post("/")
async def create_clip(req: CreateClipRequest):
    clip = {
        "id": str(uuid4()),
        "user_id": str(req.user_id),
        "anime_title": req.anime_title,
        "episode_number": req.episode_number,
        "start_time": req.start_time,
        "end_time": req.end_time,
        "title": req.title or f"Clip from {req.anime_title}",
        "view_count": 0,
    }
    return {"clip": clip}


@router.get("/{clip_id}")
async def get_clip(clip_id: UUID):
    return {"clip": {"id": str(clip_id), "title": "Sample clip", "view_count": 42}}
