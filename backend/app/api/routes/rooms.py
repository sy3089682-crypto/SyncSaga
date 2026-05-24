"""API Routes — Rooms"""

from fastapi import APIRouter, HTTPException, Depends, Request, Query
from pydantic import BaseModel
from uuid import UUID

from app.core.database import Database
from app.services.room_service import RoomService

router = APIRouter()
db = Database()


def get_room_service() -> RoomService:
    return RoomService(db)


class CreateRoomRequest(BaseModel):
    name: str
    description: str | None = None
    media_url: str | None = None
    media_title: str | None = None
    episode: int | None = None
    anilist_id: int | None = None
    mal_id: int | None = None
    is_public: bool = True
    max_users: int = 10


class UpdateRoomRequest(BaseModel):
    description: str | None = None
    media_url: str | None = None
    media_title: str | None = None
    episode: int | None = None
    anilist_id: int | None = None
    mal_id: int | None = None


@router.get("/")
async def list_rooms(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    svc = get_room_service()
    offset = (page - 1) * per_page
    items = await svc.get_public(limit=per_page, offset=offset)
    total = await svc.count_public()
    return {"items": [r.model_dump() for r in items], "total": total, "page": page, "per_page": per_page}


@router.post("/")
async def create_room(req: CreateRoomRequest, request: Request):
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(401, "Not authenticated")
    svc = get_room_service()
    room = await svc.create(
        name=req.name,
        host_id=UUID(user_id),
        description=req.description or "",
        media_url=req.media_url,
        media_title=req.media_title,
        episode=req.episode,
        anilist_id=req.anilist_id,
        mal_id=req.mal_id,
        is_private=not req.is_public,
        max_users=req.max_users,
    )
    if not room:
        raise HTTPException(500, "Failed to create room")
    return room.model_dump()


@router.get("/{room_id}")
async def get_room(room_id: UUID):
    svc = get_room_service()
    room = await svc.get(room_id)
    if not room:
        raise HTTPException(404, "Room not found")
    return room.model_dump()


@router.post("/{room_id}/join")
async def join_room(room_id: UUID, request: Request):
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(401, "Not authenticated")
    svc = get_room_service()
    ok = await svc.join(room_id, UUID(user_id))
    if not ok:
        raise HTTPException(400, "Could not join room")
    return {"joined": True}


@router.post("/{room_id}/leave")
async def leave_room(room_id: UUID, request: Request):
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(401, "Not authenticated")
    svc = get_room_service()
    await svc.leave(room_id, UUID(user_id))
    return {"left": True}


@router.put("/{room_id}")
async def update_room(room_id: UUID, req: UpdateRoomRequest, request: Request):
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(401, "Not authenticated")
    svc = get_room_service()
    room = await svc.get(room_id)
    if not room:
        raise HTTPException(404, "Room not found")
    if str(room.host_id) != user_id:
        raise HTTPException(403, "Forbidden")

    fields = req.model_dump(exclude_unset=True)
    if not fields:
        return room.model_dump()
    updated = await svc.update_room(room_id, **fields)
    if not updated:
        raise HTTPException(500, "Failed to update room")
    return updated.model_dump()
