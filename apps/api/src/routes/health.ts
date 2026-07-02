import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { redisService } from '../services/redis.service';

const router = Router();

/**
 * GET /health
 *
 * Liveness probe — checks if the server process is running.
 * Used by Render for health checks.
 */
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /health/ready
 *
 * Readiness probe — checks if all dependencies are reachable.
 * Used by Render to determine if the service should receive traffic.
 */
router.get('/health/ready', async (_req, res) => {
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
    const pong = await redisService.ping();
    checks.redis = {
      status: pong ? 'ok' : 'degraded',
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
    timestamp: new Date().toISOString(),
  });
});

export const healthRouter = router;
