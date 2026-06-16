import { redisService } from './redis.service';
import { logger } from '../lib/logger';

export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redisService.getClient().get(`cache:${key}`);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      logger.error({ key, error }, 'Cache get error');
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    try {
      await redisService.getClient().setEx(`cache:${key}`, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      logger.error({ key, error }, 'Cache set error');
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await redisService.getClient().del(`cache:${key}`);
    } catch {}
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await redisService.getClient().keys(pattern);
      if (keys.length > 0) {
        await redisService.getClient().del(keys);
      }
    } catch {}
  }

  async getOrSet<T>(key: string, fetch: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await fetch();
    await this.set(key, value, ttlSeconds);
    return value;
  }
}

export const cacheService = new CacheService();
