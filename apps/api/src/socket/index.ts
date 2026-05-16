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

    // Update presence
    await redisService.setUserOnline(socket.userId!, {
      socketId: socket.id,
      status: 'online',
      connectedAt: new Date().toISOString(),
    });

    // Broadcast presence update
    socket.broadcast.emit('presence:update', {
      user_id: socket.userId!,
      status: 'online',
      current_room_id: null,
      activity: null,
      user: socket.user,
    } as any);

    // Initialize handlers
    roomHandler(io, socket);
    syncHandler(io, socket);
    chatHandler(io, socket);
    presenceHandler(io, socket);

    // Disconnect handler
    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      
      // Leave all rooms
      const rooms = await redisService.getClient().sMembers(`user:${socket.userId}:rooms`);
      for (const roomId of rooms) {
        await redisService.removeUserFromRoom(roomId, socket.userId!);
        socket.to(roomId).emit('room:user_left', socket.userId!);
      }

      // Update presence
      await redisService.setUserOffline(socket.userId!);
      
      socket.broadcast.emit('presence:update', {
        user_id: socket.userId!,
        status: 'offline',
        current_room_id: null,
        activity: null,
        user: socket.user,
      } as any);
    });
  });
}
