"""Redis Pub/Sub for cross-instance sync"""

import json
import redis.asyncio as aioredis
from app.core.config import settings


class RedisSync:
    def __init__(self):
        self.redis: aioredis.Redis | None = None
        self.pubsub: aioredis.client.PubSub | None = None

    async def connect(self):
        self.redis = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        self.pubsub = self.redis.pubsub()

    async def publish(self, channel: str, data: dict):
        await self.redis.publish(channel, json.dumps(data))

    async def subscribe(self, channel: str):
        await self.pubsub.subscribe(channel)

    async def get_message(self):
        return await self.pubsub.get_message(ignore_subscribe_messages=True)

    async def set_room_state(self, room_id: str, state: dict):
        await self.redis.setex(
            f"room:{room_id}:state", 3600, json.dumps(state)
        )

    async def get_room_state(self, room_id: str) -> dict | None:
        data = await self.redis.get(f"room:{room_id}:state")
        return json.loads(data) if data else None

    async def add_user_to_room(self, room_id: str, user_id: str, socket_id: str):
        await self.redis.hset(f"room:{room_id}:users", user_id, socket_id)

    async def remove_user_from_room(self, room_id: str, user_id: str):
        await self.redis.hdel(f"room:{room_id}:users", user_id)

    async def get_room_users(self, room_id: str) -> list[str]:
        users = await self.redis.hkeys(f"room:{room_id}:users")
        return list(users)

    async def get_user_socket(self, room_id: str, user_id: str) -> str | None:
        return await self.redis.hget(f"room:{room_id}:users", user_id)

    async def close(self):
        if self.pubsub:
            await self.pubsub.unsubscribe()
        if self.redis:
            await self.redis.close()


redis_sync = RedisSync()
