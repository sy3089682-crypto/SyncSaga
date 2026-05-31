import { Request, Response, NextFunction, Application } from 'express';
import helmet from 'helmet';
import { randomBytes } from 'crypto';
import { isProduction } from '@syncsaga/config';
import { redisService } from '../services/redis.service';
import { logger } from '../lib/logger';

const CSRF_COOKIE = 'XSRF-TOKEN';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

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
    const routeKey = `ratelimit:${key}:${req.path}`;

    try {
      const allowed = await redisService.checkRateLimit(routeKey, max, window);
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', allowed ? Math.max(0, max - 1) : 0);
      res.setHeader('X-RateLimit-Reset', String(Math.floor(Date.now() / 1000) + window));

      if (!allowed) {
        return res.status(429).json({
          error: { code: 'RATE_LIMITED', message: 'Too many requests' },
        });
      }
      next();
    } catch {
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

export function requireAuth(req: Request, res: Response): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return null;
  }

  return authHeader.slice(7);
}
