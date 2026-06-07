import { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { getEnv, isProduction } from '@syncsaga/config';
import { redisService } from '../services/redis.service';
import { logger } from '../lib/logger';
import { getAuthenticatedUser } from './auth';

const CSRF_COOKIE = 'XSRF-TOKEN';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
const CSRF_TTL_MS = 8 * 60 * 60 * 1000;

export function securityMiddleware(app: Application) {
  app.use(helmet({
    contentSecurityPolicy: isProduction() ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'wss:', 'https:'],
        fontSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'blob:'],
        frameSrc: ["'self'"],
      },
    } : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
}

function csrfSecret() {
  const env = getEnv();
  return env.CSRF_SECRET || env.JWT_SECRET;
}

function signCsrfPayload(payload: string) {
  return createHmac('sha256', csrfSecret()).update(payload).digest('base64url');
}

function createCsrfToken() {
  const issuedAt = Date.now();
  const nonce = randomBytes(32).toString('base64url');
  const payload = `${issuedAt}.${nonce}`;
  return `${payload}.${signCsrfPayload(payload)}`;
}

function verifyCsrfToken(token: string) {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [issuedAtRaw, nonce, signature] = parts;
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt) || !nonce || Date.now() - issuedAt > CSRF_TTL_MS) return false;

  const expected = Buffer.from(signCsrfPayload(`${issuedAtRaw}.${nonce}`), 'base64url');
  const actual = Buffer.from(signature, 'base64url');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function setCsrfCookie(res: Response, token: string = createCsrfToken()) {
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: isProduction(),
    sameSite: 'strict',
    maxAge: CSRF_TTL_MS,
  });
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.includes(req.method)) {
    const cookieToken = req.cookies?.[CSRF_COOKIE];
    setCsrfCookie(res, typeof cookieToken === 'string' && verifyCsrfToken(cookieToken) ? cookieToken : undefined);
    return next();
  }

  const headerToken = req.headers[CSRF_HEADER] as string;
  const cookieToken = req.cookies?.[CSRF_COOKIE];

  if (!headerToken || !cookieToken || headerToken !== cookieToken || !verifyCsrfToken(cookieToken)) {
    return res.status(403).json({
      error: { code: 'CSRF_INVALID', message: 'Invalid CSRF token' },
    });
  }

  next();
}

const RATE_LIMIT_TIERS: Record<string, { max: number; window: number; failClosed?: boolean }> = {
  '/api/auth/forgot-password': { max: 5, window: 60 * 60, failClosed: true },
  '/api/auth/reset-password': { max: 10, window: 60 * 60, failClosed: true },
  '/api/auth': { max: 20, window: 60, failClosed: true },
  '/api/rooms': { max: 60, window: 60 },
  '/api/payments': { max: 30, window: 60, failClosed: true },
  '/api/ai': { max: 30, window: 60, failClosed: true },
  '/api/embed': { max: 100, window: 60 },
  '/api/clips': { max: 30, window: 60 },
  '/api/reactions': { max: 60, window: 60 },
  '/api/activity': { max: 60, window: 60 },
};

const fallbackLimiter = new Map<string, { count: number; resetAt: number }>();

function fallbackCheck(key: string, max: number, windowSeconds: number) {
  const now = Date.now();
  const current = fallbackLimiter.get(key);
  if (!current || current.resetAt <= now) {
    fallbackLimiter.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: Math.max(0, max - 1), resetSeconds: Math.floor((now + windowSeconds * 1000) / 1000) };
  }
  current.count += 1;
  return { allowed: current.count <= max, remaining: Math.max(0, max - current.count), resetSeconds: Math.floor(current.resetAt / 1000) };
}

export function rateLimitMiddleware(defaultMax: number = 100, defaultWindow: number = 60) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['x-forwarded-for'] as string || req.ip || 'unknown';

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
    const routeKey = `${key}:${req.path}`;

    try {
      const result = await redisService.checkRateLimitDetailed(routeKey, max, window);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', String(result.resetSeconds));

      if (!result.allowed) {
        return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } });
      }
      next();
    } catch (err) {
      logger.warn({ err, path: req.path }, 'Redis rate limiter unavailable; using fallback limiter');
      const fallback = fallbackCheck(routeKey, tier?.failClosed ? Math.min(max, 5) : max, window);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', fallback.remaining);
      res.setHeader('X-RateLimit-Reset', String(fallback.resetSeconds));
      if (!fallback.allowed) {
        return res.status(429).json({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } });
      }
      next();
    }
  };
}

export function auditLog(action: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const userId = (req as Request & { userId?: string }).userId;
    if (userId) {
      logger.info({ action, userId, path: req.path, method: req.method }, 'Audit log');
    }
    next();
  };
}

export { getAuthenticatedUser as requireAuth };
