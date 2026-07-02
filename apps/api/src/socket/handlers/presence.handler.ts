import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth';
import { ServerToClientEvents, ClientToServerEvents, PresenceEvent, User } from '@syncsaga/shared';
import { redisService } from '../../services/redis.service';
import { logger } from '../../lib/logger';
import { validate, presenceUpdateSchema } from '../../middleware/validators';

export function presenceHandler(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) {
  socket.on('presence:update', async (data) => {
    try {
      if (!socket.userId) return;

      const validation = validate(presenceUpdateSchema, data);
      if (!validation.success) return;

      const update = {
        ...validation.data,
        user_id: socket.userId,
        user: socket.user as User,
      };
      await redisService.setUserPresence(socket.userId, update);
      socket.broadcast.emit('presence:update', update);
    } catch (error) {
      logger.error({ err: error }, 'Presence update error');
    }
  });

  socket.on('get-online-users', async (data: { roomId?: string }) => {
    try {
      const users = await redisService.getOnlineUsers(data?.roomId);
      socket.emit('presence:online-users', users);
    } catch (error) {
      logger.error({ err: error }, 'Get online users error');
    }
  });
}
