# Deployment Guide

This guide walks through deploying SyncSaga to Railway with Supabase (PostgreSQL + Auth) and LiveKit (Voice).

## Prerequisites

- [Railway](https://railway.app) account
- [Supabase](https://supabase.com) account (free tier works)
- [LiveKit Cloud](https://livekit.io) account (free tier: 50 concurrent connections)

---

## Step 1: Supabase Setup

1. Create a new Supabase project
2. Go to SQL Editor and run the schema from `packages/db/schema.sql`
3. Go to Project Settings → API to get:
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_SERVICE_KEY` (service_role key)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon public key)
4. Go to Authentication → Providers → Enable Google/Discord OAuth if needed
5. Set the Site URL to your frontend domain

### Row Level Security (RLS)
Enable RLS on all tables and apply policies:
```sql
-- Example: rooms table
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read public rooms" ON rooms FOR SELECT USING (is_public = true OR auth.uid() = host_id);
CREATE POLICY "Users can create rooms" ON rooms FOR INSERT WITH CHECK (auth.uid() = host_id);
```

## Step 2: LiveKit Setup

1. Create a LiveKit Cloud project
2. Go to Settings → Keys to get:
   - `LIVEKIT_API_KEY`
   - `LIVEKIT_API_SECRET`
3. Note your LiveKit WebSocket URL: `wss://your-project.livekit.cloud`
4. Configure the LiveKit server with appropriate room limits

## Step 3: Railway Deployment

### Add Services
1. Create a new Railway project
2. Add the following services:

| Service | Source | Plan |
|---------|--------|------|
| PostgreSQL | Railway plugin | Starter (free) |
| Redis | Railway plugin | Starter (free) |
| API | SyncSaga repo → `apps/api` | Starter (free) |
| Web | SyncSaga repo → `apps/web` | Starter (free) |

### Configure API Service
Set the following environment variables in Railway:
```
NODE_ENV=production
PORT=4000
REDIS_URL=<Railway Redis URL>
JWT_SECRET=<generate a secure random string>
JWT_REFRESH_SECRET=<generate a different secure random string>
SUPABASE_URL=<your Supabase URL>
SUPABASE_SERVICE_KEY=<your service role key>
NEXT_PUBLIC_SUPABASE_URL=<your Supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
LIVEKIT_API_KEY=<your LiveKit key>
LIVEKIT_API_SECRET=<your LiveKit secret>
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
CORS_ORIGIN=https://<your-web-service>.up.railway.app
```

### Configure Web (Next.js) Service
```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://<your-api-service>.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://<your-api-service>.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=<your Supabase URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

### Dockerfile (apps/api/Dockerfile)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY packages/shared ./packages/shared
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

### Dockerfile (apps/web/Dockerfile)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/shared ./packages/shared
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

### nixpacks.toml
The existing `nixpacks.toml` handles Railway's automatic deployment detection.

---

## Step 4: Custom Domain (Optional)

1. In Railway, go to your Web service → Settings → Domains
2. Add your custom domain (e.g., `syncsaga.app`)
3. Configure DNS with the provided CNAME record
4. Update Supabase authentication settings to include your new domain

---

## Step 5: Browser Extension

1. Update `apps/extension/src/content.ts`:
   - Change `ws://localhost:4000/ws` to `wss://<your-api>.railway.app/ws`
2. Rebuild: `cd apps/extension && npm run build`
3. Submit to Chrome Web Store & Firefox Add-ons

---

## Step 6: Discord Bot

1. Create a Discord Application at https://discord.com/developers/applications
2. Create a Bot and copy the token
3. Deploy `apps/bot` as a separate Railway service
4. Set environment variables:
   - `DISCORD_BOT_TOKEN`
   - `DISCORD_CLIENT_ID`
   - `SYNCSAGA_API_URL=https://<your-api>.railway.app`
   - `SYNCSAGA_API_TOKEN=<shared API token>`

---

## Scaling

### Horizontal Scaling (Socket.IO)
1. Enable the Redis adapter in `socket.io`:
```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
```

2. Configure sticky sessions in your load balancer (Railway handles this automatically)

### Database Indexes
Create indexes for performance:
```sql
CREATE INDEX idx_rooms_is_public ON rooms(is_public);
CREATE INDEX idx_messages_room_id_created ON messages(room_id, created_at DESC);
CREATE INDEX idx_friends_user_id ON friends(user_id);
CREATE INDEX idx_friends_friend_id ON friends(friend_id);
CREATE INDEX idx_room_members_room_id ON room_members(room_id);
```

### Caching
- Room list: Redis TTL 10s
- AniList responses: Redis TTL 1 hour
- User presence: Redis TTL 30s
- Use `ioredis` pipeline for batched reads

---

## Monitoring

### Health Check Endpoint
```
GET /health
Response: { "status": "ok", "uptime": 123, "dbPing": true, "redisPing": true, "version": "1.0.0" }
```

### Docker HEALTHCHECK
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1
```

### OpenTelemetry
1. Add OpenTelemetry SDK to the API service
2. Export traces to a Jaeger or Grafana Cloud instance
3. Track metrics: active rooms, connected users, messages/sec
