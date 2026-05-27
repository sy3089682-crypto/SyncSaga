import { Server as SocketIOServer } from 'socket.io';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

type NotificationType = 'friend_request' | 'room_invite' | 'mention' | 'system' | 'achievement';

interface CreateNotification {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

let io: SocketIOServer | null = null;

export function setNotificationSocket(socketIO: SocketIOServer) {
  io = socketIO;
}

export class NotificationService {
  async create(notification: CreateNotification) {
    try {
      const { data, error } = await supabase.from('notifications').insert({
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
      }).select().single();

      if (error) throw error;

      if (io) {
        io.to(`user:${notification.userId}`).emit('notification:new', data);
      }

      return data;
    } catch (error) {
      logger.error({ ...notification, error }, 'Failed to create notification');
      return null;
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    return count || 0;
  }

  async markAsRead(notificationId: string, userId: string) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);
  }

  async markAllAsRead(userId: string) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  }

  async list(userId: string, limit = 50, offset = 0) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return data || [];
  }
}

export const notificationService = new NotificationService();
