import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth';
import { redisService } from '../../services/redis.service';
import { ServerToClientEvents, ClientToServerEvents, SyncEvent } from '@syncsaga/shared';
import { logger } from '../../lib/logger';

// Drift correction: authoritative host system
export function syncHandler(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) {
  socket.on('sync:event', async (event: SyncEvent) => {
    try {
      if (!socket.userId) return;

      const roomId = event.room_id;
      
      // Verify user is in room
      const roomUsers = await redisService.getRoomUsers(roomId);
      if (!roomUsers.includes(socket.userId)) {
        return socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Not in room' });
      }

      // Get room state to check if sender is host/co-host
      const roomState = await redisService.getRoomState(roomId);
      const isHost = roomState?.host_id === socket.userId || 
                     roomState?.co_hosts?.includes(socket.userId);

      // Non-hosts can only send ready/buffering events
      if (!isHost && !['ready', 'buffering'].includes(event.type)) {
        return socket.emit('error', { code: 'NOT_HOST', message: 'Only host can control playback' });
      }

      // Add server timestamp for latency compensation
      const serverTime = Date.now();
      const enrichedEvent: SyncEvent = {
        ...event,
        server_time: serverTime,
      };

      // Update room state in Redis
      const updates: any = { last_sync_at: serverTime };
      if (event.type === 'seek') updates.current_timestamp = event.timestamp;
      if (event.type === 'play' || event.type === 'pause') updates.playback_state = event.type === 'play' ? 'playing' : 'paused';
      if (event.type === 'speed') updates.playback_speed = event.playback_speed;
      if (event.type === 'episode') updates.current_episode = event.episode;
      
      await redisService.setRoomState(roomId, {
        ...roomState,
        ...updates,
      });

      // Broadcast to all room members except sender (or including sender for consistency)
      socket.to(roomId).emit('sync:event', enrichedEvent);

      // Also send current authoritative state periodically
      if (event.type === 'play' || event.type === 'seek' || event.type === 'episode') {
        socket.to(roomId).emit('sync:state', {
          timestamp: event.timestamp,
          playback_state: updates.playback_state || roomState?.playback_state || 'paused',
          speed: updates.playback_speed || roomState?.playback_speed || 1,
          episode: updates.current_episode || roomState?.current_episode || null,
        });
      }

      logger.debug(`Sync event from ${socket.userId} in ${roomId}: ${event.type}`);
    } catch (error) {
      logger.error('Sync event error:', error);
    }
  });

  // Handle sync state requests (for new joins or reconnection recovery)
  socket.on('sync:request', async ({ roomId }: { roomId: string }) => {
    try {
      const state = await redisService.getRoomState(roomId);
      if (state) {
        socket.emit('sync:state', {
          timestamp: state.current_timestamp || 0,
          playback_state: state.playback_state || 'paused',
          speed: state.playback_speed || 1,
          episode: state.current_episode || null,
        });
      }
    } catch (error) {
      logger.error('Sync request error:', error);
    }
  });
}
