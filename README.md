# SyncSaga

> Watch anime together, in sync.

SyncSaga is a realtime social watch-party platform for synchronized anime viewing, rooms, chat, voice, reactions, watch progress, and community features.

## Production

| Service | URL | Role |
| --- | --- | --- |
| Web | https://syncsaga.vercel.app | Next.js application |
| API | https://syncsaga.onrender.com | Express + Socket.IO |
| API health | https://syncsaga.onrender.com/health | Liveness check |

**Canonical web origin:** `https://syncsaga.vercel.app`

Preview and deployment-specific Vercel URLs are for testing only. Authentication redirects should use the canonical origin.

## Architecture

```text
                         GitHub
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
          Vercel                     Render
        Next.js web             Express + Socket.IO
              │                         │
              └──────────┬──────────────┘
                         ▼
                    Supabase
                 PostgreSQL + Auth
                         │
                    ┌────┴────┐
                    ▼         ▼
                  Redis    LiveKit
                 presence  voice/video
```

## Repository layout

```text
apps/
  web/          Next.js frontend and PWA
  api/          Express + Socket.IO backend
  extension/   Browser extension

packages/
  shared/       Shared types and contracts
  config/       Runtime/build configuration
  db/           Database schema and data access

.github/
  workflows/    CI and automation
  ISSUE_TEMPLATE/
  PULL_REQUEST_TEMPLATE.md

```

## Core capabilities

- Synchronized watch-party rooms with drift correction
- Supabase authentication with Google, Discord, and email/password
- Realtime room state and chat through Socket.IO
- Voice/video infrastructure through LiveKit
- Watch progress and Continue Watching
- Reactions, clips, achievements, friends, and community features
- Installable PWA
- Browser extension
- Anime discovery with external-provider fallbacks

## Development

### Requirements

- Node.js 20+ (Node 24 is used in production where configured)
- npm
- Git

### Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Do not commit `.env` files or production credentials.

### Validation

Before opening a pull request, run the checks relevant to your change:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

If a command is not available in a particular workspace, document that clearly in the pull request rather than bypassing the check.

## Authentication rules

SyncSaga uses Supabase as the source of truth for user authentication and sessions.

The intended flow is:

```text
Provider
  ↓
Supabase OAuth
  ↓
/auth/callback
  ↓
PKCE code exchange
  ↓
Supabase SSR cookies
  ↓
Next.js middleware refresh
  ↓
Client session hydration
```

Do not introduce a second browser authentication store or custom JWT session flow without an architecture decision and tests covering the complete lifecycle.

For production OAuth, use the canonical origin:

```text
https://syncsaga.vercel.app
```

## Deployment

- Pushes to the production branch are deployed through the configured Vercel and Render integrations.
- Supabase migrations must be reviewed before production application.
- Environment variables are managed by the deployment platforms, not committed to Git.
- Production changes should be verified through health checks and the relevant automated tests.

## Engineering principles

1. **One source of truth.** Avoid duplicate auth, room, or session state.
2. **Small changes.** Prefer focused commits over large mixed feature/fix merges.
3. **Tests before confidence.** A green build is not enough for auth, realtime, or database changes.
4. **Schema and code move together.** Database migrations must be explicit and reversible where practical.
5. **Production domains are stable.** Never make authentication depend on preview URLs.
6. **No secrets in Git.** Use platform-managed environment variables.
7. **Document decisions.** Architectural changes belong in a short ADR or design document.

## Project status

SyncSaga is under active development. The production infrastructure is deployed, while some product areas and external integrations continue to evolve.

For the current technical state, see [`AUDIT.md`](./AUDIT.md). Do not treat historical status tables or old commit messages as proof that a production feature is currently healthy.

## Contributing

Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before making changes. Security-sensitive issues should follow [`SECURITY.md`](./SECURITY.md).

## License

MIT
