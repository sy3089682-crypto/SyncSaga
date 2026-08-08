# Security Policy

## Supported versions

SyncSaga is under active development. Security fixes are applied to the current production branch first.

## Reporting a vulnerability

Please do not open a public GitHub issue for a suspected security vulnerability.

Report it privately through the repository owner's GitHub security contact or GitHub's private vulnerability reporting when enabled for the repository.

Include:

- A clear description of the vulnerability
- Affected component or endpoint
- Reproduction steps or a minimal proof of concept
- Potential impact
- Any suggested mitigation

Do not include real credentials, access tokens, private keys, or personal user data in the report.

## Security priorities

SyncSaga treats the following as security-sensitive:

- Authentication and OAuth callbacks
- Supabase RLS policies
- Service-role credentials
- API authorization and room membership
- Socket.IO authorization
- CORS and trusted origins
- File/media upload handling
- Webhooks and payment-related endpoints
- PWA/service-worker handling of authenticated routes

## Secret handling

Secrets must be stored in Vercel, Render, Supabase, GitHub Actions secrets, or another appropriate secret manager. Never commit them to the repository.

If a secret is accidentally committed, revoke/rotate it immediately. Removing it from Git history is not a substitute for rotation.
