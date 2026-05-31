import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth';
import { redisService } from '../../services/redis.service';
import { ServerToClientEvents, ClientToServerEvents, SyncEvent } from '@syncsaga/shared';
import { logger } from '../../lib/logger';
import { supabase } from '../../lib/supabase';

const rttMap = new Map<string, { pingTime: number; rtt: number }>();
const logicalClocks = new Map<string, number>();
const HEARTBEAT_INTERVAL = parseInt(process.env.SYNC_HEARTBEAT_INTERVAL || '5000', 10);
const DRIFT_SYNCED = parseFloat(process.env.DRIFT_SYNCED_THRESHOLD || '0.5');
const DRIFT_SLIGHT = parseFloat(process.env.DRIFT_SLIGHT_THRESHOLD || '2.0');

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
    if (drift < DRIFT_SYNCED) status = 'synced';
    else if (drift <= DRIFT_SLIGHT) status = 'slight';
    else status = 'desynced';
    io.to(roomId).emit('sync:drift_update', { userId: socket.userId, drift, status });
  }

  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  async function startHostHeartbeat(roomId: string) {
    stopHostHeartbeat();
    heartbeatInterval = setInterval(async () => {
      try {
        const state = await redisService.getRoomState(roomId);
        if (state) {
          io.to(roomId).emit('sync:state', {
            timestamp: state.playback_position || 0,
            playback_state: state.playback_state || 'paused',
            speed: state.playback_speed || 1,
            episode: state.current_episode || null,
            episode_number: state.current_episode_number || null,
          });
        }
      } catch (e) {
        logger.error(e, 'Heartbeat error:');
      }
    }, HEARTBEAT_INTERVAL);
  }

  function stopHostHeartbeat() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
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
      if (!roomId) return;

      const roomUsers = await redisService.getRoomUsers(roomId);
      if (!roomUsers.includes(socket.userId)) {
        return socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Not in room' });
      }

      const roomState = await redisService.getRoomState(roomId) || {};
      const isHost = (roomState as any).host_id === socket.userId ||
                     (roomState as any).co_hosts?.includes(socket.userId);

      if (roomState?.sync_lock && !isHost) {
        return;
      }

      const clock = tickClock();
      const serverTime = Date.now();

      const enrichedEvent: SyncEvent = { ...event, server_time: serverTime };

      const updates: any = { last_sync_at: serverTime };
      if (event.type === 'seek') {
        updates.playback_position = event.timestamp;
        updates.playback_state = 'playing';
      }
      if (event.type === 'play') updates.playback_state = 'playing';
      if (event.type === 'pause') updates.playback_state = 'paused';
      if (event.type === 'speed') updates.playback_speed = event.playback_speed;
      if (event.type === 'episode' && event.episode) {
        updates.current_episode = event.episode;
        updates.current_episode_number = parseInt(event.episode.replace(/\D/g, '') || '0') || null;
      }


      await redisService.setRoomState(roomId, { ...roomState, ...updates });
      socket.to(roomId).emit('sync:event', { ...enrichedEvent, clock });

      if (['play', 'seek', 'episode'].includes(event.type)) {
        const merged = { ...roomState, ...updates };
        socket.to(roomId).emit('sync:state', {
          timestamp: event.type === 'seek' ? (event.timestamp ?? (merged.playback_position || 0)) : (merged.playback_position || 0),
          playback_state: merged.playback_state || 'paused',
          speed: merged.playback_speed || 1,
          episode: merged.current_episode || null,
          episode_number: merged.current_episode_number || null,
        });
      }
    } catch (error) {
      logger.error(error, 'Sync event error:');
    }
  });

  socket.on('anime:set_episode', async ({ roomId, mediaId, episode }) => {
    try {
      if (!socket.userId || !roomId) return;
      const roomState = await redisService.getRoomState(roomId) || {};
      const isHost = roomState.host_id === socket.userId;
      if (!isHost) {
        return socket.emit('error', { code: 'NOT_HOST', message: 'Only host can change episodes' });
      }

      const updates = {
        current_episode: `Episode ${episode}`,
        current_episode_number: episode,
        playback_position: 0,
        anime_media_id: mediaId,
      };

      await redisService.setRoomState(roomId, { ...roomState, ...updates });

      try {
        await supabase.from('rooms').update(updates).eq('id', roomId);
      } catch (dbErr) {
        logger.error(dbErr, 'Failed to update episode in DB:');
      }

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
      logger.error(error, 'Set episode error:');
    }
  });

  socket.on('sync:lock', async ({ roomId, enabled }) => {
    try {
      if (!socket.userId || !roomId) return;
      const roomState = await redisService.getRoomState(roomId);
      if (!roomState) return;
      const isHost = roomState.host_id === socket.userId;
      if (!isHost) return socket.emit('error', { code: 'NOT_HOST', message: 'Only host can toggle sync lock' });

      await redisService.setRoomState(roomId, { ...roomState, sync_lock: enabled });
      io.to(roomId).emit('room:update', { sync_lock: enabled });
    } catch (error) {
      logger.error(error, 'Sync lock error:');
    }
  });

  socket.on('sync:takeover', async ({ roomId }) => {
    try {
      if (!roomId) return;
      const roomState = await redisService.getRoomState(roomId);
      if (!roomState) return;

      const roomUsers = await redisService.getRoomUsers(roomId);
      if (roomState.host_id && !roomUsers.includes(roomState.host_id)) {
        io.to(roomId).emit('sync:takeover', { newHostId: socket.userId, timestamp: Date.now() });
        await redisService.setRoomState(roomId, { ...roomState, host_id: socket.userId });
        try {
          await supabase.from('rooms').update({ host_id: socket.userId }).eq('id', roomId);
        } catch {}
        io.to(roomId).emit('room:new_host', { newHostId: socket.userId });
        startHostHeartbeat(roomId);
      }
    } catch (error) {
      logger.error(error, 'Takeover error:');
    }
  });

  socket.on('sync:request', async ({ roomId }: { roomId: string }) => {
    try {
      if (!roomId) return;
      const state = await redisService.getRoomState(roomId);
      if (state) {
        socket.emit('sync:state', {
          timestamp: state.playback_position || 0,
          playback_state: state.playback_state || 'paused',
          speed: state.playback_speed || 1,
          episode: state.current_episode || null,
          episode_number: state.current_episode_number || null,
        });
      }
    } catch (error) {
      logger.error(error, 'Sync request error:');
    }
  });

  socket.on('disconnect', () => {
    stopHostHeartbeat();
    rttMap.delete(socket.id);
    logicalClocks.delete(socket.id);
  });
}
