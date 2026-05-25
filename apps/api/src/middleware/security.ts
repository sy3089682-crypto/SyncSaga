import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { isProduction } from '@syncsaga/config';
import { redisService } from '../services/redis.service';
import { logger } from '../lib/logger';

export function securityMiddleware(app: any) {
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

export function rateLimitMiddleware(maxRequests: number = 100, windowSeconds: number = 60) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['x-forwarded-for'] as string || req.ip || 'unknown';
    const routeKey = `ratelimit:${key}:${req.path}`;

    try {
      const allowed = await redisService.checkRateLimit(routeKey, maxRequests, windowSeconds);
      if (!allowed) {
        res.status(429).json({
          error: { code: 'RATE_LIMITED', message: 'Too many requests' },
        });
        return;
      }
      next();
    } catch {
      next();
    }
  };
}

export function auditLog(action: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const userId = (req as any).userId;
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
