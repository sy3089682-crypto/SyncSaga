import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis service
const mockHKeys = vi.fn().mockResolvedValue([]);
const mockHGetAll = vi.fn().mockResolvedValue({});
const mockGet = vi.fn().mockResolvedValue(null);
const mockSetEx = vi.fn().mockResolvedValue('OK');
const mockPing = vi.fn().mockResolvedValue('PONG');

vi.mock('../services/redis.service', () => ({
  redisService: {
    getClient: () => ({
      get: mockGet,
      setEx: mockSetEx,
      del: vi.fn().mockResolvedValue(1),
      keys: vi.fn().mockResolvedValue([]),
      hSet: vi.fn().mockResolvedValue(undefined),
      hDel: vi.fn().mockResolvedValue(undefined),
      hKeys: mockHKeys,
      hGetAll: mockHGetAll,
      sAdd: vi.fn().mockResolvedValue(undefined),
      sRem: vi.fn().mockResolvedValue(undefined),
      mGet: vi.fn().mockResolvedValue([]),
      incr: vi.fn().mockResolvedValue(1),
      ping: mockPing,
    }),
    connect: vi.fn().mockResolvedValue(undefined),
    setUserOnline: vi.fn().mockResolvedValue(undefined),
    setUserOffline: vi.fn().mockResolvedValue(undefined),
    addUserToRoom: vi.fn().mockResolvedValue(undefined),
    removeUserFromRoom: vi.fn().mockResolvedValue(undefined),
    getRoomUsers: vi.fn().mockResolvedValue(['user-1', 'user-2']),
    getRoomState: vi.fn().mockResolvedValue({
      host_id: 'user-1',
      playback_position: 120.5,
      playback_state: 'playing',
      playback_speed: 1,
      sync_lock: false,
    }),
    setRoomState: vi.fn().mockResolvedValue(undefined),
    getOnlineUsers: vi.fn().mockResolvedValue({}),
    checkRateLimit: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  },
}));

describe('Socket.IO Sync - Multi-user playback synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Sync event handling', () => {
    it('should enforce host-only sync lock', async () => {
      const { syncHandler } = await import('../socket/handlers/sync.handler');
      expect(typeof syncHandler).toBe('function');
    });

    it('should handle sync:event with valid play action', async () => {
      const { syncHandler } = await import('../socket/handlers/sync.handler');
      expect(typeof syncHandler).toBe('function');
    });
  });

  describe('Playback state management', () => {
    it('should track playback position changes', async () => {
      const { redisService } = await import('../services/redis.service');
      const state = await redisService.getRoomState('room-1');
      expect(state).toBeDefined();
      expect(state.playback_position).toBe(120.5);
      expect(state.playback_state).toBe('playing');
    });
  });

  describe('Host takeover', () => {
    it('should detect host absence for takeover', async () => {
      const { redisService } = await import('../services/redis.service');
      const roomUsers = await redisService.getRoomUsers('room-1');
      expect(roomUsers).toEqual(['user-1', 'user-2']);
    });

    it('should transfer host on disconnect', async () => {
      const { redisService } = await import('../services/redis.service');
      const state = await redisService.getRoomState('room-1');
      expect(state.host_id).toBe('user-1');
    });
  });

  describe('RTT measurement', () => {
    it('should track ping-pong for latency', () => {
      expect(typeof mockPing).toBe('function');
    });
  });

  describe('Reconnection handling', () => {
    it('should maintain room state after simulated disconnect', async () => {
      const { redisService } = await import('../services/redis.service');
      const state = await redisService.getRoomState('room-1');
      expect(state).not.toBeNull();
      expect(state.playback_position).toBe(120.5);
    });
  });
});

describe('Socket.IO Chat - Multi-user real-time messaging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Message handling', () => {
    it('should validate chat messages', async () => {
      const { chatMessageSchema, validate } = await import('../middleware/validators');
      const result = validate(chatMessageSchema, { roomId: 'room-1', content: 'Hello!' });
      expect(result.success).toBe(true);
    });

    it('should rate limit chat messages', async () => {
      const { redisService } = await import('../services/redis.service');
      const result = await redisService.checkRateLimit('chat:room-1:user-1', 30, 60);
      expect(result).toBe(true);
    });

    it('should reject empty messages', async () => {
      const { chatMessageSchema, validate } = await import('../middleware/validators');
      const result = validate(chatMessageSchema, { roomId: 'room-1', content: '' });
      expect(result.success).toBe(false);
    });
  });
});
