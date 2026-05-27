# Deployment Guide

## Official Stack

| Service | Purpose | Plan |
|---------|---------|------|
| Vercel  | Next.js frontend | Free (Hobby) |
| Render  | Express+Socket.IO backend | Free |
| Supabase | Database + Auth | Free |
| Upstash | Redis (realtime state) | Free |
| LiveKit | Voice chat | Cloud Free |
| Cloudflare | DNS + CDN + Security | Free |
| Sentry | Error monitoring | Free |
| PostHog | Product analytics | Free |

## Frontend (Vercel)

### Setup
1. Push to GitHub
2. Import `apps/web` into Vercel
3. Set framework: Next.js
4. Add all `NEXT_PUBLIC_*` env vars

### Environment Variables
```
NEXT_PUBLIC_API_URL=https://your-render-api.onrender.com
NEXT_PUBLIC_SOCKET_URL=https://your-render-api.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_LIVEKIT_URL=wss://your-instance.livekit.cloud
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_POSTHOG_API_KEY=phc_...
NEXT_PUBLIC_SENTRY_DSN=https://...
```

## Backend (Render)

### Setup
1. Create a new Web Service on Render
2. Connect GitHub repo
3. Set:
   - Build Command: `npm ci --legacy-peer-deps && npm run build --workspace=packages/config && npm run build --workspace=packages/shared && npm run build --workspace=@syncsaga/api`
   - Start Command: `node apps/api/dist/index.js`

### Environment Variables
```
NODE_ENV=production
PORT=4000
REDIS_URL=rediss://default:token@your-region.upstash.io:6379
JWT_SECRET=...
JWT_REFRESH_SECRET=...
CORS_ORIGIN=https://your-vercel-app.vercel.app,https://syncsaga.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
NEXT_PUBLIC_LIVEKIT_URL=wss://...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SENTRY_DSN=https://...
AI_API_KEY=...
```

### WebSocket Support
Render free supports WebSockets natively. No special config needed.

## Upstash Redis

1. Create account at upstash.com
2. Create a Redis database (free tier: 256MB)
3. Use the `REDIS_URL` (rediss:// with TLS) in Render env

## Supabase

1. Create project at supabase.com
2. Run schema from `packages/db/schema.sql`
3. Enable Auth with Email + Google + GitHub + Discord
4. Copy URL and anon key

## Cloudflare

1. Add your domain to Cloudflare
2. Point DNS to Vercel (CNAME) and Render
3. Enable SSL/TLS: Full (strict)
4. Configure caching rules for static assets

## PWA Distribution

1. Build the PWA: `npm run build --workspace=@syncsaga/web`
2. Use PWABuilder to generate APK: https://pwabuilder.com
3. Submit to Google Play Store
