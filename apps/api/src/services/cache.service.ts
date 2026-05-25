import { redisService } from './redis.service';
import { logger } from '../lib/logger';

const DEFAULT_TTL = 300;

export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = redisService.getClient();
      if (!client) return null;
      const data = await client.get(`cache:${key}`);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error({ key, error }, 'Cache get error');
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = DEFAULT_TTL): Promise<void> {
    try {
      const client = redisService.getClient();
      if (!client) return;
      await client.set(`cache:${key}`, JSON.stringify(value), { EX: ttlSeconds });
    } catch (error) {
      logger.error({ key, error }, 'Cache set error');
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const client = redisService.getClient();
      if (!client) return;
      await client.del(`cache:${key}`);
    } catch {}
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const client = redisService.getClient();
      if (!client) return;
      const keys = await client.keys(`cache:${pattern}*`);
      if (keys.length > 0) await client.del(keys);
    } catch {}
  }

  async getOrSet<T>(key: string, fetch: () => Promise<T>, ttlSeconds = DEFAULT_TTL): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await fetch();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}

export const cacheService = new CacheService();
