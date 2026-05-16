import { createClient, RedisClientType } from 'redis';
import { logger } from '../lib/logger';

class RedisService {
  private client: RedisClientType | null = null;
  private pubClient: RedisClientType | null = null;
  private subClient: RedisClientType | null = null;

  async connect() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.client = createClient({ url });
    this.pubClient = createClient({ url });
    this.subClient = createClient({ url });

    await this.client.connect();
    await this.pubClient.connect();
    await this.subClient.connect();

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
  async checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<boolean> {
    const current = await this.client?.get(`ratelimit:${key}`);
    if (!current) {
      await this.client?.setEx(`ratelimit:${key}`, windowSeconds, '1');
      return true;
    }
    const count = parseInt(current);
    if (count >= maxRequests) return false;
    await this.client?.incr(`ratelimit:${key}`);
    return true;
  }
}

export const redisService = new RedisService();
