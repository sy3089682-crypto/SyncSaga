# SyncSaga Production Audit Report

## Executive Summary

Full audit of ~120 source files across the SyncSaga monorepo. Issues ranked by severity: CRITICAL > HIGH > MEDIUM > LOW.

---

## CRITICAL Issues

### C1. Dual Authentication Systems — Security Bypass
**Files:** `apps/api/src/lib/jwt.ts`, `apps/api/src/lib/supabase.ts`, `apps/api/src/middleware/auth.ts`, `apps/api/src/routes/auth.routes.ts`, `apps/api/src/routes/clips.ts`, `apps/api/src/routes/ai.ts`

Two parallel auth systems exist:
1. **Supabase JWT** (used by socket middleware, HTTP auth middleware) — calls `supabase.auth.getUser()` per request
2. **Custom JWT** (used by auth routes, clips, AI routes) — uses `jsonwebtoken` with local secret

Routes using custom JWT (`clips.ts`, `ai.ts`, `auth.routes.ts`) bypass Supabase session validation entirely. A user with a custom JWT can access resources even if their Supabase session is revoked.

**Fix:** Unify on Supabase Auth. Remove custom JWT system. All routes use `authMiddleware` which verifies Supabase tokens.

### C2. Room Password Stored in Plaintext
**Files:** `apps/api/src/services/room.service.ts`, `supabase/migrations/00001_initial_schema.sql`

Room passwords are compared with `password !== room.password` — plaintext comparison. No hashing.

**Fix:** Hash room passwords with bcrypt before storage. Use `bcrypt.compare()` for verification.

### C3. Rate Limiting Race Condition
**File:** `apps/api/src/services/redis.service.ts`

`checkRateLimit()` does GET then INCR — not atomic. Under concurrent load, multiple requests can read the same count before any increments, bypassing the limit.

**Fix:** Use Redis `INCR` atomically, then check count. Set expiry only on first increment.

### C4. Socket Token in Query Parameter — Security Risk
**File:** `apps/api/src/socket/middleware/auth.ts`

Token accepted via `socket.handshake.query.token` — this appears in server logs, proxy logs, and browser history.

**Fix:** Remove query parameter token support. Only accept tokens via `handshake.auth.token`.

### C5. No Input Validation on Socket Events
**File:** `apps/api/src/socket/handlers/sync.handler.ts`, `apps/api/src/socket/handlers/room.handler.ts`

Most socket events lack validation. `sync:event` handler accepts arbitrary `SyncEvent` without schema validation. `room:join` doesn't validate `roomId` format. `anime:set_episode` doesn't validate inputs.

**Fix:** Add Zod validation to all socket event handlers.

### C6. Memory Leak — Module-Level Maps in sync.handler.ts
**File:** `apps/api/src/socket/handlers/sync.handler.ts`

`rttMap`, `logicalClocks`, `heartbeatIntervals`, `recentEvents` are module-level `Map`s. On disconnect, only `rttMap` and `logicalClocks` are cleaned for the current socket. `recentEvents` grows unbounded (cleanup is crude — deletes oldest 500 when >1000, but entries are never expired by time). `heartbeatIntervals` keyed by `socket.id` but `stopHostHeartbeat` on disconnect uses `socket.id` which may not match if heartbeat was started with a different socket.

**Fix:** Move per-socket state to a class. Clean up all maps on disconnect. Use TTL-based eviction for `recentEvents`.

### C7. No Graceful Shutdown for Socket.IO
**File:** `apps/api/src/index.ts`

Shutdown handler closes HTTP server but doesn't close Socket.IO connections or Redis connections. Connected clients get abrupt disconnect.

**Fix:** Close Socket.IO server, disconnect Redis, then close HTTP server.

### C8. Supabase Client Created Per Token Verification
**File:** `apps/api/src/lib/supabase.ts`

`verifySupabaseToken()` creates a new `createClient()` on every call — massive overhead for every authenticated request.

**Fix:** Use the admin client's `auth.getUser()` with the token passed as a header, or cache the client.

### C9. `supabase` vs `supabaseAdmin` Confusion
**File:** `apps/api/src/lib/supabase.ts`

The file exports `supabaseAdmin` but many files import `supabase` from this file. There's no `supabase` export — these imports resolve to `undefined` or cause runtime errors.

**Fix:** Export a single `supabase` (admin client) with clear naming. Update all imports.

### C10. No API Versioning
**Files:** `apps/api/src/server.ts`, all route files

All routes are mounted at `/api/...` with no version prefix. Breaking changes cannot be deployed incrementally.

**Fix:** Mount routes under `/api/v1/...`.

---

## HIGH Issues

### H1. No Reconnect Recovery / Late Join State Replay
**Files:** `apps/api/src/socket/handlers/sync.handler.ts`, `apps/web/src/hooks/useSyncEngine.ts`

When a client reconnects or joins late, `sync:request` only returns current state from Redis — no event replay. Missing the event log between last seen state and current state.

**Fix:** Store recent sync events in a Redis list per room. On `sync:request`, replay missed events.

### H2. No Host Migration Logic for Heartbeat
**File:** `apps/api/src/socket/handlers/sync.handler.ts`

`startHostHeartbeat` is called on takeover but not on initial room creation/join. If the original host disconnects, no automatic host migration occurs — it requires a manual `sync:takeover` from another client.

**Fix:** Implement automatic host detection on disconnect. When host disconnects, automatically promote the next member.

### H3. No Stale Connection Cleanup
**File:** `apps/api/src/socket/index.ts`

No periodic cleanup of stale socket connections. If a client disconnects ungracefully (browser crash, network loss), Redis presence data remains stale.

**Fix:** Implement periodic heartbeat check. Clean up Redis presence for sockets that haven't pinged recently.

### H4. No Distributed Locking for Room State Updates
**File:** `apps/api/src/socket/handlers/sync.handler.ts`

`getRoomState` → modify → `setRoomState` is not atomic. Concurrent sync events from different sockets can cause lost updates (read-modify-write race).

**Fix:** Use Redis `WATCH`/`MULTI` or Lua scripts for atomic read-modify-write.

### H5. No Circuit Breaker for External Services
**Files:** `apps/api/src/lib/ai/router/ai-router.ts`, `apps/api/src/services/room.service.ts`

AI router has provider health tracking but no circuit breaker pattern. Supabase calls have no retry or circuit breaker.

**Fix:** Implement circuit breaker pattern for AI providers and database calls.

### H6. No BullMQ Queue System
**Files:** entire backend

No background job processing. Notifications, audit logs, activity feed inserts are all synchronous.

**Fix:** Add BullMQ for background jobs (notifications, audit logs, AI processing).

### H7. No Sentry Integration
**Files:** entire codebase

`SENTRY_DSN` is in env config but never used. No Sentry SDK initialization.

**Fix:** Initialize Sentry in both API and web apps.

### H8. No Request Tracing / Distributed Tracing
**Files:** entire backend

No request IDs, no trace propagation. Cannot correlate errors across services.

**Fix:** Add request ID middleware. Propagate trace IDs to logs and responses.

### H9. CI Pipeline Allows Failures
**File:** `.github/workflows/ci.yml`

Every step uses `|| echo "..."` or `|| true` — lint, typecheck, test, and build failures are silently ignored.

**Fix:** Remove `|| true` / `|| echo` from CI steps. Fail fast on any issue.

### H10. No OpenAPI/Swagger Documentation
**Files:** entire API

No API documentation generation. No OpenAPI spec.

**Fix:** Add swagger-jsdoc or similar. Generate OpenAPI spec from route definitions.

### H11. Room Routes Use `supabaseAdmin` Directly
**File:** `apps/api/src/routes/room.routes.ts`

Room routes use `supabaseAdmin` (service role, bypasses RLS) for all operations including user-facing reads. This means RLS policies are bypassed.

**Fix:** Use user-scoped Supabase client for user-facing operations. Admin client only for admin operations.

### H12. No Transaction Safety for Room Join
**File:** `apps/api/src/services/room.service.ts`

`joinRoom()` checks member count, then inserts — not atomic. Concurrent joins can exceed `max_users`.

**Fix:** Use a database transaction or atomic upsert with count check.

### H13. No Idempotency for Socket Events
**File:** `apps/api/src/socket/handlers/sync.handler.ts`

`isDuplicate()` uses a 500ms window with event type + timestamp. This is insufficient — legitimate rapid events can be dropped, and replayed events after reconnect are not properly deduplicated.

**Fix:** Use event IDs with a Redis-based deduplication set with TTL.

---

## MEDIUM Issues

### M1. No Cache Invalidation Strategy
**File:** `apps/api/src/services/cache.service.ts`

`deletePattern()` uses `KEYS` command — blocks Redis in production. No cache invalidation on data updates.

**Fix:** Use `SCAN` instead of `KEYS`. Implement cache invalidation on room/profile updates.

### M2. No Environment Variable for `SUPABASE_ANON_KEY` in API
**File:** `packages/config/src/env.ts`

`SUPABASE_ANON_KEY` is not in the env schema. `verifySupabaseToken()` uses `env.SUPABASE_ANON_KEY` which doesn't exist.

**Fix:** Add `SUPABASE_ANON_KEY` to env schema.

### M3. Frontend Socket `getSocket()` Signature Mismatch
**File:** `apps/web/src/lib/socket.ts` vs `apps/web/src/hooks/useSocket.ts`

`socket.ts` exports `getSocket(): Promise<Socket>` (async, no token arg). `useSocket.ts` calls `getSocket(token)` (sync, with token arg). Type mismatch.

**Fix:** Unify the socket API. Single `getSocket()` that internally fetches token.

### M4. No Health Check Differentiation
**File:** `apps/api/src/server.ts`

`/health` endpoint doesn't distinguish between liveness and readiness. Both should be separate endpoints.

**Fix:** Add `/health/live` (liveness) and `/health/ready` (readiness) endpoints.

### M5. No Request Size Validation for Socket Events
**File:** `apps/api/src/server.ts`

`maxHttpBufferSize: 1e6` is set but no per-event validation. Large payloads can cause memory issues.

**Fix:** Validate event payload sizes in socket handlers.

### M6. No CSRF Protection for Socket Connections
**File:** `apps/api/src/server.ts`

CSRF protection is on HTTP routes but not on WebSocket connections.

**Fix:** Validate origin for socket connections.

### M7. No Audit Log for Security-Critical Socket Events
**Files:** socket handlers

`sync:takeover`, `room:kick`, `room:ban` are not audit logged.

**Fix:** Add audit logging for all security-critical socket events.

### M8. No Dependency Pinning
**File:** `package.json` files

Dependencies use `^` ranges — can introduce breaking changes.

**Fix:** Pin exact versions or use `~` for patch-only updates.

### M9. No E2E Tests
**Files:** entire repo

No Playwright tests despite `test:e2e` script existing.

**Fix:** Add E2E tests for critical user flows.

### M10. No Load Testing Strategy
**Files:** entire repo

No load testing configuration.

**Fix:** Add k6 or Artillery load testing configuration.

### M11. `useSyncEngine` Doesn't Actually Sync Playback
**File:** `apps/web/src/hooks/useSyncEngine.ts`

The hook calculates drift and emits events but never actually adjusts the video player. `clientTimeRef` is never updated from actual playback.

**Fix:** Connect the sync engine to the actual video element.

### M12. No Error Boundaries for Socket Events on Frontend
**File:** `apps/web/src/hooks/useSocket.ts`

Socket event handlers have no error boundaries. A malformed event can crash the app.

**Fix:** Add try/catch to all socket event handlers.

### M13. `requireRoomRole` Uses `require()` — CommonJS in ESM
**File:** `apps/api/src/middleware/auth.ts`

`require('../lib/supabase')` is CommonJS `require()` inside an ESM module.

**Fix:** Use proper ES import.

### M14. No Connection Pooling for Supabase
**File:** `apps/api/src/lib/supabase.ts`

Each `verifySupabaseToken()` creates a new client. No connection reuse.

**Fix:** Use a single client instance with token-scoped auth.

### M15. No Retry Strategy for Redis Operations
**File:** `apps/api/src/services/redis.service.ts`

Redis operations have no retry. A transient Redis failure causes request failure.

**Fix:** Add retry with exponential backoff for Redis operations.

---

## LOW Issues

### L1. Dead Code — `securityMiddleware` Function Never Called
**File:** `apps/api/src/middleware/security.ts`

`securityMiddleware()` is exported but never imported or used. Helmet is already configured in `server.ts`.

### L2. `wsBridge` Is a No-Op
**File:** `apps/api/src/services/wsBridge.ts`

`handleExtensionMessage()` just logs. `broadcastToRoom()` is a thin wrapper. No actual extension bridge logic.

### L3. Duplicated `requireAuth` Functions
**Files:** `apps/api/src/routes/auth.routes.ts`, `apps/api/src/routes/ai.ts`, `apps/api/src/routes/clips.ts`, `apps/api/src/middleware/security.ts`

Four different `requireAuth`/`getUser` functions with different behavior.

### L4. No `SUPABASE_ANON_KEY` Export
**File:** `packages/config/src/env.ts`

Missing from schema — `verifySupabaseToken()` references `env.SUPABASE_ANON_KEY` which is undefined.

### L5. `getOnlineUsers()` Ignores `roomId` Parameter
**File:** `apps/api/src/services/redis.service.ts`

`getOnlineUsers()` signature takes no args but `presence.handler.ts` passes `data.roomId`.

### L6. No Cookie Security for Refresh Token
**File:** `apps/api/src/routes/auth.routes.ts`

Refresh token cookie settings need review — `sameSite` should be `strict` in production.

### L7. No Request ID Correlation
**File:** `apps/api/src/server.ts`

No request ID generation or propagation.

### L8. `prom-client` Installed But Not Used
**File:** `apps/api/package.json`

`prom-client` is a dependency but metrics are custom in-memory. Not Prometheus-compatible.

### L9. No Preview Environment Configuration
**Files:** deployment configs

No Vercel preview or Render preview environment configuration.

### L10. No Rollback Strategy
**Files:** deployment configs

No deployment rollback configuration or documentation.
