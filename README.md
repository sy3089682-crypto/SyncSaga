# SyncSaga

**Watch anime together. Anywhere.**

SyncSaga is a production-grade, full-stack anime watch party platform built with Next.js, Express, Socket.IO, LiveKit, and Supabase.

## Architecture

- **Frontend (Web):** Next.js 15 (App Router), React 19, Tailwind CSS, Radix UI, Zustand (State), React Query.
- **Backend (API):** Express, Socket.IO (Real-time events), Redis (Pub/Sub + Rate limiting).
- **Database / Auth:** Supabase (PostgreSQL 15, pgvector).
- **WebRTC:** LiveKit (Voice & Video chat).
- **AI Orchestration:** AI package routing Gemini/Groq/Cloudflare models.

## Structure (Monorepo)

- `apps/web`: Next.js web application.
- `apps/api`: Node.js/Express WebSocket server.
- `packages/ui`: Shared Radix+Tailwind component library.
- `packages/ai`: Shared AI provider orchestration layer.
- `packages/config`: Shared TS/ESLint configs.
- `supabase/`: Database schemas, migrations, and Edge Functions.
- `.github/workflows/`: GitHub Actions CI pipeline.

## Features Implemented (Phases 1-16)

1. **Monorepo Setup:** TurboRepo, pnpm (npm), strict TypeScript.
2. **Supabase Schema:** 24 tables for profiles, rooms, messages, friends, achievements, quests, etc.
3. **API Server:** Express, Socket.IO namespaces, Redis adapters.
4. **AI Layer:** Smart router for LLM providers.
5. **State Management:** Zustand stores (Auth, Room, Socket, LiveKit).
6. **UI System:** Cyberpunk/dark-themed Radix primitives.
7. **App Shell:** Responsive Navbar & Sidebar layouts.
8. **Auth Views:** Login/Register flows connected to Supabase Auth.
9. **Dashboard:** Home view with Active Rooms and AI recommendations.
10. **Watch Rooms:** Create and join unique watch party URLs.
11. **Video Player:** Custom generic HLS/MP4 player with playback sync.
12. **Chat & Reactions:** Real-time Socket.IO chat panel and floating emoji overlays.
13. **Voice/Video Chat:** LiveKit WebRTC integration.
14. **Profile & Watchlist:** User stats, XP, levels, and anime planning.
15. **Leaderboard:** Global ranking of active users by XP.
16. **CI/CD:** GitHub Actions test and build workflow.

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Setup Environment Variables:
   - Create `.env` in `apps/web` (Supabase, Next).
   - Create `.env` in `apps/api` (Redis, Supabase).

3. Start Development Servers:
   ```bash
   npm run dev
   ```
