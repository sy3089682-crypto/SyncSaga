# SyncSaga

A production-grade realtime anime watch-party platform. Watch anime together with friends with synchronized playback, voice chat, and realtime messaging.

**SyncSaga does NOT host or distribute copyrighted content. It only synchronizes playback state between users on their own browser-based anime sources.**

## Features

### Core
- **Synchronized Playback** — Drift correction, latency compensation, authoritative host system
- **Voice Chat** — LiveKit-powered with noise suppression, push-to-talk, echo cancellation
- **Realtime Chat** — Emojis, GIFs, reactions, typing indicators, pinned messages
- **Watch Rooms** — Public/private rooms, host controls, co-host system, room themes
- **Friends System** — Add/remove, friend requests, presence, activity status
- **DM System** — Direct messaging between friends

### Browser Extension (Chrome & Firefox)
- HTML5 video player detection across anime websites
- Injects sync script to communicate with SyncSaga
- Detects episodes, timestamps, controls play/pause/seek
- MutationObserver-based dynamic video detection
- Room overlay button for quick access

### Premium Features
- Synchronized reactions
- Skip intro voting
- Auto next episode
- Watch history & activity feed
- Room themes & custom status
- Profile badges & Discord Rich Presence
- Anime-inspired loading animations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, TypeScript, TailwindCSS, Framer Motion, Zustand |
| **Backend** | Node.js, Express, Socket.IO, Redis Pub/Sub |
| **Database** | Supabase (PostgreSQL + Auth) |
| **Voice** | LiveKit |
| **Browser Extension** | Manifest V3, TypeScript, MutationObserver |
| **Deployment** | Docker, Railway, Cloudflare |

## Architecture

```
syncsaga/
├── apps/
│   ├── web/              # Next.js 15 frontend
│   │   ├── src/
│   │   │   ├── app/          # Pages (landing, dashboard, room, friends)
│   │   │   ├── components/   # Reusable UI components
│   │   │   ├── hooks/        # Custom React hooks
│   │   │   ├── store/        # Zustand state management
│   │   │   └── lib/          # Utilities, socket, supabase clients
│   │   └── ...
│   ├── api/              # Node.js + Express + Socket.IO backend
│   │   ├── src/
│   │   │   ├── socket/       # Socket.IO handlers (room, sync, chat, presence)
│   │   │   ├── routes/       # Express REST API routes
│   │   │   ├── services/     # Business logic (room, redis, etc.)
│   │   │   ├── lib/          # Utilities (jwt, supabase, logger)
│   │   │   └── middleware/   # Socket auth middleware
│   │   └── ...
│   └── extension/        # Chrome & Firefox extension
│       ├── src/
│       │   ├── content.ts    # Content script (video detection, sync bridge)
│       │   ├── background.ts # Service worker
│       │   ├── popup.ts      # Extension popup UI
│       │   └── popup.html    # Popup HTML
│       └── manifest.json     # Manifest V3
├── packages/
│   ├── shared/           # Shared TypeScript types
│   └── db/               # Database schemas & migrations
├── docker-compose.yml    # Docker orchestration
└── turbo.json            # Turborepo config
```

## Getting Started

### Prerequisites

- Node.js >= 20
- Docker & Docker Compose (for local development)
- Supabase account (free tier works)
- LiveKit Cloud or self-hosted instance

### 1. Clone & Install

```bash
git clone https://github.com/sy3089682-crypto/SyncSaga.git
cd syncsaga
npm install
```

### 2. Environment Variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (server-side) |
| `NEXT_PUBLIC_LIVEKIT_URL` | LiveKit WebSocket URL |
| `LIVEKIT_API_KEY` | LiveKit API key |
| `LIVEKIT_API_SECRET` | LiveKit API secret |
| `JWT_SECRET` | Secret for JWT token signing |
| `REDIS_URL` | Redis connection URL |

### 3. Database Setup

Run the schema against your Supabase PostgreSQL database:

```bash
# Using Supabase CLI
supabase db push

# Or manually execute packages/db/schema.sql in Supabase SQL editor
```

### 4. Run Locally

```bash
# Start Redis (if not using Docker)
docker compose up redis -d

# Start development servers
npm run dev
```

This starts:
- **Frontend** at http://localhost:3000
- **Backend** at http://localhost:4000

### 5. Browser Extension

```bash
cd apps/extension
npm install
npm run build
```

Then load the `dist/` folder as an unpacked extension in:
- **Chrome**: `chrome://extensions` → Load unpacked
- **Firefox**: `about:debugging#/runtime/this-firefox` → Load Temporary Add-on

## Deployment

### Docker (Production)

```bash
docker compose up --build
```

### Railway

The project includes Railway configuration files. Deploy by connecting your GitHub repo to Railway:

1. Create a new Railway project
2. Add a PostgreSQL database
3. Add Redis
4. Deploy the `web` and `api` services

### Required Railway Services

| Service | Plan |
|---------|------|
| PostgreSQL | Starter (free) |
| Redis | Starter (free) |
| Web (Next.js) | Starter (free) |
| API (Node.js) | Starter (free) |

## API Documentation

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Register with email/password |
| `POST` | `/api/auth/login` | Login with email/password |
| `POST` | `/api/auth/google` | Sign in with Google OAuth |
| `GET` | `/api/rooms` | List public rooms |
| `GET` | `/api/rooms/:id` | Get room details |
| `POST` | `/api/rooms` | Create a new room |

### Socket.IO Events

#### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `room:join` | `{ roomId, password? }` | Join a watch room |
| `room:leave` | `{ roomId }` | Leave a watch room |
| `room:update` | `{ id, ...fields }` | Update room settings (host only) |
| `sync:event` | `SyncEvent` | Send playback sync event |
| `sync:request` | `{ roomId }` | Request current sync state |
| `chat:message` | `{ roomId, content, type? }` | Send chat message |
| `chat:typing` | `{ roomId, isTyping }` | Typing indicator |
| `chat:reaction` | `{ messageId, emoji }` | React to message |
| `presence:update` | `PresenceEvent` | Update presence status |
| `voice:join` | `{ roomId }` | Join voice channel |
| `voice:leave` | `{ roomId }` | Leave voice channel |

#### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `room:state` | `Room & { members }` | Full room state on join |
| `room:user_joined` | `User` | User joined notification |
| `room:user_left` | `userId` | User left notification |
| `sync:event` | `SyncEvent` | Playback sync event |
| `sync:state` | `{ timestamp, playback_state, speed, episode }` | Authoritative sync state |
| `chat:message` | `Message & { sender }` | New chat message |
| `chat:typing` | `{ userId, isTyping }` | Typing indicator |
| `presence:update` | `PresenceEvent & { user }` | Presence change |
| `error` | `{ code, message }` | Error notification |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` and `npm run typecheck`
5. Submit a pull request

## License

MIT

## Disclaimer

SyncSaga does not host, store, or distribute any copyrighted content. It is a synchronization tool that allows users to watch content they already have access to, in a synchronized manner with friends. Users are responsible for ensuring they have the legal right to access any content they stream through the platform.
