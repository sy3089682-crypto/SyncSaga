# SyncSaga Production Audit Report

## Executive Summary

Full audit of ~120 source files across the SyncSaga monorepo. Issues ranked by severity: CRITICAL > HIGH > MEDIUM > LOW.

**Status (2026-07-29):** Critical production blockers resolved. Vercel build fixed (posthog-js). Auth unified on Supabase sessions. Room passwords hashed. Rate limiting atomic. Graceful shutdown implemented. CI fail-fast enabled.

---

## CRITICAL Issues

### C1. Dual Authentication Systems — Security Bypass — ✅ RESOLVED
**Status:** Frontend uses Supabase Auth exclusively (`useAuth`). All protected HTTP routes and socket middleware verify Supabase JWTs via `verifySupabaseToken`. Auth routes now return Supabase session tokens as primary. Custom JWT retained only for legacy refresh cookie path.

### C2. Room Password Stored in Plaintext — ✅ RESOLVED
**Status:** `room.service.ts` hashes with bcrypt (12 rounds) on create; verifies with `bcrypt.compare`. Migration `00004_hash_room_passwords.sql` present.

### C3. Rate Limiting Race Condition — ✅ RESOLVED
**Status:** `checkRateLimit()` uses atomic Redis `INCR` + expire on first increment.

### C4. Socket Token in Query Parameter — ✅ RESOLVED
**Status:** Query param support removed. Only `handshake.auth.token` accepted. Origin validation added.

### C5. No Input Validation on Socket Events — ⚠️ PARTIAL
**Status:** HTTP routes use Zod. Socket handlers still need full Zod coverage on all events.

### C6. Memory Leak — Module-Level Maps in sync.handler.ts — ⚠️ PARTIAL
**Status:** Disconnect cleanup improved; TTL eviction for recentEvents recommended for long-running hosts.

### C7. No Graceful Shutdown for Socket.IO — ✅ RESOLVED
**Status:** `index.ts` closes HTTP → Socket.IO → Redis → BullMQ with force-exit safety net.

### C8. Supabase Client Created Per Token Verification — ✅ RESOLVED
**Status:** Single reused `anonClient` + `supabaseAdmin`.

### C9. `supabase` vs `supabaseAdmin` Confusion — ✅ RESOLVED
**Status:** Both exported; `supabase` aliases admin for backward compat.

### C10. No API Versioning — ✅ RESOLVED
**Status:** Routes mounted under `/api/v1/...` with unversioned backward-compat aliases.

---

## HIGH Issues (summary)

| ID | Issue | Status |
|----|-------|--------|
| H1 | Reconnect recovery / event replay | ✅ Redis event log + getRoomEvents |
| H2 | Host migration | ⚠️ Manual takeover exists; auto-promote partial |
| H3 | Stale connection cleanup | ✅ getStaleSockets + heartbeat |
| H4 | Distributed locking for room state | ✅ WATCH/MULTI + updateRoomStateAtomic |
| H5 | Circuit breaker | ✅ circuit-breaker.ts + AI provider health |
| H6 | BullMQ | ✅ queue.service.ts |
| H7 | Sentry | ✅ API + web Sentry init |
| H8 | Request tracing | ✅ X-Request-Id middleware |
| H9 | CI soft-fail | ✅ Fail-fast; npm ci fallback to install |
| H10 | OpenAPI | ✅ docs router present |
| H11 | Room routes admin client | ⚠️ Still service-role for most ops |
| H12 | Transaction safety join | ✅ Distributed lock on join |
| H13 | Event idempotency | ✅ isDuplicateEvent Redis SET NX |

---

## Build / Deploy Fixes (2026-07-29)

1. **Vercel:** Added `posthog-js` to `apps/web/package.json` (was imported in analytics.ts but missing).
2. **CI:** Removed soft-fail on shared package builds; `npm ci || npm install` for lockfile drift.
3. **Auth:** Login/register return Supabase session tokens so middleware verification succeeds.
4. **Render:** healthCheckPath `/health/ready` already correct.

---

## Remaining recommended work (non-blocking)

- Full Zod schemas on every socket event
- Auto host promotion on host disconnect
- User-scoped Supabase clients for RLS-bound reads
- Regenerate package-lock.json after dependency changes (`npm install` in monorepo root)
- Pin critical dependency versions for reproducible builds
