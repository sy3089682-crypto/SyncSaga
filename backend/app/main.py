"""SyncSaga v2 Backend — FastAPI Application"""

import os
import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from app.api.routes import auth, rooms, sync, ai, clips, embed
from app.ws import socket_manager
from app.core.config import settings
from app.core.database import Database
from app.core.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 SyncSaga v2 backend starting...")
    app.state.redis = await aioredis.from_url(
        settings.REDIS_URL, decode_responses=True
    )
    app.state.db = Database()
    await app.state.db.connect()
    logger.info(f"✓ Redis connected | DB connected | Port {settings.BACKEND_PORT}")
    yield
    await app.state.redis.close()
    await app.state.db.disconnect()
    logger.info("SyncSaga v2 backend shut down")


app = FastAPI(
    title="SyncSaga v2 API",
    version="2.0.0",
    description="AI-Powered Cross-Source Anime Watch Party Platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(rooms.router, prefix="/api/rooms", tags=["Rooms"])
app.include_router(sync.router, prefix="/api/sync", tags=["Sync"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(clips.router, prefix="/api/clips", tags=["Clips"])
app.include_router(embed.router, prefix="/api/embed", tags=["Embed"])

socket_manager.mount(app, path="/ws")


@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0", "service": "syncsaga-backend"}


@app.get("/")
async def root():
    return {
        "name": "SyncSaga v2",
        "description": "AI-Powered Cross-Source Anime Watch Party",
        "docs": "/docs",
        "health": "/health",
    }
