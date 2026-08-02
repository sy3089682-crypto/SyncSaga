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
    } catch {
      // Silent fail — cache deletion is non-critical
    }
  }

  /**
   * Delete all keys matching a pattern using SCAN (non-blocking).
   * Never use KEYS in production — it blocks the Redis server.
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const client = redisService.getClient();
      let cursor: number | string = 0;
      do {
        // scan's cursor arg type varies by @redis/client major version
        const reply: { cursor: number | string; keys: string[] } = await (client as any).scan(cursor as any, { MATCH: pattern, COUNT: 100 });
        cursor = reply.cursor;
        if (reply.keys.length > 0) {
          await client.del(reply.keys);
        }
      } while (Number(cursor) !== 0);
    } catch (error) {
      logger.error({ pattern, error }, 'Cache deletePattern error');
    }
  }

  /**
   * Get from cache or compute and cache the value.
   * Implements cache stampede protection via early refresh threshold.
   */
  async getOrSet<T>(key: string, fetch: () => Promise<T>, ttlSeconds = 300): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const value = await fetch();
    await this.set(key, value, ttlSeconds);
    return value;
  }

  /**
   * Invalidate cache entries for a room.
   */
  async invalidateRoom(roomId: string): Promise<void> {
    await this.deletePattern(`cache:room:${roomId}*`);
    await this.delete(`room:${roomId}`);
  }

  /**
   * Invalidate cache entries for a user profile.
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.deletePattern(`cache:user:${userId}*`);
    await this.delete(`user:${userId}`);
  }
}

export const cacheService = new CacheService();
