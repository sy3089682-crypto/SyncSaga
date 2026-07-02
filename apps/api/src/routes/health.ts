import { Router, Request, Response } from 'express';
import { supabaseAdmin, supabase } from '../lib/supabase';
import { redisService } from '../services/redis.service';
import { logger } from '../lib/logger';

const router = Router();

/**
 * Health Check Routes
 *
 * /live  — Liveness probe: process is running (always 200 if process is up)
 * /ready — Readiness probe: all dependencies are reachable
 *
 * Used by:
 * - Render deployment health checks
 * - Kubernetes/load balancer probes
 * - External uptime monitoring (UptimeRobot, BetterStack)
 */

// Liveness — process is alive
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Readiness — all dependencies are reachable
router.get('/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; latency_ms?: number }> = {};

  // Check Supabase
  try {
    const start = Date.now();
    const { error } = await supabaseAdmin.from('profiles').select('id').limit(1);
    checks.supabase = {
      status: error ? 'degraded' : 'ok',
      latency_ms: Date.now() - start,
    };
  } catch {
    checks.supabase = { status: 'error' };
  }

  // Check Redis
  try {
    const start = Date.now();
    const client = redisService.getClient();
    const pong = await client.ping();
    checks.redis = {
      status: pong === 'PONG' ? 'ok' : 'degraded',
      latency_ms: Date.now() - start,
    };
  } catch {
    checks.redis = { status: 'error' };
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok');
  const statusCode = allOk ? 200 : 503;

  res.status(statusCode).json({
    status: allOk ? 'ready' : 'degraded',
    checks,
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Legacy health endpoint (backward compatibility)
router.get('/', async (_req: Request, res: Response) => {
  let dbPing = false;
  let redisPing = false;

  try {
    const { error } = await supabaseAdmin.from('rooms').select('id').limit(1);
    dbPing = !error;
  } catch { /* db not ready */ }

  try {
    const client = redisService.getClient();
    const pong = await client.ping();
    redisPing = pong === 'PONG';
  } catch { /* redis not ready */ }

  const healthy = dbPing && redisPing;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    uptime: process.uptime(),
    dbPing,
    redisPing,
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

export const healthRouter = router;
