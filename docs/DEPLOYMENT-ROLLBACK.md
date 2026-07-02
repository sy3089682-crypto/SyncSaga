# Deployment & Rollback Strategy

## Overview

SyncSaga uses a dual-deployment strategy:
- **Frontend** → Vercel (automatic deployments on push, instant rollback)
- **Backend** → Render (manual or auto-deploy, health-checked rollback)

## Frontend (Vercel)

### Deployment Flow
1. Push to `main` → automatic production deployment
2. PR created → automatic preview deployment
3. Preview deployments include isolated environment variables

### Rollback
1. Go to Vercel Dashboard → Deployments
2. Find the last known good deployment
3. Click "Instant Rollback" — takes effect immediately
4. Alternatively: `vercel --prod` to redeploy a specific commit

### Health Checks
- Vercel automatically checks deployment health
- Failed builds do not replace the current production deployment

## Backend (Render)

### Deployment Flow
1. Push to `main` → triggers Render auto-deploy (if enabled)
2. Render runs buildCommand, then startCommand
3. Health check polls `/health/ready` every 60 seconds
4. If health check fails 3 consecutive times, Render marks service as degraded

### Rollback
1. Go to Render Dashboard → syncsaga-api → Deploys
2. Click "Rollback to previous deploy" — redeploys the previous commit
3. If rollback fails, manually deploy a known good commit:
   ```bash
   git checkout <known-good-commit>
   git push origin main --force
   ```

### Rollback Criteria
Trigger rollback if any of the following occur after deployment:
- Health check fails for 3+ consecutive checks
- Error rate exceeds 5% for 5 minutes
- P99 latency exceeds 2000ms for 5 minutes
- Sentry receives 10+ new errors in 5 minutes

## Environment Validation

### Startup Validation
The API server validates all required environment variables on startup using Zod schema.
If any required variable is missing, the server exits immediately with a clear error message.

### Pre-deployment Validation
CI pipeline validates:
1. All environment variables are present in Render/Vercel config
2. TypeScript compilation succeeds
3. All tests pass
4. No security vulnerabilities (npm audit)

## Preview Environments

### Vercel Preview
- Every PR gets a preview deployment
- Preview URL: `https://syncsaga-git-<branch>-<hash>.vercel.app`
- Isolated environment variables for preview

### Render Preview
- Use Render's preview environment feature
- Connect a branch to create a preview instance
- Preview instances use development environment variables

## Monitoring

### Uptime Monitoring
- `/health/live` — process is running (liveness)
- `/health/ready` — dependencies are ready (readiness)
- Use external uptime monitor (UptimeRobot, BetterStack) to poll `/health/ready`

### Error Monitoring
- Sentry captures all unhandled errors
- Alert on: new error spikes, regression errors, performance degradation

### Performance Monitoring
- Sentry performance monitoring (traces)
- Custom metrics at `/metrics` endpoint
- Monitor: P50/P95/P99 latency, error rate, socket connections

## Incident Response

### Severity Levels
- **P0 (Critical)**: Service down, all users affected → rollback immediately
- **P1 (High)**: Major feature broken, many users affected → rollback within 15 min
- **P2 (Medium)**: Minor feature broken, few users affected → fix forward
- **P3 (Low)**: Cosmetic issue, no user impact → fix in next release

### Response Steps
1. Acknowledge the incident
2. Assess severity
3. If P0/P1: initiate rollback
4. Investigate root cause in Sentry/logs
5. Fix the issue in a new branch
6. Deploy fix and verify
7. Post incident report
