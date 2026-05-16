"""API Routes — Sync State"""

from fastapi import APIRouter
from uuid import UUID
from app.services.sync_engine import sync_engine
from app.core.redis import redis_sync
from app.models.schemas import SyncEvent

router = APIRouter()


@router.post("/event")
async def post_sync_event(event: SyncEvent):
    state = await sync_engine.process_sync_event(event)
    return {"state": state.model_dump()}


@router.get("/state/{room_id}")
async def get_sync_state(room_id: UUID):
    state = await redis_sync.get_room_state(str(room_id))
    return {"state": state or {}}


@router.get("/health/{room_id}")
async def get_sync_health(room_id: UUID):
    health = sync_engine.get_sync_health(str(room_id))
    return health
