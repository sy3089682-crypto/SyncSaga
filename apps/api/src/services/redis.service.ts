import { createClient, RedisClientType } from 'redis';
import { logger } from '../lib/logger';

class RedisService {
  private client: RedisClientType | null = null;
  private pubClient: RedisClientType | null = null;
  private subClient: RedisClientType | null = null;

  private createConnectedClient(): RedisClientType {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const isUpstash = url.startsWith('rediss://');
    return createClient({
      url,
      socket: {
        tls: isUpstash,
        reconnectStrategy: (retries) => Math.min(retries * 100, 5000),
      },
      pingInterval: 30000,
    });
  }

  async connect() {
    this.client = this.createConnectedClient();
    this.pubClient = this.createConnectedClient();
    this.subClient = this.createConnectedClient();

    await Promise.all([
      this.client.connect(),
      this.pubClient.connect(),
      this.subClient.connect(),
    ]);

    const errorHandler = (err: Error) => logger.error({ err }, 'Redis connection error');
    this.client.on('error', errorHandler);
    this.pubClient.on('error', errorHandler);
    this.subClient.on('error', errorHandler);

    logger.info('Redis connected');
  }

  getClient(): RedisClientType {
    if (!this.client) throw new Error('Redis not connected');
    return this.client;
  }

  getPubClient(): RedisClientType {
    if (!this.pubClient) throw new Error('Redis pub client not connected');
    return this.pubClient;
  }

  getSubClient(): RedisClientType {
    if (!this.subClient) throw new Error('Redis sub client not connected');
    return this.subClient;
  }

  // Room presence
  async addUserToRoom(roomId: string, userId: string, socketId: string) {
    await this.client?.hSet(`room:${roomId}:users`, userId, socketId);
    await this.client?.sAdd(`user:${userId}:rooms`, roomId);
  }

  async removeUserFromRoom(roomId: string, userId: string) {
    await this.client?.hDel(`room:${roomId}:users`, userId);
    await this.client?.sRem(`user:${userId}:rooms`, roomId);
  }

  async getRoomUsers(roomId: string): Promise<string[]> {
    const users = await this.client?.hKeys(`room:${roomId}:users`);
    return users || [];
  }

  async getUserSocketId(roomId: string, userId: string): Promise<string | undefined> {
    return await this.client?.hGet(`room:${roomId}:users`, userId) || undefined;
  }

  // Room state
  async setRoomState(roomId: string, state: any) {
    await this.client?.setEx(`room:${roomId}:state`, 3600, JSON.stringify(state));
  }

  async getRoomState(roomId: string): Promise<any | null> {
    const state = await this.client?.get(`room:${roomId}:state`);
    return state ? JSON.parse(state) : null;
  }

  // Presence
  async setUserOnline(userId: string, data: any) {
    await this.client?.hSet('presence:online', userId, JSON.stringify(data));
  }

  async setUserOffline(userId: string) {
    await this.client?.hDel('presence:online', userId);
  }

  async getOnlineUsers(): Promise<Record<string, any>> {
    const users = await this.client?.hGetAll('presence:online');
    if (!users) return {};
    return Object.fromEntries(
      Object.entries(users).map(([k, v]) => [k, JSON.parse(v)])
    );
  }

  // Rate limiting
  async checkRateLimitDetailed(key: string, maxRequests: number, windowSeconds: number): Promise<{ allowed: boolean; count: number; remaining: number; resetSeconds: number }> {
    if (!this.client) throw new Error('Redis not connected');

    const redisKey = key.startsWith('ratelimit:') ? key : `ratelimit:${key}`;
    const count = await this.client.incr(redisKey);
    if (count === 1) {
      await this.client.expire(redisKey, windowSeconds);
    }

    const ttl = await this.client.ttl(redisKey);
    const resetSeconds = Math.floor(Date.now() / 1000) + (ttl > 0 ? ttl : windowSeconds);
    return {
      allowed: count <= maxRequests,
      count,
      remaining: Math.max(0, maxRequests - count),
      resetSeconds,
    };
  }

  async checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<boolean> {
    return (await this.checkRateLimitDetailed(key, maxRequests, windowSeconds)).allowed;
  }

  async acquireHostTakeover(roomId: string, requesterId: string, currentHostId?: string | null): Promise<boolean> {
    if (!this.client) throw new Error('Redis not connected');

    const lockKey = `room:${roomId}:host_takeover_lock`;
    const lockValue = `${requesterId}:${Date.now()}`;
    const acquired = await this.client.set(lockKey, lockValue, { NX: true, PX: 5000 });
    if (!acquired) return false;

    try {
      const state = await this.getRoomState(roomId);
      if (!state) return false;

      const hostId = state.host_id || currentHostId;
      const roomUsers = await this.getRoomUsers(roomId);
      if (hostId && roomUsers.includes(hostId)) return false;

      await this.setRoomState(roomId, { ...state, host_id: requesterId, host_takeover_at: Date.now() });
      return true;
    } finally {
      const currentValue = await this.client.get(lockKey);
      if (currentValue === lockValue) await this.client.del(lockKey);
    }
  }
}

export const redisService = new RedisService();
