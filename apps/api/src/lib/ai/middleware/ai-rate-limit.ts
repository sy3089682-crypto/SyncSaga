import { Request, Response, NextFunction } from 'express';

const aiRequestCounts = new Map<string, { count: number; resetAt: number }>();

export function aiRateLimit(maxPerMinute = 20) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).userId || req.ip || 'anonymous';
    const now = Date.now();
    const entry = aiRequestCounts.get(userId);

    if (!entry || now > entry.resetAt) {
      aiRequestCounts.set(userId, { count: 1, resetAt: now + 60_000 });
      return next();
    }

    if (entry.count >= maxPerMinute) {
      return res.status(429).json({
        error: { code: 'AI_RATE_LIMITED', message: 'AI request limit reached. Try again in 60 seconds.' },
      });
    }

    entry.count++;
    next();
  };
}

export function aiAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }
  (req as any).token = authHeader.slice(7);
  next();
}
