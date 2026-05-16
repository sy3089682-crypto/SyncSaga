"""API Routes — AI Detection & Fingerprinting (connected to ai-services)"""

import base64
import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from app.models.schemas import DetectionResult
from app.api.routes.auth import get_current_user, UserResponse
from app.core.config import settings

router = APIRouter()
AI_SERVICE_URL = settings.BACKEND_URL.replace('8000', '8001')


class MatchByAudioRequest(BaseModel):
    fingerprints: list[int]
    duration: float = 3.0

class MatchByVisualRequest(BaseModel):
    embeddings: list[list[float]]
    count: int = 1

class HybridMatchRequest(BaseModel):
    audio_fingerprints: Optional[list[int]] = None
    visual_embeddings: Optional[list[list[float]]] = None
    subtitle_text: Optional[str] = None
    source_url: Optional[str] = None

class TranscribeRequest(BaseModel):
    audio_base64: str
    language: Optional[str] = None


async def _call_ai(endpoint: str, payload: dict) -> dict:
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f'{AI_SERVICE_URL}{endpoint}', json=payload)
            if resp.status_code == 200:
                return resp.json()
            return {'error': f'AI service error: {resp.status_code}'}
    except httpx.ConnectError:
        return {'error': 'AI service unreachable'}
    except Exception as e:
        return {'error': str(e)}


@router.post('/match-episode')
async def match_episode(req: HybridMatchRequest, user: UserResponse = Depends(get_current_user)):
    payload = {}
    if req.audio_fingerprints:
        payload['audio_hashes'] = req.audio_fingerprints
    if req.subtitle_text:
        payload['subtitle_text'] = req.subtitle_text
    if req.visual_embeddings and len(req.visual_embeddings) > 0:
        payload['visual_embedding'] = req.visual_embeddings[0]

    result = await _call_ai('/hybrid/match', payload)
    if 'error' in result:
        raise HTTPException(503, result['error'])
    return result


@router.post('/detect')
async def detect_timestamp(req: MatchByAudioRequest, user: UserResponse = Depends(get_current_user)):
    result = await _call_ai('/fingerprint/match', {'hashes': req.fingerprints, 'count': 30})
    if 'error' in result:
        raise HTTPException(503, result['error'])
    return result


@router.post('/embed')
async def compute_embedding(text: str, user: UserResponse = Depends(get_current_user)):
    result = await _call_ai('/subtitle/embed', {'text': text})
    if 'error' in result:
        raise HTTPException(503, result['error'])
    return result


@router.post('/transcribe')
async def transcribe_audio(req: TranscribeRequest, user: UserResponse = Depends(get_current_user)):
    try:
        audio_bytes = base64.b64decode(req.audio_base64)
        result = await _call_ai('/subtitle/transcribe', {'audio_bytes': base64.b64encode(audio_bytes).decode()})
        if 'error' in result:
            raise HTTPException(503, result['error'])
        return result
    except Exception as e:
        raise HTTPException(400, f'Invalid audio data: {str(e)}')


@router.post('/detect-op-ed')
async def detect_op_ed(audio_base64: str, user: UserResponse = Depends(get_current_user)):
    try:
        audio_bytes = base64.b64decode(audio_base64)
        with open('/tmp/op_ed_audio.wav', 'wb') as f:
            f.write(audio_bytes)
        result = await _call_ai('/scene/detect-op-ed', {'audio_path': '/tmp/op_ed_audio.wav'})
        if 'error' in result:
            raise HTTPException(503, result['error'])
        return result
    except Exception as e:
        raise HTTPException(400, str(e))


@router.get('/status')
async def ai_status(user: UserResponse = Depends(get_current_user)):
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f'{AI_SERVICE_URL}/health')
            if resp.status_code == 200:
                data = resp.json()
                return {
                    'fingerprint': data.get('models', {}).get('fingerprint', False),
                    'visual': data.get('models', {}).get('visual', False),
                    'scene': data.get('models', {}).get('scene', False),
                    'subtitle': data.get('models', {}).get('subtitle', False),
                    'fingerprint_index_size': data.get('fingerprint_index_size', 0),
                    'visual_vectors': data.get('visual_vectors_count', 0),
                    'subtitle_embeddings': data.get('subtitle_embeddings_count', 0),
                    'connected': True,
                }
        return {'connected': False, 'error': 'AI service unreachable'}
    except Exception as e:
        return {'connected': False, 'error': str(e)}
