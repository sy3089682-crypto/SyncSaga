# Open Sync Protocol v2

Cross-source synchronization protocol for SyncSaga.

## Overview

The Open Sync Protocol defines how participants in a watch party stay synchronized across different media sources. Rather than relying on raw timestamps alone, the protocol uses a **scene-graph anchoring** system where all sync events, reactions, and clips are tied to scene fingerprint IDs.

## Protocol Flow

### 1. Connection

```
Client -> Server:  WebSocket /ws/:room_id?token=:jwt
Server -> Client:  { type: "connected", payload: { room_id, user_id } }
```

### 2. Sync Events

Sent by any participant when their playback state changes:

```json
{
  "type": "sync_event",
  "payload": {
    "event_type": "play" | "pause" | "seek" | "rate_change",
    "media_timestamp": 124.5,
    "playback_rate": 1.0,
    "scene_id": "uuid-optional"
  }
}
```

### 3. Sync State Broadcast

Server broadcasts authoritative sync state to all participants every 4s or on change:

```json
{
  "type": "sync_state",
  "payload": {
    "media_timestamp": 124.5,
    "playback_rate": 1.0,
    "is_playing": true,
    "confidence": 0.92,
    "active_method": "audio_fingerprint"
  }
}
```

### 4. Drift Correction

Clients calculate drift from received sync state and apply:

| Drift | Action |
|-------|--------|
| < 1.5s | No action (within tolerance) |
| 1.5s - 3s | Soft correction (playback rate 1.03x) |
| > 3s | Hard correction (seek to server timestamp) |

## Scene Graph

All sync data is structured around the scene graph:

```
Episode
  └── Scene 1 (fingerprint: abc123)
       ├── Sync Events (anchored to scene_id)
       ├── Reactions (anchored to scene_id)
       ├── Clips (scene boundaries)
       └── Comments (anchored to scene_id)
  └── Scene 2 (fingerprint: def456)
       ...
```

## Hybrid Detection

When a participant joins mid-session or drifts too far:

1. **Direct Timestamp** — If same source, use raw timestamp
2. **Audio Fingerprint** — Extract audio chunk, match against fingerprint DB
3. **Visual Matching** — Capture frame, query FAISS/OpenCLIP index
4. **Subtitle OCR** — Extract subtitle text, match against episode transcript
5. **Playback Prediction** — Estimate position from last known state

## REST Endpoints

### Sync
- `POST /api/sync/:room_id/event` — Post a sync event
- `GET /api/sync/:room_id/state` — Get current sync state
- `GET /api/sync/:room_id/health` — Sync health metrics

### AI Detection
- `POST /api/ai/match-episode` — Hybrid episode matching
- `POST /api/ai/detect` — Run all detection methods
- `GET /api/ai/status` — Service status

## Embed Widget

Rooms can be embedded on external sites:

```html
<iframe
  src="https://syncsaga.app/embed/:room_id?token=:embed_token"
  width="100%"
  height="100%"
  frameborder="0"
></iframe>
```

The embed widget shows sync status and basic playback controls.
