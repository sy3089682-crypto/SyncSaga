# Engineering Audit Report: SyncSaga

**Date:** 2026-06-05  
**Auditor:** Automated CI Pipeline Analysis  
**Commit:** `13b4e1b`

---

## 1. Repository Overview

| Metric | Value |
|--------|-------|
| Stack | Next.js 15 + Express + Socket.IO + Supabase + Redis |
| Package Manager | npm 10.2.4 |
| Monorepo Tool | Turborepo |
| TypeScript | Strict mode enabled |
| Total Packages | 3 apps (web, api, extension), 4 packages (types, config, ai, ui) |
| Total TypeScript Files | ~200+ |
| Existing Tests | 8 API unit test files |
| Supabase Schema | 24 tables, 15 RLS policies, indexes, triggers |

---

## 2. CI/CD Pipeline Status

| Stage | Status | Notes |
|-------|--------|-------|
| Dependency Installation | ⚠️  Needs `npm install --legacy-peer-deps` | Legacy peer deps required |
| TypeScript Type Checking | 🔴 Failing | Pre-existing type errors in codebase |
| ESLint | 🟡 Warning-only | Configured but not enforcing |
| Build | 🔴 Failing | Extension build missing icon assets |
| Unit Tests | 🟢 Passing | 8 API test files pass |
| Coverage Reports | 🟢 Generated | Thresholds set to baseline |
| npm Audit | ⚠️  Vulnerabilities found | `qs` package vulnerability |
| Trivy Security Scan | 🟢 Running | SARIF output available |
| Playwright E2E | 🔴 Not running fully | No live server for tests |

---

## 3. Critical Bugs Found

### 🔴 Type Errors (Blocking CI)

1. **Missing Room type fields** — `current_episode`, `current_episode_number`, `anime_media_id`, `password_hash` are used in Redis state management but not in the `Room` interface.
   - **Files:** `packages/types/index.ts`, `apps/api/src/services/room.service.ts`
   - **Fix applied:** Added missing fields to Room type

2. **Nullable `max_users`** — `room.members.length >= room.max_users` causes TS18048 when `max_users` is undefined.
   - **File:** `apps/api/src/services/room.service.ts`
   - **Fix applied:** Added nullish coalescing fallback

### 🔴 Build Failures

3. **Extension build missing icon assets** — `apps/extension/` references `icons/icon16.svg` which doesn't exist in the repository.
   - **File:** `apps/extension/vite.config.ts`
   - **Impact:** Full `npm run build` fails

4. **Config package requires pre-build** — `@syncsaga/config` has `"main": "dist/index.js"` but `dist/` is gitignored and only exists after building.
   - **Impact:** TypeScript can't resolve the package without pre-building

---

## 4. Fixes Applied

| # | Fix | Files |
|---|-----|-------|
| 1 | Added comprehensive CI workflow (typecheck, build, test, coverage, security, lint) | `.github/workflows/ci.yml` |
| 2 | Created Playwright E2E workflow with sharding | `.github/workflows/playwright-e2e.yml` |
| 3 | Added API vitest configuration | `apps/api/vitest.config.ts` |
| 4 | Added root Playwright configuration | `playwright.config.ts` |
| 5 | Created 6 E2E test scenario files | `e2e/scenario-*.spec.ts` |
| 6 | Added socket sync and chat unit tests | `apps/api/src/__tests__/socket-sync.test.ts` |
| 7 | Added coverage configuration with reports to vitest workspace | `vitest.workspace.ts` |
| 8 | Added root ESLint flat config | `eslint.config.js` |
| 9 | Added `typecheck` and `test` tasks to Turborepo | `turbo.json` |
| 10 | Updated package.json with test/coverage/audit scripts | `package.json` |
| 11 | Added missing fields to Room type definition | `packages/types/index.ts` |
| 12 | Fixed nullable `max_users` in room service | `apps/api/src/services/room.service.ts` |

---

## 5. Code Quality Issues Found

### Dead Code / Unused
- **`apps/api/src/index.ts`** — Duplicate minimal server that overlaps with `server.ts`
- **`packages/ai/`** — Exports `AI_VERSION` constant only, no actual AI routes used
- **`packages/ui/`** — Exports `UI_VERSION` constant only, no actual UI components
- **Extension app** — `apps/extension/` may be incomplete (missing icon assets)

### Duplicate Code
- **Auth providers** — Google, GitHub, Discord OAuth handlers in `auth.routes.ts` share ~80% identical code
- **`requireAuth` helper** — Duplicated across `auth.routes.ts`, `room.routes.ts`, `security.ts`
- **Socket event handlers** — Multiple `socket.on('chat:...')` handlers in `chat.handler.ts` with overlapping logic

### Security Issues
- **CSRF protection** — Uses `randomBytes` for stateless token generation without HMAC signing
- **Password reset** — No rate limiting on `/api/auth/forgot-password`
- **2FA** — TOTP secret stored in plaintext in the database
- **No input validation on WebSocket events** — Many socket handlers don't validate inputs with zod
- **Profanity filter** — Basic word matching, easily bypassed

### Missing Error Handling
- **All socket handlers** — Try/catch with silent failure, users get no feedback
- **Health check** — Swallows supabase/redis errors silently
- **Room service** — No transaction rollback on partial failures

### Race Conditions
- **Redis state management** — No atomic operations for `checkRateLimit` (read-then-write race)
- **Host takeover** — No atomicity, two users could trigger takeover simultaneously
- **Chat rate limiting** — Non-atomic check-and-increment

### Scalability Bottlenecks
- **Redis `KEYS` command** — Used in `features.service.ts`, `jwt.ts` — blocks on large datasets
- **No pagination** — `getPublicRooms` has no pagination for large datasets
- **In-memory metrics** — `MetricsService` stores everything in memory, lost on restart

---

## 6. Missing Validation

| Area | Missing |
|------|---------|
| WebSocket join | No room capacity validation on socket level |
| Chat messages | No HTML sanitization for displayed content |
| File uploads | No file upload endpoints, but if added need validation |
| Rate limiting | No Redis fallback — if Redis is down, rate limiting is bypassed |
| Input validation | Many HTTP routes don't validate request bodies with zod |

---

## 7. Recommendations

### Immediate (Must Fix for Production)
1. ✅ TypeScript errors in Room type — **Fixed**
2. ⏳ Extension build missing icon assets — Add placeholder icons or exclude from build
3. ⏳ Replace Redis `KEYS` with `SCAN` in `features.service.ts` and `jwt.ts`
4. ⏳ Add proper pagination to `getPublicRooms`
5. ⏳ Add atomic rate limiting (Redis Lua script or `INCR` with expiry)

### Short-term (Next Sprint)
6. Refactor duplicate auth provider code into reusable handler
7. Extract `requireAuth` into shared middleware
8. Add zod validation to all socket events
9. Implement atomic host takeover with Lua script
10. Add proper HTML sanitization (DOMPurify) for chat messages

### Medium-term
11. Add database migration validation in CI
12. Add visual regression tests with Playwright screenshot comparison
13. Implement proper Prometheus metrics exporter
14. Add end-to-end integration tests with test Supabase instance
15. Set progressive coverage thresholds (start at 30%, ratchet to 80%)

---

## 8. Coverage Summary

| Package | Status | Notes |
|---------|--------|-------|
| `apps/api` | 🟢 Tests exist | 8 test files covering auth, cache, validation, features, metrics, moderation, room, socket |
| `apps/web` | 🔴 No component tests | Only test setup file exists |
| `packages/shared` | 🔴 No tests | Package doesn't exist yet |
| `packages/config` | 🔴 No tests | Config validation untested |
| `packages/ai` | 🔴 No tests | AI router untested |
| `packages/ui` | 🔴 No tests | UI components untested |

---

## 9. Overall Assessment

**Production Readiness: 5/10**

SyncSaga has a solid architectural foundation with proper separation of concerns (Turborepo monorepo, strict TypeScript, Supabase schema with RLS). However, the codebase exhibits several issues typical of rapid development:

- **TypeScript errors** in production code (partially fixed)
- **Missing test coverage** for all packages except API
- **No integration tests** that verify the full stack works
- **Duplicate code** across auth providers and middleware
- **Race conditions** in state management
- **No database migration validation** in CI

The newly added CI pipeline provides a foundation to catch regressions, but the identified issues need to be addressed before the application can be considered production-grade.

**Critical Path to Production:**
1. Fix TypeScript errors (in progress)
2. Add icon assets or fix extension build
3. Increase test coverage to >50%
4. Add integration tests with Supabase test helpers
5. Implement atomic state operations
6. Add proper pagination and input validation
