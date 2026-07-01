import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth';
import { ServerToClientEvents, ClientToServerEvents, PresenceEvent, User } from '@syncsaga/shared';
import { redisService } from '../../services/redis.service';
import { logger } from '../../lib/logger';

export function presenceHandler(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) {
  socket.on('presence:update', async (data: Partial<PresenceEvent>) => {
    try {
      if (!socket.userId) return;
      const update = { ...data, user_id: socket.userId, user: socket.user as User };
      await redisService.setUserPresence(socket.userId, update);
      socket.broadcast.emit('presence:update', update);
    } catch (error) {
      logger.error('Presence update error:', error as Error);
    }
  });

  socket.on('get-online-users', async (data: { roomId?: string }) => {
    try {
      const users = await redisService.getOnlineUsers(data.roomId);
      socket.emit('presence:online-users', users);
    } catch (error) {
      logger.error('Get online users error:', error as Error);
    }
  });
}