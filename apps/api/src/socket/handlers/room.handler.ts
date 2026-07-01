import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth';
import { roomService } from '../../services/room.service';
import { redisService } from '../../services/redis.service';
import { ServerToClientEvents, ClientToServerEvents, Room, User } from '@syncsaga/shared';
import { logger } from '../../lib/logger';

export function roomHandler(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) {
  socket.on('room:join', async ({ roomId, password }: { roomId: string; password?: string }) => {
    try {
      if (!socket.userId) return socket.emit('error', { code: 'AUTH_REQUIRED', message: 'Authentication required' });
      const room = await roomService.getRoom(roomId);
      if (!room) return socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
      const joined = await roomService.joinRoom(roomId, socket.userId, password);
      if (!joined) return socket.emit('error', { code: 'JOIN_FAILED', message: 'Could not join room' });
      await redisService.addUserToRoom(roomId, socket.userId, socket.id);
      socket.join(roomId);
      const state = await redisService.getRoomState(roomId);
      socket.emit('room:state', {
        ...room,
        current_timestamp: state?.current_timestamp ?? room.current_timestamp,
        playback_state: state?.playback_state ?? room.playback_state,
        playback_speed: state?.playback_speed ?? room.playback_speed,
      });
      socket.to(roomId).emit('room:user_joined', socket.user as User);
      logger.info('User ' + socket.userId + ' joined room ' + roomId);
    } catch (error) {
      logger.error('Room join error:', error as Error);
      socket.emit('error', { code: 'INTERNAL_ERROR', message: 'Internal server error' });
    }
  });

  socket.on('room:leave', async ({ roomId }: { roomId: string }) => {
    try {
      if (!socket.userId) return;
      await roomService.leaveRoom(roomId, socket.userId);
      socket.leave(roomId);
      socket.to(roomId).emit('room:user_left', socket.userId);
      logger.info('User ' + socket.userId + ' left room ' + roomId);
    } catch (error) {
      logger.error('Room leave error:', error as Error);
    }
  });

  socket.on('room:update', async (update: Partial<Room> & { id: string }) => {
    try {
      if (!socket.userId || !update.id) return;
      const room = await roomService.getRoom(update.id);
      if (!room || room.host_id !== socket.userId) return socket.emit('error', { code: 'FORBIDDEN', message: 'Only host can update room' });
      const { id, ...fields } = update;
      await roomService.updateRoomState(id, fields);
      const updatedRoom = await roomService.getRoom(update.id);
      if (updatedRoom) io.to(update.id).emit('room:state', updatedRoom);
    } catch (error) {
      logger.error('Room update error:', error as Error);
    }
  });
}