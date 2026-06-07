import { Server } from 'socket.io';
import { socketAuthMiddleware, AuthenticatedSocket } from './middleware/auth';
import { roomHandler } from './handlers/room.handler';
import { syncHandler } from './handlers/sync.handler';
import { chatHandler } from './handlers/chat.handler';
import { presenceHandler } from './handlers/presence.handler';
import { reactionHandler } from './handlers/reaction.handler';
import { ServerToClientEvents, ClientToServerEvents } from '@syncsaga/types';
import { redisService } from '../services/redis.service';
import { logger } from '../lib/logger';

export function initializeSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  // Auth middleware
  io.use(socketAuthMiddleware as any);

  io.on('connection', async (socket: any) => {
    const authSocket = socket as AuthenticatedSocket;
    logger.info(`Socket connected: ${authSocket.id} - User: ${authSocket.userId}`);

    const uid = authSocket.userId;
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

    // Join user-specific room for notifications
    socket.join(`user:${uid}`);

    roomHandler(io, socket);
    syncHandler(io, socket);
    chatHandler(io, socket);
    presenceHandler(io, socket);
    reactionHandler(io as any, socket);

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
