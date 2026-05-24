import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth';
import { redisService } from '../../services/redis.service';
import { ServerToClientEvents, ClientToServerEvents, SyncEvent } from '@syncsaga/shared';
import { logger } from '../../lib/logger';
import { supabase } from '../../lib/supabase';

// Track RTT for each client per room
const rttMap = new Map<string, { pingTime: number; rtt: number }>();

// Track client logical clocks for vector clock sync
const logicalClocks = new Map<string, number>();

export function syncHandler(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) {
  // Ping/pong for RTT measurement
  socket.on('sync:ping', ({ clientTime }) => {
    const serverTime = Date.now();
    socket.emit('sync:pong', { clientTime, serverTime, rtt: 0 });
    rttMap.set(socket.id, { pingTime: clientTime, rtt: serverTime - clientTime });
  });

  // Track drift per user and emit status
  async function emitDriftStatus(roomId: string, drift: number) {
    let status: 'synced' | 'slight' | 'desynced';
    if (drift < 0.5) status = 'synced';
    else if (drift <= 2) status = 'slight';
    else status = 'desynced';
    io.to(roomId).emit('sync:drift_update', { userId: socket.userId, drift, status });
  }

  // Periodic host heartbeat - send authoritative state every 5s
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  async function startHostHeartbeat(roomId: string) {
    stopHostHeartbeat();
    heartbeatInterval = setInterval(async () => {
      const state = await redisService.getRoomState(roomId);
      if (state) {
        io.to(roomId).emit('sync:state', {
          timestamp: state.current_timestamp || 0,
          playback_state: state.playback_state || 'paused',
          speed: state.playback_speed || 1,
          episode: state.current_episode || null,
          episode_number: state.current_episode_number || null,
        });
      }
    }, 5000);
  }

  function stopHostHeartbeat() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  }

  // Increment logical clock
  function tickClock() {
    const current = logicalClocks.get(socket.id) || 0;
    const next = current + 1;
    logicalClocks.set(socket.id, next);
    return next;
  }

  socket.on('sync:event', async (event: SyncEvent) => {
    try {
      if (!socket.userId) return;

      const roomId = event.room_id;
      
      const roomUsers = await redisService.getRoomUsers(roomId);
      if (!roomUsers.includes(socket.userId)) {
        return socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Not in room' });
      }

      const roomState = await redisService.getRoomState(roomId);
      const isHost = roomState?.host_id === socket.userId || 
                     roomState?.co_hosts?.includes(socket.userId);

      const clock = tickClock();
      const serverTime = Date.now();
      const enrichedEvent: SyncEvent = {
        ...event,
        server_time: serverTime,
      };

      const updates: any = { last_sync_at: serverTime };
      if (event.type === 'seek') updates.current_timestamp = event.timestamp;
      if (event.type === 'play' || event.type === 'pause') updates.playback_state = event.type === 'play' ? 'playing' : 'paused';
      if (event.type === 'speed') updates.playback_speed = event.playback_speed;
      if (event.type === 'episode') {
        updates.current_episode = event.episode;
        updates.current_episode_number = parseInt(event.episode?.replace(/\D/g, '') || '0') || null;
      }
      
      await redisService.setRoomState(roomId, {
        ...roomState,
        ...updates,
      });

      socket.to(roomId).emit('sync:event', { ...enrichedEvent, clock });

      if (['play', 'seek', 'episode'].includes(event.type)) {
        socket.to(roomId).emit('sync:state', {
          timestamp: event.timestamp,
          playback_state: updates.playback_state || roomState?.playback_state || 'paused',
          speed: updates.playback_speed || roomState?.playback_speed || 1,
          episode: updates.current_episode || roomState?.current_episode || null,
          episode_number: updates.current_episode_number || roomState?.current_episode_number || null,
        });
      }

      logger.debug(`Sync event from ${socket.userId} in ${roomId}: ${event.type}`);
    } catch (error) {
      logger.error('Sync event error:', error);
    }
  });

  // Handle anime:set_episode
  socket.on('anime:set_episode', async ({ roomId, mediaId, episode }) => {
    try {
      if (!socket.userId) return;
      const roomState = await redisService.getRoomState(roomId);
      const isHost = roomState?.host_id === socket.userId;
      if (!isHost) {
        return socket.emit('error', { code: 'NOT_HOST', message: 'Only host can change episodes' });
      }

      const updates = {
        current_episode: `Episode ${episode}`,
        current_episode_number: episode,
        current_timestamp: 0,
        anime_media_id: mediaId,
      };

      await redisService.setRoomState(roomId, { ...roomState, ...updates });
      await supabase.from('rooms').update({
        current_episode: `Episode ${episode}`,
        current_episode_number: episode,
        current_timestamp: 0,
        anime_media_id: mediaId,
      }).eq('id', roomId);

      io.to(roomId).emit('sync:event', {
        room_id: roomId,
        user_id: socket.userId,
        type: 'episode',
        timestamp: 0,
        episode: `Episode ${episode}`,
        server_time: Date.now(),
      });
      io.to(roomId).emit('sync:state', {
        timestamp: 0,
        playback_state: 'paused',
        speed: 1,
        episode: `Episode ${episode}`,
        episode_number: episode,
      });
    } catch (error) {
      logger.error('Set episode error:', error);
    }
  });

  // Handle sync lock
  socket.on('sync:lock', async ({ enabled }) => {
    try {
      if (!socket.userId) return;
      const rooms = await redisService.getClient().sMembers(`user:${socket.userId}:rooms`);
      if (rooms.length === 0) return;
      const roomId = rooms[0];
      const roomState = await redisService.getRoomState(roomId);
      if (!roomState) return;
      const isHost = roomState?.host_id === socket.userId;
      if (!isHost) return socket.emit('error', { code: 'NOT_HOST', message: 'Only host can toggle sync lock' });

      await redisService.setRoomState(roomId, { ...roomState, sync_lock: enabled });
      io.to(roomId).emit('room:update', { sync_lock: enabled } as any);
    } catch (error) {
      logger.error('Sync lock error:', error);
    }
  });

  // Handle host takeover
  socket.on('sync:takeover', async ({ roomId }) => {
    try {
      const roomState = await redisService.getRoomState(roomId);
      if (!roomState) return;
      
      // Verify current host disconnected
      const roomUsers = await redisService.getRoomUsers(roomId);
      if (!roomUsers.includes(roomState.host_id)) {
        io.to(roomId).emit('sync:takeover', { newHostId: socket.userId, timestamp: Date.now() });
        await redisService.setRoomState(roomId, { ...roomState, host_id: socket.userId });
        await supabase.from('rooms').update({ host_id: socket.userId }).eq('id', roomId);
        io.to(roomId).emit('room:new_host', { newHostId: socket.userId });
        startHostHeartbeat(roomId);
      }
    } catch (error) {
      logger.error('Takeover error:', error);
    }
  });

  socket.on('sync:request', async ({ roomId }: { roomId: string }) => {
    try {
      const state = await redisService.getRoomState(roomId);
      if (state) {
        socket.emit('sync:state', {
          timestamp: state.current_timestamp || 0,
          playback_state: state.playback_state || 'paused',
          speed: state.playback_speed || 1,
          episode: state.current_episode || null,
          episode_number: state.current_episode_number || null,
        });
      }
    } catch (error) {
      logger.error('Sync request error:', error);
    }
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    stopHostHeartbeat();
    rttMap.delete(socket.id);
    logicalClocks.delete(socket.id);
  });
}
