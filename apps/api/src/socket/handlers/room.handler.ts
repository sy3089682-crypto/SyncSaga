import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth';
import { roomService } from '../../services/room.service';
import { redisService } from '../../services/redis.service';
import { ServerToClientEvents, ClientToServerEvents } from '@syncsaga/types';
import { logger } from '../../lib/logger';

export function roomHandler(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) {
  socket.on('room:join', async ({ roomId, password }: { roomId: string; password?: string }) => {
    try {
      if (!socket.userId) {
        return socket.emit('error', { code: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const room = await roomService.getRoom(roomId);
      if (!room) {
        return socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      }

      // Join the room
      const joined = await roomService.joinRoom(roomId, socket.userId, password);
      if (!joined) {
        return socket.emit('error', { code: 'JOIN_FAILED', message: 'Could not join room' });
      }

      // Add to Redis tracking
      await redisService.addUserToRoom(roomId, socket.userId, socket.id);
      
      // Join Socket.IO room
      socket.join(roomId);

      // Get current room state from Redis
      const state = await redisService.getRoomState(roomId);

      // Send room state to joining user
      socket.emit('room:state', {
        ...room,
        playback_position: state?.playback_position ?? room.playback_position,
        playback_state: state?.playback_state ?? room.playback_state,
        playback_speed: state?.playback_speed ?? room.playback_speed,
      });

      // Broadcast to room members
      socket.to(roomId).emit('room:user_joined', socket.user);

      logger.info(`User ${socket.userId} joined room ${roomId}`);
    } catch (error) {
      logger.error(error, 'Room join error:');
      socket.emit('error', { code: 'INTERNAL_ERROR', message: 'Internal server error' });
    }
  });

  socket.on('room:leave', async ({ roomId }: { roomId: string }) => {
    try {
      if (!socket.userId) return;

      await roomService.leaveRoom(roomId, socket.userId);
      socket.leave(roomId);
      
      socket.to(roomId).emit('room:user_left', socket.userId);
      logger.info(`User ${socket.userId} left room ${roomId}`);
    } catch (error) {
      logger.error(error, 'Room leave error:');
    }
  });

  socket.on('room:update', async (update) => {
    try {
      if (!socket.userId || !update.id) return;

      const room = await roomService.getRoom(update.id);
      if (!room || room.host_id !== socket.userId) {
        return socket.emit('error', { code: 'FORBIDDEN', message: 'Only host can update room' });
      }

      const { id, ...fields } = update;
      await roomService.updateRoomState(id, fields);
      
      const updatedRoom = await roomService.getRoom(update.id);
      if (updatedRoom) {
        io.to(update.id).emit('room:state', updatedRoom);
      }
    } catch (error) {
      logger.error(error, 'Room update error:');
    }
  });
}
