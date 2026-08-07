import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth';
import { redisService } from '../../services/redis.service';
import { ServerToClientEvents, ClientToServerEvents, WatchProgressEvent } from '@syncsaga/shared';
import { logger } from '../../lib/logger';
import { validate, watchProgressSchema } from '../../middleware/validators';
import { auditService } from '../../services/audit.service';

export function watchProgressHandler(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) {
  // Client emits watch progress (when user seeks/plays/pauses in a room)
  socket.on('watch:progress', async (data) => {
    try {
      if (!socket.userId) return;

      // Validate input
      const validation = validate(watchProgressSchema, data);
      if (!validation.success) {
        return socket.emit('error', { code: 'VALIDATION_ERROR', message: validation.error });
      }

      const validatedData = validation.data;
      const roomId = validatedData.room_id;

      // Check if user is in the room
      const userSocketId = await redisService.getUserSocketId(roomId, socket.userId);
      if (!userSocketId) {
        return socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Not in room' });
      }

      // Enrich with server metadata - ensure all required fields have values
      const enrichedEvent: WatchProgressEvent = {
        room_id: validatedData.room_id,
        anime_id: validatedData.anime_id,
        anime_title: validatedData.anime_title,
        anime_cover_url: validatedData.anime_cover_url ?? null,
        episode: validatedData.episode,
        season: validatedData.season ?? 1,
        timestamp: validatedData.timestamp,
        duration: validatedData.duration ?? 0,
        progress: validatedData.progress,
        completed: validatedData.completed ?? false,
        user_id: socket.userId,
        server_time: Date.now(),
      };

      // Broadcast to other clients in the room
      socket.to(roomId).emit('watch:progress_update', enrichedEvent);

      // Also save to database via the watch progress API (optional - could call API or do direct)
      // For now, we rely on the frontend also calling the REST API to persist
    } catch (error) {
      logger.error({ err: error }, 'Watch progress socket error');
      socket.emit('error', { code: 'INTERNAL_ERROR', message: 'Failed to process watch progress' });
    }
  });
}

export default watchProgressHandler;
