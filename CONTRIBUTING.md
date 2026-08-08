# Contributing to SyncSaga

Thanks for helping improve SyncSaga.

## Before you change code

1. Read the repository README and relevant architecture documentation.
2. Search existing issues and recent commits before creating a duplicate fix.
3. Keep the scope of a change focused.
4. For auth, database, realtime, deployment, or security changes, identify the affected production surfaces before editing.

## Branches

Use descriptive branches such as:

```text
feat/watch-progress
fix/oauth-callback
fix/pwa-session
chore/ci-hardening
refactor/auth-session
```

Do not commit directly to the production branch for risky changes. Open a pull request so the change can be reviewed and validated first.

## Commits

Prefer short, imperative Conventional Commit messages:

```text
feat: add room reactions
fix: preserve OAuth session during callback
refactor: consolidate Supabase session access
chore: update CI cache
```

Avoid mixing unrelated fixes, feature work, formatting changes, and dependency upgrades in one commit.

## Testing

Run the checks relevant to the change:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

Authentication changes should test at minimum:

- sign in
- callback
- refresh
- logout
- page reload
- protected-route access
- installed PWA launch when applicable

Database changes should include the migration and validation of the affected queries/RLS policies.

Realtime changes should verify connection, reconnect, authorization, and cleanup behavior.

## Pull requests

Every PR should explain:

- What changed
- Why it changed
- How it was tested
- Which production services are affected
- Any migration or environment-variable changes
- Any known limitations

Keep PRs reviewable. If a change is large, split it into independently testable pieces where practical.

## Architecture rule

Supabase is the authentication source of truth. Do not introduce a parallel browser auth/session system without documenting the design and adding lifecycle tests.

Likewise, do not silently change production domains, database contracts, Redis configuration, or deployment behavior as part of an unrelated feature.

## Security

Never commit secrets, service-role keys, access tokens, private credentials, or real user data. Report suspected security vulnerabilities privately using the process in `SECURITY.md`.
