import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();
const mockKeys = vi.fn();

vi.mock('../services/redis.service', () => ({
  redisService: {
    getClient: () => ({
      get: mockGet,
      set: mockSet,
      del: mockDel,
      keys: mockKeys,
      ping: vi.fn().mockResolvedValue('PONG'),
    }),
    connect: vi.fn().mockResolvedValue(undefined),
    checkRateLimit: vi.fn().mockResolvedValue(true),
  },
}));

describe('CacheService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should cache and retrieve values', async () => {
    const { cacheService } = await import('../services/cache.service');

    mockGet.mockResolvedValueOnce(null);
    mockSet.mockResolvedValueOnce('OK');

    const result = await cacheService.getOrSet('test-key', async () => ({ data: 'hello' }), 60);
    expect(result).toEqual({ data: 'hello' });
    expect(mockGet).toHaveBeenCalledWith('cache:test-key');
    expect(mockSet).toHaveBeenCalled();
  });

  it('should return cached values', async () => {
    const { cacheService } = await import('../services/cache.service');

    mockGet.mockResolvedValueOnce(JSON.stringify({ data: 'cached' }));

    const result = await cacheService.getOrSet('test-key', async () => ({ data: 'fresh' }), 60);
    expect(result).toEqual({ data: 'cached' });
  });

  it('should get value directly', async () => {
    const { cacheService } = await import('../services/cache.service');

    mockGet.mockResolvedValueOnce(JSON.stringify({ foo: 'bar' }));
    const result = await cacheService.get<{ foo: string }>('my-key');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('should return null for missing keys', async () => {
    const { cacheService } = await import('../services/cache.service');

    mockGet.mockResolvedValueOnce(null);
    const result = await cacheService.get('missing-key');
    expect(result).toBeNull();
  });

  it('should delete pattern', async () => {
    const { cacheService } = await import('../services/cache.service');

    mockKeys.mockResolvedValueOnce(['cache:a', 'cache:b', 'cache:c']);
    mockDel.mockResolvedValueOnce(3);

    await cacheService.deletePattern('cache:*');
    expect(mockKeys).toHaveBeenCalledWith('cache:*');
    expect(mockDel).toHaveBeenCalled();
  });
});
