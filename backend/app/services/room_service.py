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
            INSERT INTO rooms (
                id,
                name,
                description,
                media_url,
                media_title,
                episode,
                anilist_id,
                mal_id,
                is_private,
                max_users,
                host_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
            """,
            room_id,
            name,
            kwargs.get("description", ""),
            kwargs.get("media_url"),
            kwargs.get("media_title"),
            kwargs.get("episode"),
            kwargs.get("anilist_id"),
            kwargs.get("mal_id"),
            kwargs.get("is_private", False),
            kwargs.get("max_users", 10),
            host_id,
        )
        if row:
            await self.db.execute(
                "INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, 'host')",
                room_id, host_id,
            )
            return await self.get(room_id)
        return None

    async def get(self, room_id: UUID) -> Room | None:
        row = await self.db.fetchrow(
            """
            SELECT
                r.*,
                p.id AS host_user_id,
                p.username AS host_username,
                p.display_name AS host_display_name,
                p.avatar_url AS host_avatar_url,
                p.status AS host_status,
                p.created_at AS host_created_at,
                (
                    SELECT COUNT(*)
                    FROM room_members rm
                    WHERE rm.room_id = r.id AND rm.is_banned = false
                ) AS participant_count
            FROM rooms r
            JOIN profiles p ON p.id = r.host_id
            WHERE r.id = $1
            """,
            room_id,
        )
        if not row:
            return None
        members = await self.get_members(room_id)
        host = User(
            id=row["host_user_id"],
            username=row["host_username"],
            display_name=row["host_display_name"],
            avatar_url=row["host_avatar_url"],
            status=row["host_status"],
            created_at=row["host_created_at"],
        )
        room_data = dict(row)
        for k in [
            "host_user_id",
            "host_username",
            "host_display_name",
            "host_avatar_url",
            "host_status",
            "host_created_at",
        ]:
            room_data.pop(k, None)
        return Room(**room_data, host=host, participant_count=row["participant_count"], members=members)

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

    async def update_room(self, room_id: UUID, **fields) -> Room | None:
        if not fields:
            return await self.get(room_id)
        set_clause = ", ".join(f"{k} = ${i + 1}" for i, k in enumerate(fields))
        values = list(fields.values())
        values.append(room_id)
        row = await self.db.fetchrow(
            f"UPDATE rooms SET {set_clause}, updated_at = NOW() WHERE id = ${len(values)} RETURNING *",
            *values,
        )
        if not row:
            return None
        return await self.get(room_id)

    async def get_public(self, limit: int = 50, offset: int = 0) -> list[Room]:
        rows = await self.db.fetch(
            """
            SELECT
                r.*,
                p.id AS host_user_id,
                p.username AS host_username,
                p.display_name AS host_display_name,
                p.avatar_url AS host_avatar_url,
                p.status AS host_status,
                p.created_at AS host_created_at,
                (
                    SELECT COUNT(*)
                    FROM room_members rm
                    WHERE rm.room_id = r.id AND rm.is_banned = false
                ) AS participant_count
            FROM rooms r
            JOIN profiles p ON p.id = r.host_id
            WHERE r.is_private = false
            ORDER BY r.created_at DESC
            LIMIT $1 OFFSET $2
            """,
            limit,
            offset,
        )
        items: list[Room] = []
        for r in rows:
            host = User(
                id=r["host_user_id"],
                username=r["host_username"],
                display_name=r["host_display_name"],
                avatar_url=r["host_avatar_url"],
                status=r["host_status"],
                created_at=r["host_created_at"],
            )
            room_data = dict(r)
            for k in [
                "host_user_id",
                "host_username",
                "host_display_name",
                "host_avatar_url",
                "host_status",
                "host_created_at",
            ]:
                room_data.pop(k, None)
            items.append(Room(**room_data, host=host, participant_count=r["participant_count"], members=[]))
        return items

    async def count_public(self) -> int:
        return await self.db.fetchval("SELECT COUNT(*) FROM rooms WHERE is_private = false")
