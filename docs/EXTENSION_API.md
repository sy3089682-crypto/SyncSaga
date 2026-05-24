# Extension API

The SyncSaga browser extension communicates with both the web app and the SyncSaga API server to enable synchronized playback across browser-based anime websites.

## Architecture

```
┌─────────────────┐     chrome.runtime.sendMessage     ┌─────────────────┐
│   Popup (popup) │◄──────────────────────────────────►│  Content Script  │
│   UI + Connect  │                                    │  (content.ts)    │
└─────────────────┘                                    └────────┬────────┘
                                                                │
                                                    WebSocket (ws://)
                                                                │
                                                         ┌──────▼──────┐
                                                         │  wsBridge   │
                                                         │  (server)   │
                                                         └─────────────┘
```

## Communication Flow

### 1. Content Script ↔ Web App (chrome.runtime)
Messages are sent via `chrome.runtime.sendMessage`:

| Message Type | Direction | Payload | Description |
|-------------|-----------|---------|-------------|
| `CONNECT` | Popup → Content | `{ token, roomId }` | Connect to a room |
| `DISCONNECT` | Popup → Content | `{}` | Disconnect from room |
| `GET_STATE` | Popup → Content | `{}` | Request video state |
| `VIDEO_DETECTED` | Content → Background | `{ hasVideo: boolean }` | Video player found |
| `VIDEO_STATE` | Content → All | `{ isPlaying, currentTime, duration, ... }` | Current video state |

### 2. Content Script ↔ Server (WebSocket)
Once connected, the content script establishes a WebSocket connection to the server's wsBridge endpoint (`/ws`):

| Message Type | Payload | Description |
|-------------|---------|-------------|
| `ROOM_JOIN` | `{ roomId }` | Join a watch room |
| `ROOM_LEAVE` | `{ roomId }` | Leave a watch room |
| `SYNC_EVENT` | `{ type, timestamp, playback_speed, episode }` | Send sync event |
| `SYNC_REQUEST` | `{}` | Request current sync state |
| `ROOM_JOINED` | `{ roomId }` | Confirmation of join |
| `SYNC_EVENT` | *event data* | Incoming sync event from server |
| `SYNC_STATE` | `{ timestamp, playback_state, speed, episode }` | Authoritative state |
| `ROOM_UPDATE` | `{ memberCount, roomName }` | Room metadata update |

## Site-Specific Selectors

The extension auto-detects video players using dedicated CSS selectors:

| Site | Selector | Episode Detection |
|------|----------|-------------------|
| Crunchyroll | `.video-player video` | URL path `/watch/...` |
| HiAnime | `#player video` | URL path `/watch/...` |
| Gogoanime | `.play-video iframe video` | Element class `[class*="episode"]` |
| 9anime | `.player video` | URL path `/watch/...` |
| Bilibili | `.bpx-player video` | URL path `/video/...` |
| Funimation | `.vjs-tech` | URL path `/v/...` |

## MutationObserver & SPA Support

The extension handles Single Page App navigation:
- `MutationObserver` watches the DOM for video element changes
- `popstate` and `hashchange` events trigger re-detection
- All detection is debounced by 500ms to prevent multiple binds

## Overlay UI

The injected overlay is a floating pill with:
- Connection status dot (green/red)
- Room name text
- Voice mute/unmute toggle
- Minimize/maximize toggle
- Draggable positioning (mouse drag)

## Popup UI

The extension popup provides:
- Connection status indicator
- Video detection status
- Current room info (name, member count, avatars)
- Quick-create room from current URL
- Connect/disconnect controls
- Invite link with copy-to-clipboard
