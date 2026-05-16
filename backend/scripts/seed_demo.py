"""
Seed script: creates demo data (users, rooms, scenes) for development.
Run: python -m scripts.seed_demo
"""

import asyncio
import uuid
import hashlib
import hmac
import time
import json

from app.core.database import Database
from app.core.config import settings


def _create_jwt(user_id: str, username: str) -> str:
    import base64
    header = '{"alg":"HS256","typ":"JWT"}'
    payload = f'{{"sub":"{user_id}","username":"{username}","iat":{int(time.time())},"exp":{int(time.time()) + 86400 * 30}}}'
    b64_header = base64.urlsafe_b64encode(header.encode()).rstrip(b'=').decode()
    b64_payload = base64.urlsafe_b64encode(payload.encode()).rstrip(b'=').decode()
    sig = hmac.new(settings.SECRET_KEY.encode(), f'{b64_header}.{b64_payload}'.encode(), 'sha256').digest()
    b64_sig = base64.urlsafe_b64encode(sig).rstrip(b'=').decode()
    return f'{b64_header}.{b64_payload}.{b64_sig}'


async def seed():
    db = Database()
    await db.connect()

    print('Seeding demo data...')

    user1 = uuid.uuid4()
    user2 = uuid.uuid4()
    await db.execute(
        'INSERT INTO profiles (id, username, display_name, status) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        user1, 'alice', 'Alice', 'online',
    )
    await db.execute(
        'INSERT INTO profiles (id, username, display_name, status) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        user2, 'bob', 'Bob', 'online',
    )
    salt = hashlib.sha256(settings.SECRET_KEY.encode()).hexdigest()[:16]
    pw_hash = hashlib.pbkdf2_hmac('sha256', 'password'.encode(), salt.encode(), 100000).hex()
    await db.execute(
        'INSERT INTO auth_credentials (user_id, password_hash) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        user1, pw_hash,
    )
    await db.execute(
        'INSERT INTO auth_credentials (user_id, password_hash) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        user2, pw_hash,
    )

    token1 = _create_jwt(str(user1), 'alice')
    token2 = _create_jwt(str(user2), 'bob')

    room1 = uuid.uuid4()
    await db.execute(
        'INSERT INTO rooms (id, name, host_id, description, is_private) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
        room1, 'Attack on Titan Watch Party', user1, 'Watching Season 4 Episode 1', False,
    )
    await db.execute(
        'INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        room1, user1, 'host',
    )
    await db.execute(
        'INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        room1, user2, 'member',
    )

    room2 = uuid.uuid4()
    await db.execute(
        'INSERT INTO rooms (id, name, host_id, description) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        room2, 'One Piece Marathon', user2, 'Episodes 1000-1010', False,
    )
    await db.execute(
        'INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        room2, user2, 'host',
    )

    print(f'\nDemo users created!')
    print(f'  Alice (host):    username=alice    password=password')
    print(f'  Bob (member):    username=bob      password=password')
    print(f'\nAuth tokens (use in Authorization: Bearer <token>):')
    print(f'  Alice: {token1}')
    print(f'  Bob:   {token2}')
    print(f'\nRooms created:')
    print(f'  {room1} - Attack on Titan Watch Party')
    print(f'  {room2} - One Piece Marathon')

    await db.disconnect()
    print('\nDone!')


if __name__ == '__main__':
    asyncio.run(seed())
