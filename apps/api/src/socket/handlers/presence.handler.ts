import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth';
import { redisService } from '../../services/redis.service';
import { ServerToClientEvents, ClientToServerEvents, PresenceEvent } from '@syncsaga/shared';
import { logger } from '../../lib/logger';

export function presenceHandler(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) {
  socket.on('presence:update', async (event: PresenceEvent) => {
    try {
      if (!socket.userId) return;

      // Update Redis
      await redisService.setUserOnline(socket.userId, {
        socketId: socket.id,
        status: event.status,
        currentRoomId: event.current_room_id,
        activity: event.activity,
        updatedAt: new Date().toISOString(),
      });

      socket.broadcast.emit('presence:update', {
        ...event,
        user_id: socket.userId,
        user: socket.user,
      });

      logger.debug(`Presence update: ${socket.userId} -> ${event.status}`);
    } catch (error) {
      logger.error('Presence update error:', error);
    }
  });

  // Send current online users to newly connected socket
  socket.on('presence:get_online', async () => {
    try {
      const onlineUsers = await redisService.getOnlineUsers();
      
      for (const [userId, data] of Object.entries(onlineUsers)) {
        if (userId !== socket.userId) {
          socket.emit('presence:update', {
            user_id: userId,
            status: data.status || 'online',
            current_room_id: data.currentRoomId || null,
            activity: data.activity || null,
          } as any);
        }
      }
    } catch (error) {
      logger.error('Get online users error:', error);
    }
  });
}
