import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth';
import { roomService } from '../../services/room.service';
import { redisService } from '../../services/redis.service';
import { ServerToClientEvents, ClientToServerEvents, Room, User } from '@syncsaga/shared';
import { logger } from '../../lib/logger';
import { validate, roomJoinSchema, roomLeaveSchema } from '../../middleware/validators';
import { auditService } from '../../services/audit.service';
import { queueService } from '../../services/queue.service';

export function roomHandler(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) {
  socket.on('room:join', async (data) => {
    try {
      if (!socket.userId) {
        return socket.emit('error', { code: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const validation = validate(roomJoinSchema, data);
      if (!validation.success) {
        return socket.emit('error', { code: 'VALIDATION_ERROR', message: validation.error });
      }

      const { roomId, password } = validation.data;
      const room = await roomService.getRoom(roomId);
      if (!room) {
        return socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      }

      const joined = await roomService.joinRoom(roomId, socket.userId, password);
      if (!joined) {
        return socket.emit('error', { code: 'JOIN_FAILED', message: 'Could not join room' });
      }

      await redisService.addUserToRoom(roomId, socket.userId, socket.id);
      socket.join(roomId);

      // Initialize room state in Redis if not present
      let state = await redisService.getRoomState(roomId);
      if (!state) {
        state = {
          host_id: room.host_id,
          co_hosts: room.co_hosts || [],
          current_timestamp: room.current_timestamp || 0,
          playback_state: room.playback_state || 'paused',
          playback_speed: room.playback_speed || 1,
          current_episode: room.current_episode || null,
          current_episode_number: room.current_episode_number || null,
          sync_lock: room.sync_lock ?? false,
          last_sync_at: Date.now(),
        };
        await redisService.setRoomState(roomId, state);
      }

      socket.emit('room:state', {
        ...room,
        current_timestamp: (state.current_timestamp as number) ?? room.current_timestamp,
        playback_state: (state.playback_state as string) ?? room.playback_state,
        playback_speed: (state.playback_speed as number) ?? room.playback_speed,
      });

      socket.to(roomId).emit('room:user_joined', socket.user as User);

      await auditService.log('room.join', socket.userId, { roomId });
      await queueService.audit('room.join', socket.userId, { roomId });
      logger.info({ userId: socket.userId, roomId }, 'User joined room');
    } catch (error) {
      logger.error({ err: error }, 'Room join error');
      socket.emit('error', { code: 'INTERNAL_ERROR', message: 'Internal server error' });
    }
  });

  socket.on('room:leave', async (data) => {
    try {
      if (!socket.userId) return;

      const validation = validate(roomLeaveSchema, data);
      if (!validation.success) {
        return socket.emit('error', { code: 'VALIDATION_ERROR', message: validation.error });
      }

      const { roomId } = validation.data;
      await roomService.leaveRoom(roomId, socket.userId);
      socket.leave(roomId);
      socket.to(roomId).emit('room:user_left', socket.userId);

      await auditService.log('room.leave', socket.userId, { roomId });
      await queueService.audit('room.leave', socket.userId, { roomId });
      logger.info({ userId: socket.userId, roomId }, 'User left room');
    } catch (error) {
      logger.error({ err: error }, 'Room leave error');
    }
  });

  socket.on('room:update', async (update: Partial<Room> & { id: string }) => {
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
      logger.error({ err: error }, 'Room update error');
    }
  });
}
