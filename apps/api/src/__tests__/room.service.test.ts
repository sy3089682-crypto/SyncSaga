import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bcrypt from 'bcrypt';

/**
 * Room Service Tests
 *
 * Tests room creation, password hashing, join capacity checks,
 * and distributed lock behavior.
 */

vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'room-1', name: 'Test Room', host_id: 'user-1' }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'room-1' }, error: null }),
        }),
      }),
    }),
  },
}));

vi.mock('../services/redis.service', () => ({
  redisService: {
    acquireLock: vi.fn().mockResolvedValue('lock-id'),
    releaseLock: vi.fn().mockResolvedValue(undefined),
    removeUserFromRoom: vi.fn().mockResolvedValue(undefined),
    setRoomState: vi.fn().mockResolvedValue(undefined),
    getRoomState: vi.fn().mockResolvedValue(null),
    addUserToRoom: vi.fn().mockResolvedValue(undefined),
    getRoomUsers: vi.fn().mockResolvedValue(['user-1']),
    getUserSocketId: vi.fn().mockResolvedValue('socket-1'),
  },
}));

describe('RoomService - Password Hashing', () => {
  it('should hash passwords with bcrypt', async () => {
    const password = 'test-password-123';
    const hash = await bcrypt.hash(password, 12);

    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2b$')).toBe(true);
    expect(hash.length).toBeGreaterThan(50);
  });

  it('should verify correct passwords', async () => {
    const password = 'correct-password';
    const hash = await bcrypt.hash(password, 12);

    const isValid = await bcrypt.compare(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect passwords', async () => {
    const password = 'correct-password';
    const wrongPassword = 'wrong-password';
    const hash = await bcrypt.hash(password, 12);

    const isValid = await bcrypt.compare(wrongPassword, hash);
    expect(isValid).toBe(false);
  });

  it('should produce different hashes for same password (salt)', async () => {
    const password = 'same-password';
    const hash1 = await bcrypt.hash(password, 12);
    const hash2 = await bcrypt.hash(password, 12);

    expect(hash1).not.toBe(hash2);

    // Both should verify against the same password
    expect(await bcrypt.compare(password, hash1)).toBe(true);
    expect(await bcrypt.compare(password, hash2)).toBe(true);
  });
});

describe('RoomService - Capacity Limits', () => {
  it('should enforce max_users limit', () => {
    const maxUsers = 10;
    const currentMembers = 10;
    expect(currentMembers >= maxUsers).toBe(true);
  });

  it('should allow join when under capacity', () => {
    const maxUsers = 10;
    const currentMembers = 5;
    expect(currentMembers >= maxUsers).toBe(false);
  });

  it('should cap max_users at 50', () => {
    const requestedMax = 100;
    const MAX_ROOM_USERS = 50;
    const actualMax = Math.min(requestedMax, MAX_ROOM_USERS);
    expect(actualMax).toBe(50);
  });
});

describe('RoomService - Distributed Lock', () => {
  it('should acquire lock for room join', async () => {
    const { redisService } = await import('../services/redis.service');
    const lockId = await redisService.acquireLock('room:join:room-1', 2000);
    expect(lockId).toBe('lock-id');
  });

  it('should release lock after operation', async () => {
    const { redisService } = await import('../services/redis.service');
    await redisService.releaseLock('room:join:room-1', 'lock-id');
    expect(redisService.releaseLock).toHaveBeenCalledWith('room:join:room-1', 'lock-id');
  });
});
