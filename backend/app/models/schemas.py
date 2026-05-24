"""Core Sync Models"""

from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class User(BaseModel):
    id: UUID
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    status: str = "offline"
    created_at: Optional[datetime] = None


class Room(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    media_url: Optional[str] = None
    media_title: Optional[str] = None
    episode: Optional[int] = None
    anilist_id: Optional[int] = None
    mal_id: Optional[int] = None
    is_private: bool = False
    max_users: int = 10
    host_id: UUID
    host: Optional[User] = None
    participant_count: int = 0
    playback_state: str = "paused"
    current_episode: Optional[str] = None
    current_scene_id: Optional[UUID] = None
    sync_confidence: float = 1.0
    members: list[User] = []


class SyncEvent(BaseModel):
    room_id: UUID
    user_id: UUID
    event_type: str  # play, pause, seek, speed, episode, timestamp
    timestamp: float
    playback_speed: Optional[float] = 1.0
    episode: Optional[str] = None
    scene_id: Optional[UUID] = None
    server_timestamp: Optional[int] = None
    confidence: Optional[float] = None
    detection_method: Optional[str] = None  # direct, audio, visual, subtitle, predicted


class SyncState(BaseModel):
    room_id: UUID
    timestamp: float
    playback_state: str
    speed: float
    episode: Optional[str] = None
    scene_id: Optional[UUID] = None
    confidence: float = 1.0
    latency_ms: float = 0.0
    drift_seconds: float = 0.0


class FingerprintMatch(BaseModel):
    episode_id: UUID
    timestamp: float
    confidence: float
    method: str  # audio, visual, subtitle
    scene_id: Optional[UUID] = None


class DetectionResult(BaseModel):
    anime_title: Optional[str] = None
    episode_number: Optional[int] = None
    timestamp: float = 0.0
    confidence: float = 0.0
    method: str = "none"
    scene_id: Optional[UUID] = None
    details: dict = {}


class SceneInfo(BaseModel):
    id: UUID
    anime_id: str
    episode_number: int
    scene_number: int
    start_time: float
    end_time: float
    emotion_tags: list[str] = []
    action_intensity: float = 0.0
