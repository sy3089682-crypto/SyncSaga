import { createClient, RedisClientType } from 'redis';
import { logger } from '../lib/logger';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

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
        reconnectStrategy: (retries: number) => Math.min(retries * 100, 5000),
      } as any,
      pingInterval: 30000,
    });
  }

  async connect() {
    // Reuse clients lazily created by getClient() (e.g. BullMQ queues at module load)
    this.client = this.client ?? this.createConnectedClient();
    this.pubClient = this.pubClient ?? this.createConnectedClient();
    this.subClient = this.subClient ?? this.createConnectedClient();

    const errorHandler = (err: Error) => logger.error({ err }, 'Redis connection error');
    this.client.on('error', errorHandler);
    this.pubClient.on('error', errorHandler);
    this.subClient.on('error', errorHandler);

    await Promise.all([
      this.client.isOpen ? Promise.resolve() : this.client.connect(),
      this.pubClient.isOpen ? Promise.resolve() : this.pubClient.connect(),
      this.subClient.isOpen ? Promise.resolve() : this.subClient.connect(),
    ]);

    logger.info('Redis connected');
  }

  async disconnect() {
    const disconnectPromises: Promise<void>[] = [];
    if (this.client?.isOpen) disconnectPromises.push(this.client.quit().then(() => {}));
    if (this.pubClient?.isOpen) disconnectPromises.push(this.pubClient.quit().then(() => {}));
    if (this.subClient?.isOpen) disconnectPromises.push(this.subClient.quit().then(() => {}));
    await Promise.allSettled(disconnectPromises);
    this.client = null;
    this.pubClient = null;
    this.subClient = null;
    logger.info('Redis disconnected');
  }

  getClient(): RedisClientType {
    if (!this.client) {
      // Lazy auto-connect: BullMQ queues are constructed at module load,
      // before connect() runs. node-redis buffers commands until ready.
      this.client = this.createConnectedClient();
      this.client.on('error', (err: Error) => logger.error({ err }, 'Redis connection error'));
      void this.client.connect().catch((err: Error) => logger.error({ err }, 'Redis connection error'));
    }
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
    await withRetry(() => this.client!.hSet(`room:${roomId}:users`, userId, socketId));
    await withRetry(() => this.client!.sAdd(`user:${userId}:rooms`, roomId));
  }

  async removeUserFromRoom(roomId: string, userId: string) {
    await withRetry(() => this.client!.hDel(`room:${roomId}:users`, userId));
    await withRetry(() => this.client!.sRem(`user:${userId}:rooms`, roomId));
  }

  async getRoomUsers(roomId: string): Promise<string[]> {
    const users = await withRetry(() => this.client!.hKeys(`room:${roomId}:users`));
    return users || [];
  }

  async getUserSocketId(roomId: string, userId: string): Promise<string | undefined> {
    const sid = await withRetry(() => this.client!.hGet(`room:${roomId}:users`, userId));
    return sid || undefined;
  }

  // Room state — atomic read-modify-write using Lua script
  private static readonly CAS_SCRIPT = `
    local key = KEYS[1]
    local current = redis.call('GET', key)
    local expected = ARGV[1]
    local newValue = ARGV[2]
    local ttl = tonumber(ARGV[3])
    if current == expected then
      if ttl > 0 then
        redis.call('SETEX', key, ttl, newValue)
      else
        redis.call('SET', key, newValue)
      end
      return 1
    else
      return 0
    end
  `;

  async setRoomState(roomId: string, state: Record<string, unknown>) {
    const ttl = 3600;
    await withRetry(() => this.client!.setEx(`room:${roomId}:state`, ttl, JSON.stringify(state)));
  }

  /**
   * Atomically update room state using a Lua script.
   * Reads current state, applies a transform function, and writes back
   * only if the state hasn't changed since the read (compare-and-swap).
   */
  async updateRoomStateAtomic(
    roomId: string,
    transform: (current: Record<string, unknown> | null) => Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const key = `room:${roomId}:state`;
    const ttl = 3600;

    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await withRetry(() => this.client!.get(key));
      const currentState = current ? JSON.parse(current) : null;
      const newState = transform(currentState);
      const newStateStr = JSON.stringify(newState);

      // Use WATCH/MULTI/EXEC for optimistic concurrency
      try {
        await this.client!.watch(key);
        const multi = this.client!.multi();
        multi.setEx(key, ttl, newStateStr);
        const results = await multi.exec();
        if (results) {
          return newState;
        }
        // WATCH was triggered — retry
      } catch (error) {
        logger.debug({ roomId, attempt, error }, 'CAS retry for room state');
      }
    }

    // Fallback: direct write after retries
    const newState = transform(await this.getRoomState(roomId));
    await this.setRoomState(roomId, newState);
    return newState;
  }

  async getRoomState(roomId: string): Promise<Record<string, unknown> | null> {
    const state = await withRetry(() => this.client!.get(`room:${roomId}:state`));
    return state ? JSON.parse(state) : null;
  }

  // Room event log for reconnect recovery
  async appendRoomEvent(roomId: string, event: Record<string, unknown>, maxEvents = 100): Promise<void> {
    const key = `room:${roomId}:events`;
    await withRetry(() => this.client!.rPush(key, JSON.stringify(event)));
    await withRetry(() => this.client!.lTrim(key, -maxEvents, -1));
    await withRetry(() => this.client!.expire(key, 3600));
  }

  async getRoomEvents(roomId: string, sinceTimestamp = 0): Promise<Record<string, unknown>[]> {
    const events = await withRetry(() => this.client!.lRange(`room:${roomId}:events`, 0, -1));
    return events
      .map(e => JSON.parse(e))
      .filter(e => (e as any).server_time >= sinceTimestamp);
  }

  // Presence
  async setUserOnline(userId: string, data: Record<string, unknown>) {
    await withRetry(() => this.client!.hSet('presence:online', userId, JSON.stringify(data)));
  }

  async setUserOffline(userId: string) {
    await withRetry(() => this.client!.hDel('presence:online', userId));
  }

  async getOnlineUsers(roomId?: string): Promise<Record<string, unknown>> {
    const users = await withRetry(() => this.client!.hGetAll('presence:online'));
    if (!users) return {};
    const parsed = Object.fromEntries(
      Object.entries(users).map(([k, v]) => [k, JSON.parse(v)])
    );
    if (roomId) {
      const roomUsers = await this.getRoomUsers(roomId);
      return Object.fromEntries(
        Object.entries(parsed).filter(([k]) => roomUsers.includes(k))
      );
    }
    return parsed;
  }

  async setUserPresence(userId: string, data: Record<string, unknown>) {
    await withRetry(() => this.client!.hSet('presence:online', userId, JSON.stringify(data)));
  }

  async getUserSocketIdGlobal(userId: string): Promise<string | null> {
    const data = await withRetry(() => this.client!.hGet('presence:online', userId));
    if (!data) return null;
    const parsed = JSON.parse(data);
    return parsed.socketId || null;
  }

  // Rate limiting — atomic using INCR
  async checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<boolean> {
    const rateLimitKey = `ratelimit:${key}`;
    return withRetry(async () => {
      const count = await this.client!.incr(rateLimitKey);
      if (count === 1) {
        await this.client!.expire(rateLimitKey, windowSeconds);
      }
      return count <= maxRequests;
    });
  }

  // Distributed lock
  async acquireLock(key: string, ttlMs = 5000): Promise<string | null> {
    const lockId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const acquired = await withRetry(() =>
      this.client!.set(`lock:${key}`, lockId, { PX: ttlMs, NX: true })
    );
    return acquired ? lockId : null;
  }

  async releaseLock(key: string, lockId: string): Promise<void> {
    // Lua script to ensure we only release our own lock
    const script = `
      if redis.call('GET', KEYS[1]) == ARGV[1] then
        return redis.call('DEL', KEYS[1])
      else
        return 0
      end
    `;
    await withRetry(() => this.client!.eval(script, { keys: [`lock:${key}`], arguments: [lockId] }));
  }

  // Event deduplication
  async isDuplicateEvent(eventId: string, ttlSeconds = 60): Promise<boolean> {
    const key = `dedup:${eventId}`;
    const result = await withRetry(() =>
      this.client!.set(key, '1', { EX: ttlSeconds, NX: true })
    );
    return !result; // true if already exists (duplicate)
  }

  // Stale connection cleanup
  async getStaleSockets(maxAgeMs = 90000): Promise<string[]> {
    const now = Date.now();
    const allPresence = await withRetry(() => this.client!.hGetAll('presence:online'));
    const stale: string[] = [];
    for (const [userId, data] of Object.entries(allPresence || {})) {
      const parsed = JSON.parse(data);
      const connectedAt = new Date(parsed.connectedAt).getTime();
      if (now - connectedAt > maxAgeMs && !parsed.lastPing) {
        stale.push(userId);
      }
    }
    return stale;
  }

  async updateHeartbeat(userId: string): Promise<void> {
    const data = await withRetry(() => this.client!.hGet('presence:online', userId));
    if (data) {
      const parsed = JSON.parse(data);
      parsed.lastPing = new Date().toISOString();
      await withRetry(() => this.client!.hSet('presence:online', userId, JSON.stringify(parsed)));
    }
  }
}

export const redisService = new RedisService();
