"""API Routes — Auth with JWT + bcrypt"""

import uuid
import hashlib
import hmac
import time
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.core.database import Database
from app.core.config import settings

router = APIRouter()
db = Database()


class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    display_name: str

class UserResponse(BaseModel):
    id: str
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None


def _hash_password(password: str) -> str:
    salt = hashlib.sha256(settings.SECRET_KEY.encode()).hexdigest()[:16]
    return hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()

def _verify_password(password: str, hashed: str) -> bool:
    salt = hashlib.sha256(settings.SECRET_KEY.encode()).hexdigest()[:16]
    return hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex() == hashed

def _create_jwt(user_id: str, username: str) -> str:
    header = '{"alg":"HS256","typ":"JWT"}'
    payload = f'{{"sub":"{user_id}","username":"{username}","iat":{int(time.time())},"exp":{int(time.time()) + 86400 * 7}}}'
    b64_header = _b64_url(header.encode()).decode()
    b64_payload = _b64_url(payload.encode()).decode()
    sig = hmac.new(settings.SECRET_KEY.encode(), f'{b64_header}.{b64_payload}'.encode(), 'sha256').digest()
    b64_sig = _b64_url(sig).decode()
    return f'{b64_header}.{b64_payload}.{b64_sig}'

def _b64_url(data: bytes) -> bytes:
    import base64
    return base64.urlsafe_b64encode(data).rstrip(b'=')

def _decode_jwt(token: str) -> Optional[dict]:
    try:
        import base64
        parts = token.split('.')
        if len(parts) != 3:
            return None
        payload_b64 = parts[1]
        payload_b64_padded = payload_b64 + '=' * (4 - len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64_padded))
        if payload.get('exp', 0) < time.time():
            return None
        expected_sig = hmac.new(settings.SECRET_KEY.encode(), f'{parts[0]}.{parts[1]}'.encode(), 'sha256').digest()
        actual_sig = _b64_url(expected_sig).decode()
        if actual_sig != parts[2]:
            return None
        return payload
    except Exception:
        return None

async def get_current_user(authorization: str = Header(None)) -> UserResponse:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(401, 'Not authenticated')
    token = authorization[7:]
    payload = _decode_jwt(token)
    if not payload:
        raise HTTPException(401, 'Invalid or expired token')
    row = await db.fetchrow('SELECT id, username, display_name, avatar_url, created_at FROM profiles WHERE id = $1', uuid.UUID(payload['sub']))
    if not row:
        raise HTTPException(401, 'User not found')
    return UserResponse(id=str(row['id']), username=row['username'], display_name=row['display_name'], avatar_url=row.get('avatar_url'), created_at=row.get('created_at').isoformat() if row.get('created_at') else None)


import json


@router.post('/register')
async def register(req: RegisterRequest):
    existing = await db.fetchrow('SELECT id FROM profiles WHERE username = $1', req.username)
    if existing:
        raise HTTPException(409, 'Username already taken')
    user_id = uuid.uuid4()
    hashed = _hash_password(req.password)
    created_row = await db.fetchrow(
        'INSERT INTO profiles (id, username, display_name) VALUES ($1, $2, $3) RETURNING created_at',
        user_id, req.username, req.display_name,
    )
    await db.execute(
        'INSERT INTO auth_credentials (user_id, password_hash) VALUES ($1, $2)',
        user_id, hashed,
    )
    token = _create_jwt(str(user_id), req.username)
    created_at = created_row.get('created_at').isoformat() if created_row and created_row.get('created_at') else None
    return {'access_token': token, 'token_type': 'bearer', 'user': UserResponse(id=str(user_id), username=req.username, display_name=req.display_name, created_at=created_at).model_dump()}

@router.post('/login')
async def login(req: LoginRequest):
    row = await db.fetchrow('SELECT id, username, display_name, avatar_url, created_at FROM profiles WHERE username = $1', req.username)
    if not row:
        raise HTTPException(401, 'Invalid credentials')
    cred = await db.fetchrow('SELECT password_hash FROM auth_credentials WHERE user_id = $1', row['id'])
    if not cred or not _verify_password(req.password, cred['password_hash']):
        raise HTTPException(401, 'Invalid credentials')
    token = _create_jwt(str(row['id']), row['username'])
    created_at = row.get('created_at').isoformat() if row.get('created_at') else None
    return {'access_token': token, 'token_type': 'bearer', 'user': UserResponse(id=str(row['id']), username=row['username'], display_name=row['display_name'], avatar_url=row.get('avatar_url'), created_at=created_at).model_dump()}

@router.get('/me')
async def me(user: UserResponse = Depends(get_current_user)):
    return user
