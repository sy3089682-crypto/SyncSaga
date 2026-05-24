"""Auth Middleware — JWT verification + rate limiting"""

import time
import uuid
from fastapi import Request, HTTPException, Depends
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable, Optional
import hashlib
import hmac
import json as json_mod

from app.core.config import settings
from app.core.database import Database

db = Database()


def decode_jwt(token: str) -> Optional[dict]:
    try:
        import base64
        parts = token.split('.')
        if len(parts) != 3:
            return None
        payload_b64 = parts[1]
        payload_b64_padded = payload_b64 + '=' * (4 - len(payload_b64) % 4)
        payload = json_mod.loads(base64.urlsafe_b64decode(payload_b64_padded))
        if payload.get('exp', 0) < time.time():
            return None
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode(),
            f'{parts[0]}.{parts[1]}'.encode(),
            'sha256',
        ).digest()
        sig_b64 = base64.urlsafe_b64encode(expected_sig).rstrip(b'=').decode()
        if sig_b64 != parts[2]:
            return None
        return payload
    except Exception:
        return None


def get_token_from_request(request: Request) -> Optional[str]:
    auth = request.headers.get('authorization')
    if auth and auth.startswith('Bearer '):
        return auth[7:]
    token = request.query_params.get('token')
    if token:
        return token
    return None


def get_current_user_id(request: Request) -> Optional[str]:
    token = get_token_from_request(request)
    if not token:
        return None
    payload = decode_jwt(token)
    if not payload:
        return None
    return payload.get('sub')


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        path = request.url.path
        if path in ["/", "/health", "/docs", "/openapi.json"]:
            return await call_next(request)
        if path.startswith("/api/auth/login") or path.startswith("/api/auth/register"):
            return await call_next(request)
        if path.startswith("/api/anime"):
            return await call_next(request)

        user_id = get_current_user_id(request)
        if not user_id and not path.startswith('/ws/'):
            return JSONResponse(status_code=401, content={'detail': 'Not authenticated'})

        request.state.user_id = user_id
        return await call_next(request)


class RateLimitMiddleware(BaseHTTPMiddleware):
    WINDOW_SEC = 60
    MAX_REQUESTS = 60

    async def dispatch(self, request: Request, call_next: Callable):
        user_id = getattr(request.state, 'user_id', None)
        path = request.url.path

        if not user_id or path.startswith('/health'):
            return await call_next(request)

        try:
            row = await db.fetchrow(
                """SELECT request_count FROM rate_limits
                   WHERE user_id = $1 AND endpoint = $2
                   AND window_start > NOW() - $3::interval""",
                uuid.UUID(user_id), path,
                f'{self.WINDOW_SEC} seconds',
            )
            if row and row['request_count'] >= self.MAX_REQUESTS:
                return JSONResponse(
                    status_code=429,
                    content={'detail': 'Rate limit exceeded', 'retry_after': self.WINDOW_SEC},
                )
            if row:
                await db.execute(
                    'UPDATE rate_limits SET request_count = request_count + 1 WHERE user_id = $1 AND endpoint = $2',
                    uuid.UUID(user_id), path,
                )
            else:
                await db.execute(
                    'INSERT INTO rate_limits (user_id, endpoint) VALUES ($1, $2)',
                    uuid.UUID(user_id), path,
                )
        except Exception:
            pass

        return await call_next(request)
