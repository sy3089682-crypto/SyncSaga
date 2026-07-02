import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { isProduction } from '@syncsaga/config';
import { redisService } from '../services/redis.service';
import { logger } from '../lib/logger';

const CSRF_COOKIE = 'XSRF-TOKEN';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * CSRF protection middleware.
 *
 * For safe methods (GET, HEAD, OPTIONS): generates a new CSRF token
 * and sets it as a cookie. The client must send this token in the
 * X-CSRF-Token header for unsafe methods.
 *
 * For unsafe methods (POST, PUT, DELETE, PATCH): validates that the
 * X-CSRF-Token header matches the cookie value.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.includes(req.method)) {
    const token = randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      secure: isProduction(),
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
    });
    return next();
  }

  const headerToken = req.headers[CSRF_HEADER] as string;
  const cookieToken = req.cookies?.[CSRF_COOKIE];

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({
      error: { code: 'CSRF_INVALID', message: 'Invalid CSRF token' },
    });
  }

  const newToken = randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE, newToken, {
    httpOnly: false,
    secure: isProduction(),
    sameSite: 'strict',
    maxAge: 8 * 60 * 60 * 1000,
  });

  next();
}

const RATE_LIMIT_TIERS: Record<string, { max: number; window: number }> = {
  '/api/auth': { max: 20, window: 60 },
  '/api/rooms': { max: 60, window: 60 },
  '/api/payments': { max: 30, window: 60 },
  '/api/ai': { max: 30, window: 60 },
  '/api/embed': { max: 100, window: 60 },
  '/api/clips': { max: 30, window: 60 },
  '/api/reactions': { max: 60, window: 60 },
  '/api/activity': { max: 60, window: 60 },
};

/**
 * Rate limiting middleware using Redis atomic INCR.
 *
 * Falls back to allowing the request if Redis is unavailable
 * (fail-open for availability, with logged warning).
 */
export function rateLimitMiddleware(defaultMax: number = 100, defaultWindow: number = 60) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';

    let tier = RATE_LIMIT_TIERS[req.path];
    if (!tier) {
      for (const [prefix, config] of Object.entries(RATE_LIMIT_TIERS)) {
        if (req.path.startsWith(prefix)) {
          tier = config;
          break;
        }
      }
    }

    const max = tier?.max ?? defaultMax;
    const window = tier?.window ?? defaultWindow;
    const routeKey = `${ip}:${req.path}`;

    try {
      const allowed = await redisService.checkRateLimit(routeKey, max, window);
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', allowed ? String(Math.max(0, max - 1)) : '0');
      res.setHeader('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + window));

      if (!allowed) {
        return res.status(429).json({
          error: { code: 'RATE_LIMITED', message: 'Too many requests' },
        });
      }
      next();
    } catch (error) {
      logger.warn({ err: error, ip, path: req.path }, 'Rate limit check failed — failing open');
      next();
    }
  };
}

/**
 * Audit log middleware — logs security-relevant actions.
 */
export function auditLog(action: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const userId = (req as Request & { userId?: string }).userId;
    if (userId) {
      logger.info({ action, userId, path: req.path, method: req.method, requestId: req.headers['x-request-id'] }, 'Audit log');
    }
    next();
  };
}
