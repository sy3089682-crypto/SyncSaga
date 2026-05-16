"""API Routes — Rooms"""

from fastapi import APIRouter, HTTPException, Depends
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
    description: str = ""
    is_private: bool = False
    max_users: int = 10
    user_id: UUID


@router.get("/")
async def list_rooms():
    svc = get_room_service()
    rooms = await svc.get_public()
    return {"rooms": [r.model_dump() for r in rooms]}


@router.post("/")
async def create_room(req: CreateRoomRequest):
    svc = get_room_service()
    room = await svc.create(
        name=req.name,
        host_id=req.user_id,
        description=req.description,
        is_private=req.is_private,
        max_users=req.max_users,
    )
    if not room:
        raise HTTPException(500, "Failed to create room")
    return {"room": room.model_dump()}


@router.get("/{room_id}")
async def get_room(room_id: UUID):
    svc = get_room_service()
    room = await svc.get(room_id)
    if not room:
        raise HTTPException(404, "Room not found")
    return {"room": room.model_dump()}


@router.post("/{room_id}/join")
async def join_room(room_id: UUID, user_id: UUID):
    svc = get_room_service()
    ok = await svc.join(room_id, user_id)
    if not ok:
        raise HTTPException(400, "Could not join room")
    return {"status": "joined"}


@router.post("/{room_id}/leave")
async def leave_room(room_id: UUID, user_id: UUID):
    svc = get_room_service()
    await svc.leave(room_id, user_id)
    return {"status": "left"}
