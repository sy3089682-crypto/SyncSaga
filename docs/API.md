# API Documentation

## Base URL
- Development: `http://localhost:4000`
- Production: `https://api.syncsaga.app`

## Authentication

Most endpoints require a Bearer token in the `Authorization` header:
```
Authorization: Bearer <token>
```

### Auth Flow
1. Register/Login via `POST /api/auth/register` or `POST /api/auth/login`
2. Receive `accessToken` (15min expiry) and `refreshToken` (7 days, httpOnly cookie)
3. Use `accessToken` in subsequent requests
4. When token expires, use refresh endpoint to get a new token pair

## REST Endpoints

### Auth

#### POST /api/auth/register
```json
// Request
{ "email": "user@example.com", "password": "securepass", "username": "animefan" }

// Response 200
{ "token": "jwt...", "user": { "id": "uuid", "email": "user@example.com" } }
```

#### POST /api/auth/login
```json
// Request
{ "email": "user@example.com", "password": "securepass" }

// Response 200
{ "token": "jwt...", "user": { "id": "uuid", "email": "user@example.com" } }
```

### Rooms

#### GET /api/rooms
```json
// Response 200
{ "rooms": [{ "id": "uuid", "name": "Attack on Titan Night", "is_private": false, ... }] }
```

#### GET /api/rooms/:id
```json
// Response 200
{ "room": { "id": "uuid", "name": "...", "members": [...], "current_episode": "Episode 5", ... } }
```

#### POST /api/rooms
```json
// Request
{
  "name": "One Piece Marathon",
  "description": "Watching the Whole Cake Island arc",
  "isPrivate": false,
  "maxUsers": 10,
  "animeTitle": "One Piece",
  "animeMediaId": 21
}

// Response 201
{ "room": { "id": "uuid", ... } }
```

### AI

#### POST /api/ai/recommend
```json
// Request
{
  "watchHistory": [{ "title": "Attack on Titan", "genres": ["Action", "Drama"], "score": 9 }],
  "preferredGenres": ["Action", "Fantasy"]
}

// Response 200
{ "recommendations": [{ "title": "Vinland Saga", "reason": "...", "matchScore": 95, "coverUrl": "..." }] }
```

#### POST /api/ai/summarize-session
```json
// Request
{
  "messages": [{ "username": "Alice", "content": "That was insane!", "timestamp": "..." }],
  "animeTitle": "Attack on Titan"
}

// Response 200
{ "summary": { "title": "...", "stats": { "totalMessages": 100 }, "topMoments": [...], "vibe": "Lively" } }
```

#### POST /api/ai/subtitle-assist
```json
// Request
{
  "question": "What did she mean by 'that person'?",
  "animeTitle": "Attack on Titan",
  "episode": 5,
  "timestamp": 1200
}

// Response 200
{ "explanation": "In Japanese culture...", "context": "Scene from...", "relatedTerms": ["person", "mean"] }
```

#### POST /api/ai/generate-room-names
```json
// Request
{ "animeTitle": "One Piece" }

// Response 200
{ "suggestions": ["One Piece Watch Party", "One Piece Marathon", "One Piece Squad", "One Piece Night", "One Piece and Chill"] }
```

## Socket.IO Events

### Connection
WebSocket URL: `http://localhost:4000`
```javascript
const socket = io('http://localhost:4000', {
  auth: { token: 'jwt...' },
  transports: ['websocket', 'polling']
});
```

### Client → Server Events

#### room:join
```javascript
socket.emit('room:join', { roomId: 'uuid', password?: 'optional' });
```

#### room:leave
```javascript
socket.emit('room:leave', { roomId: 'uuid' });
```

#### sync:event
```javascript
socket.emit('sync:event', {
  room_id: 'uuid',
  user_id: 'uuid',
  type: 'play' | 'pause' | 'seek' | 'speed' | 'episode',
  timestamp: 120.5,
  playback_speed: 1.0,
  episode: 'Episode 5'
});
```

#### chat:message
```javascript
socket.emit('chat:message', {
  roomId: 'uuid',
  content: 'OMG that episode!',
  type: 'text'
});
```

#### sync:ping (for RTT measurement)
```javascript
socket.emit('sync:ping', { clientTime: Date.now() });
```

#### anime:set_episode (host only)
```javascript
socket.emit('anime:set_episode', { roomId: 'uuid', mediaId: 21, episode: 5 });
```

#### sync:lock (host only)
```javascript
socket.emit('sync:lock', { enabled: true });
```

#### reaction:add
```javascript
socket.emit('reaction:add', { roomId: 'uuid', timestampSec: 120, type: 'laugh' });
```

### Server → Client Events

#### room:state
```javascript
socket.on('room:state', (room) => {
  // { id, name, members: [...], current_episode, ... }
});
```

#### sync:state
```javascript
socket.on('sync:state', (state) => {
  // { timestamp: 120.5, playback_state: 'playing', speed: 1.0, episode: 'Episode 5', episode_number: 5 }
});
```

#### sync:drift_update
```javascript
socket.on('sync:drift_update', (data) => {
  // { userId: 'uuid', drift: 0.3, status: 'synced' | 'slight' | 'desynced' }
});
```

#### chat:message
```javascript
socket.on('chat:message', (message) => {
  // { id, sender_id, content, type, created_at, sender: { username, avatar_url } }
});
```

#### error
```javascript
socket.on('error', (error) => {
  // { code: 'ROOM_NOT_FOUND', message: 'Room not found' }
});
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body/params |
| `ROOM_NOT_FOUND` | 404 | Room does not exist |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `ROOM_FULL` | 403 | Room at maximum capacity |
| `BANNED` | 403 | User is banned from room |
| `NOT_HOST` | 403 | Only host can perform this action |
| `NOT_IN_ROOM` | 403 | User not in this room |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Internal server error |
