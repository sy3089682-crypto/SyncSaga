import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth';
import { ServerToClientEvents, ClientToServerEvents, User } from '@syncsaga/shared';
import { redisService } from '../../services/redis.service';
import { logger } from '../../lib/logger';
import { validate, voiceJoinSchema, voiceLeaveSchema } from '../../middleware/validators';

export function voiceHandler(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) {
  socket.on('voice:join', async (data) => {
    try {
      const validation = validate(voiceJoinSchema, data);
      if (!validation.success) return socket.emit('error', { code: 'VALIDATION_ERROR', message: validation.error });
      const { roomId } = validation.data;
      if (!socket.userId) return;

      // Check if user is in the room
      const userSocketId = await redisService.getUserSocketId(roomId, socket.userId);
      if (!userSocketId) return socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Not in room' });

      // Check if voice chat feature is enabled
      const roomState = await redisService.getRoomState(roomId);
      if (!roomState) return socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });

      // TODO: Integrate with LiveKit for actual voice chat
      // For now, just track voice state in Redis
      await redisService.setUserVoiceState(roomId, socket.userId, true);

      // Notify others in the room
      io.to(roomId).emit('voice:user_joined', {
        userId: socket.userId,
        user: socket.user as User,
      });

      socket.emit('voice:joined', { roomId });
      logger.debug(`User ${socket.userId} joined voice in ${roomId}`);
    } catch (error) {
      logger.error('Voice join error:', error as Error);
    }
  });

  socket.on('voice:leave', async (data) => {
    try {
      const validation = validate(voiceLeaveSchema, data);
      if (!validation.success) return socket.emit('error', { code: 'VALIDATION_ERROR', message: validation.error });
      const { roomId } = validation.data;
      if (!socket.userId) return;

      // Update voice state
      await redisService.setUserVoiceState(roomId, socket.userId, false);

      // Notify others in the room
      io.to(roomId).emit('voice:user_left', {
        userId: socket.userId,
      });

      socket.emit('voice:left', { roomId });
      logger.debug(`User ${socket.userId} left voice in ${roomId}`);
    } catch (error) {
      logger.error('Voice leave error:', error as Error);
    }
  });
}
