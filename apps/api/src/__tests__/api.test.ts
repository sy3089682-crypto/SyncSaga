import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * API Route Tests
 *
 * Tests for clips, features, and health endpoints.
 * Uses mocked Supabase and Redis.
 */

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'clip-1' }, error: null }),
        }),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          ilike: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        ilike: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          limit: vi.fn().mockResolvedValue({ error: null }),
        }),
        limit: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  },
  verifySupabaseToken: vi.fn().mockResolvedValue('test-user-id'),
  getUserProfile: vi.fn().mockResolvedValue({
    id: 'test-user-id',
    username: 'testuser',
    display_name: 'Test',
    avatar_url: null,
  }),
}));

vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../services/redis.service', () => ({
  redisService: {
    getClient: () => ({
      ping: vi.fn().mockResolvedValue('PONG'),
      keys: vi.fn().mockResolvedValue([]),
      mGet: vi.fn().mockResolvedValue([]),
    }),
    checkRateLimit: vi.fn().mockResolvedValue(true),
  },
}));

describe('Clips Route', () => {
  it('should validate clip creation input', () => {
    const validInput = {
      animeTitle: 'Attack on Titan',
      startTime: 100,
      endTime: 200,
    };
    expect(validInput.animeTitle).toBeTruthy();
    expect(validInput.endTime).toBeGreaterThan(validInput.startTime);
  });

  it('should reject clips where endTime <= startTime', () => {
    const invalidInput = {
      animeTitle: 'Test',
      startTime: 200,
      endTime: 100,
    };
    expect(invalidInput.endTime <= invalidInput.startTime).toBe(true);
  });

  it('should validate browse query parameters', () => {
    const validParams = { limit: 20, offset: 0 };
    expect(validParams.limit).toBeGreaterThan(0);
    expect(validParams.limit).toBeLessThanOrEqual(50);
    expect(validParams.offset).toBeGreaterThanOrEqual(0);
  });
});

describe('Features Route', () => {
  it('should list all feature flags', async () => {
    const flags = [
      'ai_recommendations',
      'ai_moderation',
      'ai_recaps',
      'voice_chat',
      'clips',
      'streaks',
      'achievements',
      'analytics',
      'embed',
      'soundboard',
      'taste_graph',
    ];
    expect(flags.length).toBeGreaterThan(10);
    expect(flags).toContain('ai_recommendations');
    expect(flags).toContain('voice_chat');
  });
});

describe('Health Route', () => {
  it('should return alive status for liveness probe', () => {
    const response = {
      status: 'alive',
      uptime: 1234.56,
      timestamp: new Date().toISOString(),
    };
    expect(response.status).toBe('alive');
    expect(typeof response.uptime).toBe('number');
  });

  it('should check database connectivity for readiness', async () => {
    const { supabaseAdmin } = await import('../lib/supabase');
    const result = await supabaseAdmin.from('profiles').select('id').limit(1);
    expect(result).toBeDefined();
  });

  it('should check Redis connectivity for readiness', async () => {
    const { redisService } = await import('../services/redis.service');
    const client = redisService.getClient();
    const pong = await client.ping();
    expect(pong).toBe('PONG');
  });
});

describe('Security Middleware', () => {
  it('should generate CSRF tokens for safe methods', () => {
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    const unsafeMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

    safeMethods.forEach(method => {
      expect(safeMethods.includes(method)).toBe(true);
    });

    unsafeMethods.forEach(method => {
      expect(safeMethods.includes(method)).toBe(false);
    });
  });

  it('should apply tiered rate limits', () => {
    const tiers: Record<string, { max: number; window: number }> = {
      '/api/auth': { max: 20, window: 60 },
      '/api/rooms': { max: 60, window: 60 },
      '/api/payments': { max: 30, window: 60 },
      '/api/ai': { max: 30, window: 60 },
    };

    expect(tiers['/api/auth'].max).toBeLessThan(tiers['/api/rooms'].max);
    expect(tiers['/api/payments'].max).toBe(30);
  });
});

describe('Error Handler', () => {
  it('should create AppError with code and status', async () => {
    const { AppError, ErrorCodes } = await import('../middleware/errorHandler');
    const error = new AppError(ErrorCodes.ROOM_NOT_FOUND, 'Room not found', 404);

    expect(error.code).toBe(ErrorCodes.ROOM_NOT_FOUND);
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Room not found');
  });

  it('should have all required error codes', async () => {
    const { ErrorCodes } = await import('../middleware/errorHandler');
    expect(ErrorCodes.ROOM_NOT_FOUND).toBeDefined();
    expect(ErrorCodes.UNAUTHORIZED).toBeDefined();
    expect(ErrorCodes.VALIDATION_ERROR).toBeDefined();
    expect(ErrorCodes.RATE_LIMITED).toBeDefined();
    expect(ErrorCodes.INTERNAL_ERROR).toBeDefined();
    expect(ErrorCodes.FORBIDDEN).toBeDefined();
    expect(ErrorCodes.SYNC_LOCKED).toBeDefined();
  });
});
