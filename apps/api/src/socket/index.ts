import { Server } from 'socket.io';
import { socketAuthMiddleware, AuthenticatedSocket } from './middleware/auth';
import { roomHandler } from './handlers/room.handler';
import { syncHandler } from './handlers/sync.handler';
import { chatHandler } from './handlers/chat.handler';
import { presenceHandler } from './handlers/presence.handler';
import { ServerToClientEvents, ClientToServerEvents } from '@syncsaga/shared';
import { redisService } from '../services/redis.service';
import { logger } from '../lib/logger';

export function initializeSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  // Auth middleware
  io.use(socketAuthMiddleware);

  io.on('connection', async (socket: AuthenticatedSocket) => {
    logger.info(`Socket connected: ${socket.id} - User: ${socket.userId}`);

    const uid = socket.userId;
    await redisService.setUserOnline(uid, {
      socketId: socket.id,
      status: 'online',
      connectedAt: new Date().toISOString(),
    });

    socket.broadcast.emit('presence:update', {
      user_id: uid,
      status: 'online',
      current_room_id: null,
      activity: null,
      user: socket.user,
    });

    roomHandler(io, socket);
    syncHandler(io, socket);
    chatHandler(io, socket);
    presenceHandler(io, socket);

    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      
      const rooms = await redisService.getClient().sMembers(`user:${uid}:rooms`);
      for (const roomId of rooms) {
        await redisService.removeUserFromRoom(roomId, uid);
        socket.to(roomId).emit('room:user_left', uid);
      }

      await redisService.setUserOffline(uid);
      
      socket.broadcast.emit('presence:update', {
        user_id: uid,
        status: 'offline',
        current_room_id: null,
        activity: null,
        user: socket.user,
      });
    });
  });
}
