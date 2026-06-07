"""
SyncSaga Backend - FastAPI Application
Main entry point for the Python backend service
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio

from app.api.routes import auth, rooms, anime, ai
from app.core.database import init_db_pool, close_db_pool
from app.core.middleware import RateLimitMiddleware

# Create FastAPI application
app = FastAPI(
    title="SyncSaga AI Backend",
    description="Audio fingerprinting and AI services for SyncSaga",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:4000",
        "*",  # In production, restrict to actual domains
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiting middleware
app.add_middleware(RateLimitMiddleware)

# Register routes
app.include_router(auth.router)
app.include_router(rooms.router)
app.include_router(anime.router)
app.include_router(ai.router)

# Lifecycle events
@app.on_event("startup")
async def startup_event():
    """Initialize database connection pool on startup"""
    print("Starting SyncSaga AI Backend...")
    await init_db_pool()
    print("Database pool initialized")

@app.on_event("shutdown")
async def shutdown_event():
    """Close database connections on shutdown"""
    print("Shutting down SyncSaga AI Backend...")
    await close_db_pool()
    print("Database connections closed")

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "syncsaga-ai-backend",
        "version": "2.0.0"
    }

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to SyncSaga AI Backend",
        "docs": "/docs",
        "endpoints": {
            "auth": "/api/auth",
            "rooms": "/api/rooms",
            "anime": "/api/anime",
            "ai": "/api/ai"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
