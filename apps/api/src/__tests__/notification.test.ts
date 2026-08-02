import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService, setNotificationSocket } from '../services/notification.service';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

// Mock dependencies
vi.mock('../lib/supabase', () => {
  const mockChain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
  };

  return {
    supabase: {
      from: vi.fn(() => mockChain),
    },
  };
});

vi.mock('../lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;

  // Mock Socket.IO
  const mockEmit = vi.fn();
  const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });
  const mockIo = { to: mockTo } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    notificationService = new NotificationService();
    setNotificationSocket(mockIo);
  });

  describe('create', () => {
    const mockNotification = {
      userId: 'user-123',
      type: 'system' as const,
      title: 'Test Notification',
      body: 'This is a test',
      data: { key: 'value' },
    };

    it('should create a notification and emit via socket if successful', async () => {
      const mockData = { id: 'notif-1', ...mockNotification };

      const mockChain = supabase.from('notifications');
      (mockChain.single as any).mockResolvedValueOnce({ data: mockData, error: null });

      const result = await notificationService.create(mockNotification);

      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(mockChain.insert).toHaveBeenCalledWith({
        user_id: mockNotification.userId,
        type: mockNotification.type,
        title: mockNotification.title,
        body: mockNotification.body,
        data: mockNotification.data,
      });
      expect(mockChain.select).toHaveBeenCalled();
      expect(mockChain.single).toHaveBeenCalled();

      expect(mockTo).toHaveBeenCalledWith(`user:${mockNotification.userId}`);
      expect(mockEmit).toHaveBeenCalledWith('notification:new', mockData);
      expect(result).toEqual(mockData);
    });

    it('should handle creation error and log it without emitting socket event', async () => {
      const mockError = new Error('Database error');
      const mockChain = supabase.from('notifications');
      (mockChain.single as any).mockResolvedValueOnce({ data: null, error: mockError });

      const result = await notificationService.create(mockNotification);

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: mockError }),
        'Failed to create notification'
      );
      expect(mockTo).not.toHaveBeenCalled();
      expect(mockEmit).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should handle creation when socket is not initialized', async () => {
      setNotificationSocket(null as any);

      const mockData = { id: 'notif-2', ...mockNotification };
      const mockChain = supabase.from('notifications');
      (mockChain.single as any).mockResolvedValueOnce({ data: mockData, error: null });

      const result = await notificationService.create(mockNotification);

      expect(mockTo).not.toHaveBeenCalled();
      expect(mockEmit).not.toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for a user', async () => {
      const mockChain = supabase.from('notifications');
      // Chain mock: eq().eq() needs to return a promise resolving to { count }
      const finalPromise = Promise.resolve({ count: 5 });
      const eq2 = vi.fn().mockReturnValueOnce(finalPromise);
      const eq1 = vi.fn().mockReturnValueOnce({ eq: eq2 });
      (mockChain.select as any).mockReturnValueOnce({ eq: eq1 });

      const result = await notificationService.getUnreadCount('user-123');

      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(mockChain.select).toHaveBeenCalledWith('*', { count: 'exact', head: true });
      expect(eq1).toHaveBeenCalledWith('user_id', 'user-123');
      expect(eq2).toHaveBeenCalledWith('is_read', false);
      expect(result).toBe(5);
    });

    it('should return 0 if count is null', async () => {
      const mockChain = supabase.from('notifications');
      const finalPromise = Promise.resolve({ count: null });
      const eq2 = vi.fn().mockReturnValueOnce(finalPromise);
      const eq1 = vi.fn().mockReturnValueOnce({ eq: eq2 });
      (mockChain.select as any).mockReturnValueOnce({ eq: eq1 });

      const result = await notificationService.getUnreadCount('user-123');
      expect(result).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark a specific notification as read', async () => {
      const mockChain = supabase.from('notifications');
      const finalPromise = Promise.resolve({});
      const eq2 = vi.fn().mockReturnValueOnce(finalPromise);
      const eq1 = vi.fn().mockReturnValueOnce({ eq: eq2 });
      (mockChain.update as any).mockReturnValueOnce({ eq: eq1 });

      await notificationService.markAsRead('notif-1', 'user-123');

      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(mockChain.update).toHaveBeenCalledWith({ is_read: true });
      expect(eq1).toHaveBeenCalledWith('id', 'notif-1');
      expect(eq2).toHaveBeenCalledWith('user_id', 'user-123');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read for a user', async () => {
      const mockChain = supabase.from('notifications');
      const finalPromise = Promise.resolve({});
      const eq2 = vi.fn().mockReturnValueOnce(finalPromise);
      const eq1 = vi.fn().mockReturnValueOnce({ eq: eq2 });
      (mockChain.update as any).mockReturnValueOnce({ eq: eq1 });

      await notificationService.markAllAsRead('user-123');

      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(mockChain.update).toHaveBeenCalledWith({ is_read: true });
      expect(eq1).toHaveBeenCalledWith('user_id', 'user-123');
      expect(eq2).toHaveBeenCalledWith('is_read', false);
    });
  });

  describe('list', () => {
    it('should list notifications for a user with default pagination', async () => {
      const mockData = [{ id: 'notif-1' }, { id: 'notif-2' }];
      const mockChain = supabase.from('notifications');

      const rangeMock = vi.fn().mockResolvedValueOnce({ data: mockData });
      const orderMock = vi.fn().mockReturnValueOnce({ range: rangeMock });
      const eqMock = vi.fn().mockReturnValueOnce({ order: orderMock });
      (mockChain.select as any).mockReturnValueOnce({ eq: eqMock });

      const result = await notificationService.list('user-123');

      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(mockChain.select).toHaveBeenCalledWith('*');
      expect(eqMock).toHaveBeenCalledWith('user_id', 'user-123');
      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(rangeMock).toHaveBeenCalledWith(0, 49); // default limit 50, offset 0 -> 0 to 49
      expect(result).toEqual(mockData);
    });

    it('should list notifications with custom pagination', async () => {
      const mockData = [{ id: 'notif-3' }];
      const mockChain = supabase.from('notifications');

      const rangeMock = vi.fn().mockResolvedValueOnce({ data: mockData });
      const orderMock = vi.fn().mockReturnValueOnce({ range: rangeMock });
      const eqMock = vi.fn().mockReturnValueOnce({ order: orderMock });
      (mockChain.select as any).mockReturnValueOnce({ eq: eqMock });

      const result = await notificationService.list('user-123', 10, 20);

      expect(rangeMock).toHaveBeenCalledWith(20, 29); // offset 20, limit 10 -> 20 to 29
      expect(result).toEqual(mockData);
    });

    it('should return empty array if no data', async () => {
      const mockChain = supabase.from('notifications');

      const rangeMock = vi.fn().mockResolvedValueOnce({ data: null });
      const orderMock = vi.fn().mockReturnValueOnce({ range: rangeMock });
      const eqMock = vi.fn().mockReturnValueOnce({ order: orderMock });
      (mockChain.select as any).mockReturnValueOnce({ eq: eqMock });

      const result = await notificationService.list('user-123');
      expect(result).toEqual([]);
    });
  });
});
