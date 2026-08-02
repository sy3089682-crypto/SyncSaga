import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

const mockLoggerInfo = vi.fn();
const mockLoggerError = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'audit_logs') {
        return {
          insert: mockInsert,
          select: mockSelect.mockReturnThis(),
          eq: mockEq.mockReturnThis(),
          order: mockOrder.mockReturnThis(),
          limit: mockLimit,
        };
      }
      return {};
    }),
  },
}));

vi.mock('../lib/logger', () => ({
  logger: {
    info: mockLoggerInfo,
    error: mockLoggerError,
  },
}));

describe('AuditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('log', () => {
    it('should insert audit log and call logger.info on success', async () => {
      const { auditService } = await import('../services/audit.service');
      mockInsert.mockResolvedValueOnce({ error: null });

      const metadata = { test: 'data' };
      await auditService.log('user.login', 'user-1', metadata);

      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'user-1',
        action: 'user.login',
        metadata: { test: 'data' },
        ip_address: null,
        user_agent: null,
      });
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        { action: 'user.login', userId: 'user-1', metadata },
        'Audit log'
      );
    });

    it('should use empty object if metadata is not provided', async () => {
      const { auditService } = await import('../services/audit.service');
      mockInsert.mockResolvedValueOnce({ error: null });

      await auditService.log('user.register', 'user-2');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {},
        })
      );
    });

    it('should call logger.error when insert throws an error', async () => {
      const { auditService } = await import('../services/audit.service');
      const testError = new Error('Database insertion failed');
      mockInsert.mockRejectedValueOnce(testError);

      await auditService.log('user.logout', 'user-3');

      expect(mockLoggerError).toHaveBeenCalledWith(
        { action: 'user.logout', userId: 'user-3', error: testError },
        'Failed to write audit log'
      );
      expect(mockLoggerInfo).not.toHaveBeenCalled();
    });
  });

  describe('getRecent', () => {
    it('should fetch recent audit logs with correct chaining and defaults', async () => {
      const { auditService } = await import('../services/audit.service');
      const mockData = [{ id: 1, action: 'user.login' }, { id: 2, action: 'room.join' }];
      mockLimit.mockResolvedValueOnce({ data: mockData });

      const result = await auditService.getRecent('user-1');

      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockLimit).toHaveBeenCalledWith(50);
      expect(result).toEqual(mockData);
    });

    it('should use custom limit if provided', async () => {
       const { auditService } = await import('../services/audit.service');
       mockLimit.mockResolvedValueOnce({ data: [] });

       await auditService.getRecent('user-2', 10);

       expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it('should return empty array if data is null', async () => {
      const { auditService } = await import('../services/audit.service');
      mockLimit.mockResolvedValueOnce({ data: null });

      const result = await auditService.getRecent('user-3');

      expect(result).toEqual([]);
    });
  });
});
