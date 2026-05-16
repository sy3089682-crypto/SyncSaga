"""Room management service"""

from uuid import UUID, uuid4
from app.core.database import Database
from app.models.schemas import Room, User


class RoomService:
    def __init__(self, db: Database):
        self.db = db

    async def create(self, name: str, host_id: UUID, **kwargs) -> Room | None:
        room_id = uuid4()
        row = await self.db.fetchrow(
            """
            INSERT INTO rooms (id, name, host_id, is_private, max_users, description)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            """,
            room_id, name, host_id,
            kwargs.get("is_private", False),
            kwargs.get("max_users", 10),
            kwargs.get("description", ""),
        )
        if row:
            await self.db.execute(
                "INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, 'host')",
                room_id, host_id,
            )
            return Room(**dict(row))
        return None

    async def get(self, room_id: UUID) -> Room | None:
        row = await self.db.fetchrow("SELECT * FROM rooms WHERE id = $1", room_id)
        if not row:
            return None
        members = await self.get_members(room_id)
        return Room(**dict(row), members=members)

    async def get_members(self, room_id: UUID) -> list[User]:
        rows = await self.db.fetch(
            """
            SELECT p.id, p.username, p.display_name, p.avatar_url, p.status
            FROM room_members rm
            JOIN profiles p ON p.id = rm.user_id
            WHERE rm.room_id = $1 AND rm.is_banned = false
            """,
            room_id,
        )
        return [User(**dict(r)) for r in rows]

    async def join(self, room_id: UUID, user_id: UUID) -> bool:
        exists = await self.db.fetchrow(
            "SELECT 1 FROM room_members WHERE room_id = $1 AND user_id = $2",
            room_id, user_id,
        )
        if exists:
            return True
        # Check capacity
        row = await self.db.fetchrow("SELECT max_users FROM rooms WHERE id = $1", room_id)
        if not row:
            return False
        count = await self.db.fetchval(
            "SELECT COUNT(*) FROM room_members WHERE room_id = $1",
            room_id,
        )
        if count >= row["max_users"]:
            return False
        await self.db.execute(
            "INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, 'member')",
            room_id, user_id,
        )
        return True

    async def leave(self, room_id: UUID, user_id: UUID):
        await self.db.execute(
            "DELETE FROM room_members WHERE room_id = $1 AND user_id = $2",
            room_id, user_id,
        )

    async def update_state(self, room_id: UUID, **fields):
        set_clause = ", ".join(f"{k.replace('_', '')} = ${i+1}" for i, k in enumerate(fields))
        values = list(fields.values())
        values.append(room_id)
        await self.db.execute(
            f"UPDATE rooms SET {set_clause}, updated_at = NOW() WHERE id = ${len(values)}",
            *values,
        )

    async def get_public(self, limit: int = 50) -> list[Room]:
        rows = await self.db.fetch(
            "SELECT * FROM rooms WHERE is_private = false ORDER BY created_at DESC LIMIT $1",
            limit,
        )
        return [Room(**dict(r)) for r in rows]
