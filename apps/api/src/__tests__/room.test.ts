import { describe, it, expect, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  },
}));

describe('Room Service', () => {
  it('should be importable', async () => {
    const { roomService } = await import('../services/room.service');
    expect(roomService).toBeDefined();
  });
});
