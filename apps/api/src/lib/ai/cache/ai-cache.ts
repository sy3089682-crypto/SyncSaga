import { redisService } from '../../../services/redis.service';
import { logger } from '../../logger';

const AI_CACHE_PREFIX = 'ai:cache:';
const DEFAULT_TTL = 300;
const RATE_LIMIT_PREFIX = 'ai:ratelimit:';

export class AiCache {
  async get(key: string): Promise<string | null> {
    try {
      const client = redisService.getClient();
      return await client.get(`${AI_CACHE_PREFIX}${key}`);
    } catch (error) {
      logger.debug({ error }, 'AI cache get failed');
      return null;
    }
  }

  async set(key: string, value: string, ttl = DEFAULT_TTL): Promise<void> {
    try {
      const client = redisService.getClient();
      await client.setEx(`${AI_CACHE_PREFIX}${key}`, ttl, value);
    } catch (error) {
      logger.debug({ error }, 'AI cache set failed');
    }
  }

  async getOrCompute(key: string, compute: () => Promise<string>, ttl = DEFAULT_TTL): Promise<string> {
    const cached = await this.get(key);
    if (cached) return cached;

    const value = await compute();
    await this.set(key, value, ttl);
    return value;
  }

  dedupKey(prefix: string, input: string): string {
    const hash = this.simpleHash(input);
    return `${prefix}:${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  async checkQuota(provider: string, maxPerMinute: number): Promise<boolean> {
    try {
      const client = redisService.getClient();
      const key = `${RATE_LIMIT_PREFIX}${provider}`;
      const count = await client.incr(key);
      if (count === 1) await client.expire(key, 60);
      return count <= maxPerMinute;
    } catch {
      return true;
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const client = redisService.getClient();
      const keys: string[] = [];
      for await (const key of client.scanIterator({ MATCH: `${AI_CACHE_PREFIX}${pattern}*`, COUNT: 100 })) {
        keys.push(String(key));
      }
      if (keys.length > 0) {
        await client.del(keys);
        logger.debug({ count: keys.length, pattern }, 'AI cache invalidated');
      }
    } catch (error) {
      logger.debug({ error }, 'AI cache invalidation failed');
    }
  }
}

export const aiCache = new AiCache();
