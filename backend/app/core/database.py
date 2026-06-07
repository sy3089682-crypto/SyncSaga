"""Async PostgreSQL Database"""

import asyncpg
from typing import Optional
from app.core.config import settings

# Global connection pool
_pool: Optional[asyncpg.Pool] = None

class Database:
    def __init__(self):
        self.pool: asyncpg.Pool | None = None

    async def connect(self):
        self.pool = await asyncpg.create_pool(
            settings.DATABASE_URL, min_size=5, max_size=20
        )

    async def disconnect(self):
        if self.pool:
            await self.pool.close()

    async def fetch(self, query: str, *args):
        async with self.pool.acquire() as conn:
            return await conn.fetch(query, *args)

    async def fetchrow(self, query: str, *args):
        async with self.pool.acquire() as conn:
            return await conn.fetchrow(query, *args)

    async def fetchval(self, query: str, *args):
        async with self.pool.acquire() as conn:
            return await conn.fetchval(query, *args)

    async def execute(self, query: str, *args):
        async with self.pool.acquire() as conn:
            return await conn.execute(query, *args)


async def init_db_pool():
    """Initialize the global database connection pool"""
    global _pool
    if _pool is None:
        _pool = await asyncpg.create_pool(
            settings.DATABASE_URL, 
            min_size=5, 
            max_size=20,
            command_timeout=60
        )
    return _pool

async def close_db_pool():
    """Close the global database connection pool"""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None

async def get_db_connection():
    """Get a connection from the pool"""
    if _pool is None:
        await init_db_pool()
    return await _pool.acquire()

async def release_db_connection(conn):
    """Release a connection back to the pool"""
    if _pool and conn:
        await _pool.release(conn)
