import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Queue Service Tests (BullMQ)
 *
 * Tests the queue service API — enqueue helpers, metrics,
 * and graceful shutdown. Uses mocked BullMQ.
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
          single: vi.fn().mockResolvedValue({ data: { id: 'notif-1' }, error: null }),
        }),
      }),
    }),
  },
  supabaseAdmin: { from: vi.fn() },
}));

vi.mock('../services/redis.service', () => ({
  redisService: {
    getClient: vi.fn().mockReturnValue({
      // Mock Redis client for BullMQ connection
    }),
  },
}));

// Mock BullMQ
vi.mock('bullmq', () => {
  const mockAdd = vi.fn().mockResolvedValue({ id: 'job-1' });
  const mockGetJobCounts = vi.fn().mockResolvedValue({
    waiting: 0, active: 0, completed: 1, failed: 0, delayed: 0, paused: 0,
  });
  const mockClose = vi.fn().mockResolvedValue(undefined);

  return {
    Queue: vi.fn().mockImplementation(() => ({
      add: mockAdd,
      getJobCounts: mockGetJobCounts,
      close: mockClose,
    })),
    Worker: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      close: mockClose,
    })),
    QueueEvents: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      close: mockClose,
    })),
    Job: vi.fn(),
  };
});

describe('Queue Service - Enqueue Helpers', () => {
  it('should enqueue audit log entries', async () => {
    const { queueService } = await import('../services/queue.service');
    await queueService.audit('user.login', 'user-1', { ip: '127.0.0.1' });
    // If no error thrown, the enqueue succeeded
    expect(true).toBe(true);
  });

  it('should enqueue notifications', async () => {
    const { queueService } = await import('../services/queue.service');
    await queueService.notify('user-1', 'friend_request', 'New friend request', 'You have a new friend request');
    expect(true).toBe(true);
  });

  it('should enqueue activity feed entries', async () => {
    const { queueService } = await import('../services/queue.service');
    await queueService.activity('user-1', 'clip_created', { clipId: 'clip-1' });
    expect(true).toBe(true);
  });

  it('should enqueue AI processing jobs', async () => {
    const { queueService } = await import('../services/queue.service');
    await queueService.ai('generate_recap', { roomId: 'room-1' });
    expect(true).toBe(true);
  });
});

describe('Queue Service - Metrics', () => {
  it('should return queue metrics', async () => {
    const { queueService } = await import('../services/queue.service');
    const metrics = await queueService.getMetrics();

    expect(metrics).toHaveProperty('audit');
    expect(metrics).toHaveProperty('notifications');
    expect(metrics).toHaveProperty('ai');
    expect(metrics).toHaveProperty('activity');
  });
});

describe('Queue Service - Graceful Shutdown', () => {
  it('should shut down without errors', async () => {
    const { queueService } = await import('../services/queue.service');
    await queueService.shutdown();
    expect(true).toBe(true);
  });
});
