# SyncSaga

Realtime synchronized anime watch-party platform. Watch anime together in perfect sync with voice chat, messaging, and friends.

## Tech Stack

- **Frontend**: Next.js 15 (Vercel)
- **Backend**: Express + Socket.IO (Render)
- **Database**: Supabase (PostgreSQL + Auth)
- **Cache/State**: Upstash Redis
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

## Deployment

See `docs/DEPLOYMENT.md` for full deployment guide.

## License

MIT
