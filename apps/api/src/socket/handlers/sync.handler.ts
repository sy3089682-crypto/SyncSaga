import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth';
import { redisService } from '../../services/redis.service';
import { ServerToClientEvents, ClientToServerEvents, SyncEvent } from '@syncsaga/shared';
import { logger } from '../../lib/logger';
import { supabase } from '../../lib/supabase';

const rttMap = new Map<string, { pingTime: number; rtt: number }>();
const logicalClocks = new Map<string, number>();
const heartbeatIntervals = new Map<string, ReturnType<typeof setInterval>>();
const recentEvents = new Map<string, number>();

function isDuplicate(eventKey: string): boolean {
  const now = Date.now();
  const last = recentEvents.get(eventKey);
  if (last && now - last < 500) return true;
  recentEvents.set(eventKey, now);
  if (recentEvents.size > 1000) {
    const keys = [...recentEvents.keys()].slice(0, 500);
    keys.forEach(k => recentEvents.delete(k));
  }
  return false;
}

export function syncHandler(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) {
  socket.on('sync:ping', ({ clientTime }) => {
    const serverTime = Date.now();
    socket.emit('sync:pong', { clientTime, serverTime, rtt: 0 });
    rttMap.set(socket.id, { pingTime: clientTime, rtt: serverTime - clientTime });
  });

  async function emitDriftStatus(roomId: string, drift: number) {
    let status: 'synced' | 'slight' | 'desynced';
    if (drift < 0.5) status = 'synced';
    else if (drift <= 2) status = 'slight';
    else status = 'desynced';
    io.to(roomId).emit('sync:drift_update', { userId: socket.userId, drift, status });
  }

  async function startHostHeartbeat(roomId: string) {
    stopHostHeartbeat(roomId);
    const interval = setInterval(async () => {
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
    heartbeatIntervals.set(socket.id, interval);
  }

  function stopHostHeartbeat(socketId?: string) {
    const id = socketId || socket.id;
    const interval = heartbeatIntervals.get(id);
    if (interval) {
      clearInterval(interval);
      heartbeatIntervals.delete(id);
    }
  }

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

      const dupKey = `${roomId}:${socket.userId}:${event.type}:${event.timestamp}`;
      if (isDuplicate(dupKey)) return;

      const roomUsers = await redisService.getRoomUsers(roomId);
      if (!roomUsers.includes(socket.userId)) {
        return socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Not in room' });
      }

      const roomState = await redisService.getRoomState(roomId);
      const isHost = roomState?.host_id === socket.userId ||
                     roomState?.co_hosts?.includes(socket.userId);

      if (roomState?.sync_lock && !isHost) {
        return;
      }

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
    } catch (error) {
      logger.error('Sync event error:', error);
    }
  });

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

  socket.on('sync:takeover', async ({ roomId }) => {
    try {
      const roomState = await redisService.getRoomState(roomId);
      if (!roomState) return;

      const roomUsers = await redisService.getRoomUsers(roomId);
      const isHostDisconnected = !roomUsers.includes(roomState.host_id);

      if (isHostDisconnected) {
        const hostSocketId = await redisService.getUserSocketId(roomId, roomState.host_id);
        if (!hostSocketId) {
          io.to(roomId).emit('sync:takeover', { newHostId: socket.userId, timestamp: Date.now() });
          await redisService.setRoomState(roomId, { ...roomState, host_id: socket.userId });
          await supabase.from('rooms').update({ host_id: socket.userId }).eq('id', roomId);
          io.to(roomId).emit('room:new_host', { newHostId: socket.userId });
          startHostHeartbeat(roomId);
        }
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

  socket.on('disconnect', () => {
    stopHostHeartbeat();
    rttMap.delete(socket.id);
    logicalClocks.delete(socket.id);
  });
}
