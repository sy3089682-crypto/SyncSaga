/**
 * Rate Limiting Middleware for Express/Socket.IO
 * Implements sliding window rate limiting with Redis backend
 */

import { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';

interface RateLimitOptions {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
  keyPrefix?: string;    // Redis key prefix
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitInfo {
  total: number;
  remaining: number;
  resetTime: number;
}

export class RateLimiter {
  private redis: ReturnType<typeof createClient>;
  private options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions, redisClient: ReturnType<typeof createClient>) {
    this.options = {
      windowMs: 60000,
      maxRequests: 100,
      keyPrefix: 'ratelimit:',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...options
    };
    this.redis = redisClient;
  }

  /**
   * Get rate limit info for a key
   */
  async getInfo(key: string): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    const redisKey = `${this.options.keyPrefix}${key}`;

    // Remove old entries
    await this.redis.zRemRangeByScore(redisKey, '-inf', windowStart.toString());

    // Count current requests in window
    const currentCount = await this.redis.zCard(redisKey);
    const remaining = Math.max(0, this.options.maxRequests - currentCount);
    const resetTime = now + this.options.windowMs;

    return {
      total: this.options.maxRequests,
      remaining,
      resetTime
    };
  }

  /**
   * Check if request is allowed and record it
   */
  async isAllowed(key: string): Promise<{ allowed: boolean; info: RateLimitInfo }> {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    const redisKey = `${this.options.keyPrefix}${key}`;

    // Use Redis transaction for atomic operations
    const multi = this.redis.multi();
    
    // Remove old entries
    multi.zRemRangeByScore(redisKey, '-inf', windowStart.toString());
    
    // Count current requests
    multi.zCard(redisKey);
    
    const results = await multi.exec();
    
    if (!results) {
      return { allowed: true, info: { total: this.options.maxRequests, remaining: this.options.maxRequests, resetTime: now + this.options.windowMs } };
    }

    const currentCount = results[1][1] as number;

    if (currentCount >= this.options.maxRequests) {
      return {
        allowed: false,
        info: {
          total: this.options.maxRequests,
          remaining: 0,
          resetTime: now + this.options.windowMs
        }
      };
    }

    // Add new request
    await this.redis.zAdd(redisKey, { score: now, value: `${now}-${Math.random()}` });
    await this.redis.expire(redisKey, Math.ceil(this.options.windowMs / 1000));

    return {
      allowed: true,
      info: {
        total: this.options.maxRequests,
        remaining: this.options.maxRequests - currentCount - 1,
        resetTime: now + this.options.windowMs
      }
    };
  }

  /**
   * Express middleware factory
   */
  middleware(options?: { keyGenerator?: (req: Request) => string }) {
    const keyGenerator = options?.keyGenerator || this.defaultKeyGenerator;

    return async (req: Request, res: Response, next: NextFunction) => {
      const key = keyGenerator(req);
      
      try {
        const { allowed, info } = await this.isAllowed(key);

        // Set rate limit headers
        res.set('X-RateLimit-Limit', info.total.toString());
        res.set('X-RateLimit-Remaining', info.remaining.toString());
        res.set('X-RateLimit-Reset', info.resetTime.toString());

        if (!allowed) {
          res.set('Retry-After', Math.ceil(this.options.windowMs / 1000).toString());
          return res.status(429).json({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Try again in ${Math.ceil(this.options.windowMs / 1000)} seconds.`,
            retryAfter: Math.ceil(this.options.windowMs / 1000)
          });
        }

        next();
      } catch (error) {
        console.error('Rate limiter error:', error);
        // Fail open - allow request if rate limiter fails
        next();
      }
    };
  }

  /**
   * Socket.IO middleware factory
   */
  socketMiddleware(options?: { keyGenerator?: (socket: any) => string }) {
    const keyGenerator = options?.keyGenerator || ((socket) => {
      const ip = socket.handshake.address || socket.client.conn.remoteAddress;
      return `socket:${ip}`;
    });

    return async (socket: any, next: (err?: Error) => void) => {
      const key = keyGenerator(socket);
      
      try {
        const { allowed } = await this.isAllowed(key);

        if (!allowed) {
          return next(new Error('Rate limit exceeded'));
        }

        next();
      } catch (error) {
        console.error('Socket rate limiter error:', error);
        next(); // Fail open
      }
    };
  }

  /**
   * Default key generator using IP address
   */
  private defaultKeyGenerator(req: Request): string {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || '';
    const path = req.path.replace(/\/\d+/g, '/:id'); // Normalize paths with IDs
    
    return `api:${ip}:${path}`;
  }
}

/**
 * Create rate limiter instances with common configurations
 */
export function createRateLimiters(redisClient: ReturnType<typeof createClient>) {
  return {
    // General API rate limiting: 100 requests per minute
    api: new RateLimiter(
      { windowMs: 60000, maxRequests: 100, keyPrefix: 'ratelimit:api:' },
      redisClient
    ),
    
    // Auth endpoints: 5 requests per minute (stricter)
    auth: new RateLimiter(
      { windowMs: 60000, maxRequests: 5, keyPrefix: 'ratelimit:auth:' },
      redisClient
    ),
    
    // AI fingerprint matching: 20 requests per minute
    ai: new RateLimiter(
      { windowMs: 60000, maxRequests: 20, keyPrefix: 'ratelimit:ai:' },
      redisClient
    ),
    
    // Room actions: 30 requests per minute
    rooms: new RateLimiter(
      { windowMs: 60000, maxRequests: 30, keyPrefix: 'ratelimit:rooms:' },
      redisClient
    ),
    
    // Chat messages: 60 messages per minute
    chat: new RateLimiter(
      { windowMs: 60000, maxRequests: 60, keyPrefix: 'ratelimit:chat:' },
      redisClient
    ),
    
    // File uploads: 10 per hour
    upload: new RateLimiter(
      { windowMs: 3600000, maxRequests: 10, keyPrefix: 'ratelimit:upload:' },
      redisClient
    )
  };
}

export default RateLimiter;
