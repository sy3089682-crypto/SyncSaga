# Iteration 1 Research - SyncSaga

## Codebase Audit Summary

### Stack
- **Frontend**: Next.js 15 (App Router), React 18, Tailwind, Framer Motion, Zustand
- **Backend**: Express + Socket.io, BullMQ, Redis, Supabase (Postgres + Auth)
- **Real-time**: Socket.io for sync/chat/voice, LiveKit for voice
- **Database**: Supabase (PostgreSQL) with Drizzle ORM
- **Auth**: Supabase Auth (Email, Google, Discord OAuth)
- **Monitoring**: Sentry, PostHog, Prometheus metrics

### Existing Features (Implemented)
- ✅ Room creation/management (public/private)
- ✅ Frame-perfect sync with drift correction (Socket.io)
- ✅ Voice chat via LiveKit
- ✅ In-room text chat with GIF support
- ✅ Timestamp-anchored reactions
- ✅ Achievement system
- ✅ Polls/Queue/Clips in rooms
- ✅ AI recommendations (multi-provider: Groq, Gemini, Cloudflare)
- ✅ Content moderation (Llama Guard)
- ✅ Friend system
- ✅ Push notifications (Web Push)
- ✅ Dashboard with user rooms/activity
- ✅ Anime search/discover (Jikan fallback)
- ✅ PWA support
- ✅ Chrome extension (Manifest V3)

### Gaps / Missing High-Value Features
1. **Episode Progress Tracking** - No persistent watch progress per anime/episode per user. Core to "continue watching" UX.
2. **Room Invite Links** - No shareable invite links with embedded tokens for easy room joining.
3. **Cross-device Sync** - Watch progress not synced across devices (though Supabase could handle this).
4. **Watch History/Continue Watching** - Dashboard shows rooms but not "Continue Watching" anime list.
5. **Episode/Season Navigation** - No UI for selecting specific episodes/seasons in room.
6. **Offline Support** - PWA exists but no offline-first architecture for watch progress.

### Top 3 Opportunities (Impact × Effort)
1. **Episode Progress Tracking + Continue Watching** (High impact, Medium effort) - Core retention feature
2. **Room Invite Links with Deep Linking** (High impact, Low effort) - Viral growth mechanism
3. **Cross-device Watch Progress Sync** (Medium impact, Low effort) - Leverages existing Supabase

## Decision: Iteration 1 Focus
**Episode Progress Tracking + Continue Watching UI**

This is the highest-impact missing feature. Users need to:
- Track progress per anime/episode (persisted to Supabase)
- See "Continue Watching" on dashboard
- Resume from exact timestamp
- Have progress synced in real-time during watch parties

## Implementation Plan
1. **Database**: Add `watch_progress` table (user_id, anime_id, episode, season, timestamp, completed_at, updated_at)
2. **API**: CRUD endpoints for watch progress (+ real-time Socket.io events)
3. **Frontend**: 
   - Progress tracking hook (auto-save on timestamp change)
   - "Continue Watching" row on dashboard
   - Episode selector in room with progress indicators
   - Resume button on anime cards
4. **Real-time**: Socket.io event for progress updates during watch party
5. **Tests**: Unit + E2E for progress persistence and resume flow

## Technical Notes
- Use existing `@syncsaga/shared` types
- Follow existing API patterns (Zod validation, auth middleware)
- Use existing `redisService` for real-time pub/sub
- Follow existing UI patterns (framer-motion, Tailwind, lucide-react)
