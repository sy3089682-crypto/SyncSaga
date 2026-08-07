# Iteration 2 Research - SyncSaga

## Current State Post-Iteration 1

### What's Working (Verified)
- Episode Progress Tracking + Continue Watching fully implemented (DB, API, Hook, Component, Dashboard)
- Real-time watch progress sync via Socket.io (handler created and registered)
- All CI passing: typecheck, lint, unit tests (114/114 API), E2E tests (8/8 Playwright)
- Deployments live: Vercel + Render
- Vitest config fixed to exclude e2e tests
- Playwright tests passing on desktop chromium

### Critical Issues (from score-1.json)
1. **Supabase auth keys truncated** - Vercel/Render store literal truncated strings (`sb_publishable_voslo...Ma3-tD`) instead of real 160-char publishable keys → email/password login returns 401
2. **Render cold-starts** - Service spins down, health check takes 30s+
3. **No tests for watch progress** - No unit tests for new API endpoints, no E2E test for Continue Watching flow
4. **No real-time progress sync** - Socket.io event structure exists but not connected to frontend in rooms
5. **Mobile Playwright not running** - Browser not installed

## Iteration 2 Plan

### Primary: Implement Real-time Watch Progress Sync in Rooms (High Value Feature)
- Add frontend socket listener for `watch:progress_update` in room page
- Emit `watch:progress` from frontend when user seeks/plays/pauses in a room
- Update ContinueWatching component to show real-time updates from room members
- Add socket connection management to the room page

### Secondary: Add Comprehensive Tests for Watch Progress (Quality)
- API unit tests: GET/POST/PATCH/DELETE /api/watch-progress endpoints
- Hook tests: useWatchProgress save/fetch/update/delete
- Component tests: ContinueWatching rendering, progress bars, resume click
- E2E test: Login → Start room → Play video → Seek → Verify progress saved → Resume

### Tertiary: Fix Render Cold-starts (Performance)
- Configure Render service to not spin down (if possible on free tier)
- Or add health check ping to keep warm

Note: Supabase auth keys fix requires manual Supabase Dashboard access - documented in .loop/SUPABASE_KEYS_FIX.md
