"""Socket.IO-compatible WebSocket Manager for Realtime Sync"""

import json
import time
from fastapi import WebSocket, WebSocketDisconnect
from typing import Callable
from collections import defaultdict

from app.core.redis import redis_sync
from app.core.logger import logger
from app.services.sync_engine import sync_engine
from app.models.schemas import SyncEvent


class SocketManager:
    """
    Manages WebSocket connections for realtime room sync.
    Supports Socket.IO-compatible events via Redis pub/sub.
    """

    def __init__(self):
        self._connections: dict[str, dict[str, WebSocket]] = defaultdict(dict)
        self._user_rooms: dict[str, str] = {}

    def mount(self, app, path: str):
        @app.websocket(path)
        async def ws_endpoint(ws: WebSocket):
            await self.handle_connection(ws)

    async def handle_connection(self, ws: WebSocket):
        await ws.accept()
        user_id = None
        room_id = None

        try:
            data = await ws.receive_json()
            action = data.get("action")
            token = data.get("token")

            if action == "auth" and token:
                user_id = token[:8]
                await ws.send_json({"type": "auth", "status": "ok", "user_id": user_id})
            else:
                await ws.send_json({"type": "error", "message": "Auth required"})
                await ws.close()
                return

            while True:
                msg = await ws.receive_json()
                msg_type = msg.get("type", "")

                if msg_type == "room:join":
                    room_id = msg.get("room_id")
                    if not room_id:
                        continue
                    self._connections[room_id][user_id] = ws
                    self._user_rooms[user_id] = room_id
                    await redis_sync.add_user_to_room(room_id, user_id, id(ws))
                    await self.broadcast(room_id, {
                        "type": "room:user_joined",
                        "user_id": user_id,
                        "timestamp": time.time(),
                    }, exclude=user_id)
                    await ws.send_json({
                        "type": "room:state",
                        "room_id": room_id,
                        "state": await redis_sync.get_room_state(room_id) or {},
                    })

                elif msg_type == "room:leave":
                    if room_id:
                        await redis_sync.remove_user_from_room(room_id, user_id)
                        await self.broadcast(room_id, {
                            "type": "room:user_left",
                            "user_id": user_id,
                        })
                        self._connections[room_id].pop(user_id, None)
                        self._user_rooms.pop(user_id, None)
                        room_id = None

                elif msg_type == "sync:event":
                    event = SyncEvent(
                        room_id=msg["payload"]["room_id"],
                        user_id=user_id,
                        event_type=msg["payload"]["type"],
                        timestamp=msg["payload"]["timestamp"],
                        playback_speed=msg["payload"].get("playback_speed", 1.0),
                        detection_method=msg["payload"].get("detection_method", "direct"),
                        confidence=msg["payload"].get("confidence", 1.0),
                    )
                    state = await sync_engine.process_sync_event(event)
                    await self.broadcast(room_id, {
                        "type": "sync:event",
                        "payload": msg["payload"],
                        "server_timestamp": int(time.time() * 1000),
                    })
                    await self.broadcast(room_id, {
                        "type": "sync:state",
                        "state": state.model_dump(),
                    })

                elif msg_type == "sync:request":
                    state = await redis_sync.get_room_state(room_id)
                    await ws.send_json({
                        "type": "sync:state",
                        "state": state or {},
                    })

                elif msg_type == "sync:ping":
                    await ws.send_json({
                        "type": "sync:pong",
                        "server_timestamp": int(time.time() * 1000),
                    })

                elif msg_type == "chat:message":
                    await self.broadcast(room_id, {
                        "type": "chat:message",
                        "payload": {
                            "sender_id": user_id,
                            "content": msg.get("payload", {}).get("content", ""),
                            "timestamp": time.time(),
                        },
                    })

                elif msg_type == "reaction:add":
                    await self.broadcast(room_id, {
                        "type": "reaction:new",
                        "payload": {
                            "user_id": user_id,
                            "emoji": msg.get("payload", {}).get("emoji", "🔥"),
                            "timestamp_sec": msg.get("payload", {}).get("timestamp_sec", 0),
                        },
                    })

        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected: user={user_id}")
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        finally:
            if room_id and user_id:
                self._connections[room_id].pop(user_id, None)
                self._user_rooms.pop(user_id, None)
                await redis_sync.remove_user_from_room(room_id, user_id)
                await self.broadcast(room_id, {
                    "type": "room:user_left",
                    "user_id": user_id,
                    "timestamp": time.time(),
                })

    async def broadcast(self, room_id: str, message: dict, exclude: str | None = None):
        """Broadcast to all WebSocket clients in a room."""
        dead = []
        for uid, ws in self._connections.get(room_id, {}).items():
            if uid == exclude:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(uid)
        for uid in dead:
            self._connections[room_id].pop(uid, None)

    async def send_to_user(self, user_id: str, message: dict):
        """Send a message to a specific user across all rooms."""
        for room_id, users in self._connections.items():
            if user_id in users:
                try:
                    await users[user_id].send_json(message)
                except Exception:
                    pass


socket_manager = SocketManager()
