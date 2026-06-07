from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
import base64
import numpy as np

from app.services.fingerprint_matching import (
    fingerprint_matcher, 
    detect_anime_from_audio,
    MatchResult
)
from app.services.fingerprint_builder import populate_anime_fingerprints
from app.core.database import get_db_connection

router = APIRouter(prefix="/api/ai", tags=["ai"])

class MatchRequest(BaseModel):
    audio_base64: str
    duration_sec: float
    source_url: Optional[str] = None

class MatchResponse(BaseModel):
    matched: bool
    anime_id: Optional[str] = None
    episode_number: Optional[int] = None
    offset_seconds: Optional[float] = None
    confidence: Optional[float] = None
    title: Optional[str] = None
    intro_skip: Optional[dict] = None
    timeline: Optional[dict] = None

@router.post("/match-episode", response_model=MatchResponse)
async def match_episode(request: MatchRequest):
    """
    Match audio fingerprint against database to identify anime episode
    
    Accepts base64-encoded audio and returns the matched episode with timestamp
    """
    try:
        result = await detect_anime_from_audio(
            request.audio_base64,
            request.duration_sec
        )
        
        if not result:
            return MatchResponse(matched=False)
        
        # Get anime title from database
        conn = await get_db_connection()
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT title FROM anime_metadata WHERE id = %s",
                (result.anime_id,)
            )
            row = await cur.fetchone()
            title = row[0] if row else None
            await conn.close()
        
        return MatchResponse(
            matched=True,
            anime_id=result.anime_id,
            episode_number=result.episode_number,
            offset_seconds=result.offset_seconds,
            confidence=result.confidence,
            title=title,
            intro_skip=result.intro_skip,
            timeline=result.timeline
        )
        
    except Exception as e:
        print(f"Error in match_episode: {e}")
        raise HTTPException(status_code=500, detail=f"Matching failed: {str(e)}")

@router.post("/match-episode/upload")
async def match_episode_upload(
    audio: UploadFile = File(...),
    anime_id: Optional[str] = Form(None),
    episode: Optional[int] = Form(None)
):
    """
    Upload audio file for episode matching or fingerprint database population
    
    If anime_id and episode are provided, adds to fingerprint database.
    Otherwise, attempts to match against existing database.
    """
    try:
        # Read uploaded audio
        contents = await audio.read()
        
        # Convert to numpy array (assuming WAV format)
        import io
        import wave
        import contextlib
        
        with contextlib.closing(wave.open(io.BytesIO(contents), 'rb')) as wav_file:
            frames = wav_file.readframes(wav_file.getnframes())
            sample_rate = wav_file.getframerate()
            channels = wav_file.getnchannels()
            
            samples = np.frombuffer(frames, dtype=np.int16).astype(np.float32)
            samples = samples / 32768.0
            
            if channels == 2:
                samples = samples.reshape(-1, 2).mean(axis=1)
        
        duration_sec = len(samples) / sample_rate
        
        # If anime_id provided, add to database
        if anime_id and episode is not None:
            from app.services.fingerprint_builder import FingerprintDatabaseBuilder
            
            builder = FingerprintDatabaseBuilder()
            
            # Store fingerprints
            fingerprints = builder.fingerprinter.extract_fingerprints(samples)
            hash_counts = {}
            for fp in fingerprints:
                hash_counts[fp.hash_value] = hash_counts.get(fp.hash_value, 0) + 1
            
            conn = await get_db_connection()
            async with conn.cursor() as cur:
                await cur.execute("""
                    INSERT INTO episode_fingerprints
                    (anime_id, episode_number, duration_seconds, fingerprint_count,
                     hash_index, status)
                    VALUES (%s, %s, %s, %s, %s, 'ready')
                    ON CONFLICT (anime_id, episode_number) DO UPDATE SET
                        hash_index = EXCLUDED.hash_index,
                        status = 'ready'
                """, (
                    anime_id,
                    episode,
                    duration_sec,
                    len(fingerprints),
                    list(hash_counts.keys())
                ))
                await conn.commit()
                await conn.close()
            
            return {
                "status": "indexed",
                "anime_id": anime_id,
                "episode": episode,
                "fingerprints_stored": len(hash_counts)
            }
        
        # Otherwise, match against database
        result = await fingerprint_matcher.match_episode(samples, duration_sec)
        
        if not result:
            return {"matched": False}
        
        return {
            "matched": True,
            "anime_id": result.anime_id,
            "episode": result.episode_number,
            "offset": result.offset_seconds,
            "confidence": result.confidence
        }
        
    except Exception as e:
        print(f"Error in match_episode_upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/populate-fingerprints")
async def populate_fingerprints(
    anime_id: str = Form(...),
    audio_directory: str = Form(...)
):
    """
    Populate fingerprint database for an entire anime series
    
    Scans directory for episode audio files and builds fingerprint index
    """
    try:
        result = await populate_anime_fingerprints(anime_id, audio_directory)
        return result
    except Exception as e:
        print(f"Error populating fingerprints: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/fingerprint-status/{anime_id}")
async def get_fingerprint_status(anime_id: str):
    """
    Get fingerprint database status for an anime
    """
    try:
        conn = await get_db_connection()
        async with conn.cursor() as cur:
            await cur.execute("""
                SELECT 
                    am.title,
                    COUNT(ef.id) as episodes_indexed,
                    am.episodes as total_episodes,
                    MAX(ef.duration_seconds) as avg_duration
                FROM anime_metadata am
                LEFT JOIN episode_fingerprints ef ON am.id = ef.anime_id
                WHERE am.id = %s
                GROUP BY am.id
            """, (anime_id,))
            row = await cur.fetchone()
            await conn.close()
            
            if not row:
                raise HTTPException(status_code=404, detail="Anime not found")
            
            return {
                "anime_id": anime_id,
                "title": row[0],
                "episodes_indexed": row[1] or 0,
                "total_episodes": row[2],
                "coverage": (row[1] or 0) / row[2] if row[2] else 0,
                "status": "ready" if row[1] and row[1] > 0 else "pending"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting fingerprint status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/detect-skip-intro")
async def detect_skip_intro(
    audio_base64: str = Form(...),
    duration_sec: float = Form(...)
):
    """
    Detect if current playback is in opening/ending theme
    
    Returns skip recommendations based on detected theme songs
    """
    try:
        result = await detect_anime_from_audio(audio_base64, duration_sec)
        
        if not result or not result.intro_skip:
            return {
                "skip_recommended": False,
                "reason": "no_intro_detected"
            }
        
        # Check if current offset is within intro
        current_offset = result.offset_seconds
        intro_start = result.intro_skip.get('start', 0)
        intro_end = result.intro_skip.get('end', 90)
        
        in_intro = intro_start <= current_offset <= intro_end
        
        return {
            "skip_recommended": in_intro,
            "intro_start": intro_start,
            "intro_end": intro_end,
            "current_position": current_offset,
            "seconds_remaining": max(0, intro_end - current_offset) if in_intro else 0
        }
        
    except Exception as e:
        print(f"Error detecting skip intro: {e}")
        raise HTTPException(status_code=500, detail=str(e))
