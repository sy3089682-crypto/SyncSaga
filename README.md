# SyncSaga

Realtime synchronized anime watch-party platform. Watch anime together in perfect sync with voice chat, messaging, and friends.

## 🚀 Live Deployments

| Service | URL | Status |
|---------|-----|--------|
| **Web App (Vercel)** | https://syncsaga.vercel.app | ✅ Live |
| **API (Render)** | https://syncsaga.onrender.com | ✅ Live |
| **Health Check** | https://syncsaga.onrender.com/health | ✅ Passing |

## Tech Stack

- **Frontend**: Next.js 15 (Vercel)
- **Backend**: Express + Socket.IO (Render)
- **Database**: Supabase (PostgreSQL + Auth)
- **Cache/State**: Render Key-Value (Redis)
- **Voice**: LiveKit Cloud
- **CDN/Security**: Cloudflare
- **Monitoring**: Sentry + PostHog
- **CI/CD**: GitHub Actions
- **Distribution**: PWA + PWABuilder APK

## Quick Start

```bash
# Install dependencies
npm install --legacy-peer-deps

# Copy and fill env vars
cp .env.example .env

# Start development
npm run dev
```

## Project Structure

```
apps/
  api/        - Express + Socket.IO backend
  web/        - Next.js frontend
  extension/  - Chrome extension (Manifest V3)
packages/
  shared/     - Shared TypeScript types
  config/     - Environment configuration
  db/         - Drizzle ORM schema
.github/
  workflows/  - CI/CD pipelines
```

## Key Features

- Frame-perfect synchronized playback with drift correction
- Real-time voice chat via LiveKit
- In-room text chat with GIF support
- Create public/private watch rooms
- User authentication (Email, Google, GitHub, Discord)
- 2FA support
- Timestamp-anchored reactions
- Watch history and activity feed
- Clip moments creation
- AI-powered recommendations
- Achievement system
- PWA with install prompt
- Chrome extension for syncing across streaming sites

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        GitHub (main)                        │
└─────────────────────┬───────────────────────────────────────┘
                      │ Push
          ┌───────────┴───────────┐
          ▼                       ▼
    ┌─────────────┐         ┌─────────────┐
    │   Vercel    │         │   Render    │
    │  (Frontend) │         │   (API)     │
    │ syncsaga.   │         │ syncsaga.   │
    │ vercel.app  │         │ onrender.com│
    └──────┬──────┘         └──────┬──────┘
           │                       │
           │              ┌────────┴────────┐
           │              ▼                 ▼
           │       ┌──────────┐       ┌──────────┐
           │       │ Supabase │       │ Render   │
           │       │ (Auth +  │       │ Key-Value│
           └──────▶│   DB)    │       │ (Redis)  │
                  └──────────┘       └──────────┘
```

## Environment Variables

### Vercel (Frontend)
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

### Render (API)
| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `REDIS_URL` | `fromKeyValue: syncsaga-redis` |
| `JWT_SECRET` | Secret for JWT tokens |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens |
| `CORS_ORIGIN` | `https://syncsaga.vercel.app,...` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `SUPABASE_ANON_KEY` | Supabase anon key |

## CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
- Lint (ESLint + Prettier)
- Typecheck (TypeScript)
- Test (Vitest + Playwright)
- Build (Turbo)
- Deploy Preview (Vercel)
- Deploy Production (Vercel + Render)
```

## Test Coverage

- **Unit/Integration**: `npm run test` (Vitest)
- **E2E**: `npm run test:e2e` (Playwright)
- **Type Safety**: `npm run typecheck`

## Deployment Commands

```bash
# Deploy to Vercel (auto on push to main)
vercel --prod

# Deploy to Render (auto on push to main)
# Or trigger manually:
curl -X POST "https://api.render.com/v1/services/srv-d8deprcm0tmc73ds8pqg/deploys" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"clearCache":"clear"}'
```

## Current Status (Aug 2026)

| Component | Status | Notes |
|-----------|--------|-------|
| GitHub CI | ✅ Passing | 5/5 jobs green |
| Vercel Web | ✅ Live | Auto-deploy on push |
| Render API | ✅ Live | Health checks passing |
| Supabase Auth | ✅ Working | Email + OAuth |
| AniList API | ⚠️ Down | Using Jikan fallback |
| Render Redis | ⚠️ Pending | Using Key-Value |
| Socket.IO | ✅ Connected | CORS configured |

## Known Issues

1. **AniList API temporarily disabled** - Using Jikan (MyAnimeList) as fallback
2. **Render Key-Value internal DNS** - May need manual env var sync
3. **Demo room video source** - Requires manual video URL configuration

## License

MIT
