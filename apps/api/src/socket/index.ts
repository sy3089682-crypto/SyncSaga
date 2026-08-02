import { Server } from 'socket.io';
import { socketAuthMiddleware, AuthenticatedSocket } from './middleware/auth';
import { roomHandler } from './handlers/room.handler';
import { syncHandler } from './handlers/sync.handler';
import { chatHandler } from './handlers/chat.handler';
import { presenceHandler } from './handlers/presence.handler';
import { ServerToClientEvents, ClientToServerEvents } from '@syncsaga/shared';
import { redisService } from '../services/redis.service';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

const STALE_CLEANUP_INTERVAL_MS = 30000;
const HOST_CHECK_INTERVAL_MS = 10000;

export function initializeSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  io.use((socket, next) => {
    socketAuthMiddleware(socket as AuthenticatedSocket, next);
  });

  io.on('connection', (async (socket: AuthenticatedSocket) => {
    logger.info({ socketId: socket.id, userId: socket.userId }, 'Socket connected');

    const uid = socket.userId;
    await redisService.setUserOnline(uid, {
      socketId: socket.id,
      status: 'online',
      connectedAt: new Date().toISOString(),
      lastPing: new Date().toISOString(),
    });

    socket.broadcast.emit('presence:update', {
      user_id: uid,
      status: 'online',
      current_room_id: null,
      activity: null,
      user: socket.user,
    });

    socket.join(`user:${uid}`);

    roomHandler(io, socket);
    syncHandler(io, socket);
    chatHandler(io, socket);
    presenceHandler(io, socket);

    socket.on('disconnect', async (reason) => {
      logger.info({ socketId: socket.id, userId: uid, reason }, 'Socket disconnected');

      try {
        // Get all rooms this user was in
        const rooms = await redisService.getClient().sMembers(`user:${uid}:rooms`);

        for (const roomId of rooms) {
          await redisService.removeUserFromRoom(roomId, uid);
          socket.to(roomId).emit('room:user_left', uid);

          // Check if this user was the host — trigger automatic migration
          const roomState = await redisService.getRoomState(roomId);
          if (roomState && (roomState.host_id as string) === uid) {
            const remainingUsers = await redisService.getRoomUsers(roomId);

            if (remainingUsers.length > 0) {
              // Promote the first remaining user to host
              const newHostId = remainingUsers[0]!;

              await redisService.updateRoomStateAtomic(roomId, (current) => ({
                ...current,
                host_id: newHostId,
              }));

              const { error } = await supabase
                .from('rooms')
                .update({ host_id: newHostId })
                .eq('id', roomId);

              if (error) {
                logger.error({ err: error, roomId }, 'Failed to persist automatic host migration');
              }

              io.to(roomId).emit('room:new_host', { newHostId });
              io.to(roomId).emit('sync:takeover', { newHostId, timestamp: Date.now() });

              // Notify the new host
              io.to(`user:${newHostId}`).emit('notification:new', {
                type: 'system',
                title: 'You are now the host',
                body: 'The previous host disconnected. You now control playback.',
              });

              logger.info({ roomId, newHostId, previousHostId: uid }, 'Automatic host migration completed');
            } else {
              // No remaining users — clean up room state
              await redisService.getClient().del(`room:${roomId}:state`);
              await redisService.getClient().del(`room:${roomId}:events`);
              logger.info({ roomId }, 'Room cleaned up — no remaining users');
            }
          }
        }

        await redisService.setUserOffline(uid);
        socket.broadcast.emit('presence:update', {
          user_id: uid,
          status: 'offline',
          current_room_id: null,
          activity: null,
          user: socket.user,
        });
      } catch (error) {
        logger.error({ err: error, socketId: socket.id, userId: uid }, 'Disconnect cleanup error');
      }
    });
  }) as any);

  // Stale connection cleanup — periodic sweep
  const cleanupInterval = setInterval(async () => {
    try {
      const staleUsers = await redisService.getStaleSockets(STALE_CLEANUP_INTERVAL_MS);
      for (const userId of staleUsers) {
        const socketId = await redisService.getUserSocketIdGlobal(userId);
        if (socketId) {
          const socket = io.sockets.sockets.get(socketId);
          if (socket && !socket.connected) {
            await redisService.setUserOffline(userId);
            logger.info({ userId, socketId }, 'Cleaned up stale connection');
          }
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Stale connection cleanup error');
    }
  }, STALE_CLEANUP_INTERVAL_MS);

  // Host liveness check — detect stale hosts
  const hostCheckInterval = setInterval(async () => {
    try {
      // Check all rooms with active state
      const presenceData = await redisService.getOnlineUsers();
      for (const [userId, data] of Object.entries(presenceData)) {
        const parsed = data as { current_room_id?: string; status?: string; lastPing?: string };
        if (parsed.current_room_id) {
          const roomState = await redisService.getRoomState(parsed.current_room_id);
          if (roomState && (roomState.host_id as string) === userId) {
            const lastPing = parsed.lastPing ? new Date(parsed.lastPing).getTime() : 0;
            if (Date.now() - lastPing > HOST_CHECK_INTERVAL_MS * 2) {
              // Host appears stale — notify room
              io.to(parsed.current_room_id).emit('error', {
                code: 'HOST_STALE',
                message: 'Host appears to be disconnected. Any member can take over.',
              });
            }
          }
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Host liveness check error');
    }
  }, HOST_CHECK_INTERVAL_MS);

  // Clean up intervals on server shutdown
  io.on('close', () => {
    clearInterval(cleanupInterval);
    clearInterval(hostCheckInterval);
  });
}
