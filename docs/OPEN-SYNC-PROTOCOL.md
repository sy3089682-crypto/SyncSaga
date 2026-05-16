# SyncSaga Open Sync Protocol (OSP)

Version: 1.0.0
Status: Draft

## Overview

The Open Sync Protocol is a lightweight, realtime protocol for synchronizing media playback across multiple clients. It is transport-agnostic (WebSocket, WebRTC data channels, HTTP long-poll) and designed to be implemented by any streaming site, browser extension, or standalone app.

## Core Concepts

### Room
A virtual space where participants share synchronized media playback. Each room has exactly one **Host** (authoritative clock source) and zero or more **Peers**.

### Host
The participant whose playback state is considered authoritative. The host:
- Broadcasts sync events
- Processes drift correction
- Validates peer commands

### Peer
A participant who follows the host's playback state. Peers:
- Send `ready` and `buffering` events for their own state
- Can request sync state
- Must apply received sync events within 100ms

## Message Format

All messages are JSON with the following envelope:

```json
{
  "v": 1,
  "type": "<event_type>",
  "ts": 1712345678901,
  "room": "<room_id>",
  "from": "<user_id>",
  "data": { ... }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `v` | int | Protocol version (1) |
| `type` | string | Event type |
| `ts` | int | Unix timestamp ms (sender's clock) |
| `room` | string | Room identifier |
| `from` | string | Sender user ID |
| `data` | object | Event-specific payload |

## Events

### Playback Control (Host → Peers)

#### `sync.play`
```json
{ "type": "sync.play", "data": { "t": 142.5, "speed": 1.0 } }
```
- `t`: Current timestamp in seconds
- `speed`: Playback rate (default 1.0)
- Peer action: `video.play()` + seek to `t`

#### `sync.pause`
```json
{ "type": "sync.pause", "data": { "t": 142.5 } }
```
- `t`: Timestamp when paused
- Peer action: `video.pause()`

#### `sync.seek`
```json
{ "type": "sync.seek", "data": { "t": 320.0 } }
```
- `t`: New timestamp
- Peer action: `video.currentTime = t`

#### `sync.speed`
```json
{ "type": "sync.speed", "data": { "speed": 2.0 } }
```
- `speed`: Playback rate
- Peer action: `video.playbackRate = speed`

#### `sync.episode`
```json
{ "type": "sync.episode", "data": { "ep": 5, "title": "Episode 5", "t": 0 } }
```
- `ep`: Episode number
- `title`: Episode title
- `t`: Start timestamp

### State Reports (Peer → Host)

#### `sync.ready`
```json
{ "type": "sync.ready", "data": { "t": 142.5 } }
```
Sent when peer's video is ready (loadedmetadata / canplay).
Host uses this to know the peer is synchronized.

#### `sync.buffering`
```json
{ "type": "sync.buffering", "data": { "t": 142.5, "buffering": true } }
```
Sent when peer starts/stops buffering.
Host can pause all peers if too many are buffering.

### Drift Correction

#### `sync.ping` (Host → Peer)
```json
{ "type": "sync.ping", "data": { "st": 1712345678901 } }
```
- `st`: Server timestamp at send

#### `sync.pong` (Peer → Host)
```json
{ "type": "sync.pong", "data": { "st": 1712345678901, "ct": 1712345679100, "pt": 1712345679200 } }
```
- `st`: Server timestamp from ping
- `ct`: Client timestamp when pong sent
- `pt`: Client timestamp when ping received

**Latency calculation:**
```
rtt = now - st
latency = rtt / 2
clock_diff = ct - (st + latency)
adjusted_time = client_time - clock_diff
```

If `|clock_diff| > 1000ms`, host sends a drift correction.

#### `sync.correct`
```json
{ "type": "sync.correct", "data": { "t": 320.5 } }
```
- `t`: Corrected authoritative timestamp
- Peer action: `video.currentTime = t` (if drift > 1.5s)

### Room Events

#### `room.join`
```json
{ "type": "room.join", "data": { "room": "abc123", "password": null } }
```

#### `room.leave`
```json
{ "type": "room.leave", "data": {} }
```

#### `room.state`
```json
{ "type": "room.state", "data": { "host": "user_1", "peers": ["user_2", "user_3"], "t": 142.5, "state": "playing" } }
```
Full room state snapshot (sent on join).

### Timestamp Reactions

#### `reaction.add`
```json
{ "type": "reaction.add", "data": { "t": 320.0, "type": "laugh", "content": "omg" } }
```
- `t`: Timestamp in episode
- `type`: One of: laugh, cry, shock, fire, heart, gg, voice, text
- `content`: Optional text/voice URL

#### `reaction.broadcast` (Server → All)
```json
{ "type": "reaction.broadcast", "data": { "from": "user_1", "t": 320.0, "type": "laugh" } }
```

## Transport

### WebSocket (Default)
- Endpoint: `wss://syncsaga.app/ws?token=<jwt>`
- Messages: JSON over WebSocket frames
- Reconnect: Exponential backoff (1s, 2s, 4s, 8s, max 30s)

### Socket.IO (Web App)
- Namespace: `/`
- Events map directly to OSP types (dots replaced with colons)
- `sync.play` → `sync:play`

### WebRTC Data Channels (Low-Latency)
- For sub-50ms sync requirements
- Uses mesh topology for small rooms (< 10)
- SFU for larger rooms

## Implementing OSP

### Minimum Viable Implementation (Browser Extension)

```javascript
class SyncSagaClient {
  constructor(roomId, token) {
    this.ws = new WebSocket(`wss://syncsaga.app/ws?token=${token}`);
    this.video = document.querySelector('video');
    this.setup();
  }

  setup() {
    this.ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      switch (msg.type) {
        case 'sync.play': this.video.play(); break;
        case 'sync.pause': this.video.pause(); break;
        case 'sync.seek': this.video.currentTime = msg.data.t; break;
        case 'sync.speed': this.video.playbackRate = msg.data.speed; break;
        case 'sync.correct':
          if (Math.abs(this.video.currentTime - msg.data.t) > 1.5)
            this.video.currentTime = msg.data.t;
          break;
      }
    };

    this.video.addEventListener('play', () => this.send('sync.ready', { t: this.video.currentTime }));
    this.video.addEventListener('pause', () => this.send('sync.ready', { t: this.video.currentTime }));
    this.video.addEventListener('seeked', () => this.send('sync.ready', { t: this.video.currentTime }));
  }

  send(type, data) {
    this.ws.send(JSON.stringify({ v: 1, type, ts: Date.now(), room: this.roomId, from: this.userId, data }));
  }
}
```

### Streaming Site Integration (Iframe Embed)

```html
<script src="https://syncsaga.app/api/embed/widget/ROOM_ID"></script>
```

## Rate Limits

| Event | Limit |
|-------|-------|
| `sync.play` / `sync.pause` / `sync.seek` | 10/s per host |
| `sync.ready` | 2/s per peer |
| `sync.ping` / `sync.pong` | 1/s per room |
| `reaction.add` | 5/s per user |
| `room.join` | 3/10s per user |

## Security

- All WebSocket connections require JWT authentication
- Room join validates membership via server
- Host authority verified by server (only host_id can send control events)
- Rate limiting enforced server-side
- Message size limit: 10KB per message

## Versioning

Protocol version is incremented when:
- New event types are added (minor bump)
- Existing event payloads change (major bump)
- Transport requirements change (major bump)

Current: 1.0.0

## Reference Implementations

- **Server**: [SyncSaga API](https://github.com/sy3089682-crypto/SyncSaga/tree/master/apps/api)
- **Web Client**: [SyncSaga Web](https://github.com/sy3089682-crypto/SyncSaga/tree/master/apps/web)
- **Browser Extension**: [SyncSaga Extension](https://github.com/sy3089682-crypto/SyncSaga/tree/master/apps/extension)
- **Embed Widget**: `GET /api/embed/widget/:roomId`

---

*The Open Sync Protocol is designed to be the universal standard for synchronized media playback. Implement it in your app, extension, or streaming site to join the SyncSaga ecosystem.*
