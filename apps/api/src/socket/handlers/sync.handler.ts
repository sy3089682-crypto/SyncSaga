import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth';
import { redisService } from '../../services/redis.service';
import { ServerToClientEvents, ClientToServerEvents, SyncEvent } from '@syncsaga/types';
import { logger } from '../../lib/logger';
import { supabase } from '../../lib/supabase';
import { formatZodError, roomIdPayloadSchema, setEpisodeSchema, syncEventSchema, syncLockSchema } from '../schemas';

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

  socket.on('sync:event', async (payload: SyncEvent) => {
    try {
      if (!socket.userId) return;
      const parsed = syncEventSchema.safeParse(payload);
      if (!parsed.success) {
        return socket.emit('error', { code: 'VALIDATION_ERROR', details: formatZodError(parsed.error) });
      }

      const event = { ...parsed.data, user_id: socket.userId } as SyncEvent;
      const roomId = event.room_id;

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
      await redisService.addEventToBuffer(roomId, enrichedEvent);
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

  socket.on('anime:set_episode', async (payload) => {
    try {
      const parsed = setEpisodeSchema.safeParse(payload);
      if (!parsed.success) {
        return socket.emit('error', { code: 'VALIDATION_ERROR', details: formatZodError(parsed.error) });
      }
      const { roomId, mediaId, episode } = parsed.data;
      if (!socket.userId) return;
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
      await redisService.addEventToBuffer(roomId, { room_id: roomId, user_id: socket.userId, type: 'episode', timestamp: 0, episode: `Episode ${episode}`, server_time: Date.now() });

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

  socket.on('sync:lock', async (payload) => {
    try {
      const parsed = syncLockSchema.safeParse(payload);
      if (!parsed.success) {
        return socket.emit('error', { code: 'VALIDATION_ERROR', details: formatZodError(parsed.error) });
      }
      const { roomId, enabled } = parsed.data;
      if (!socket.userId) return;
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

  socket.on('sync:takeover', async (payload) => {
    try {
      const parsed = roomIdPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return socket.emit('error', { code: 'VALIDATION_ERROR', details: formatZodError(parsed.error) });
      }
      const { roomId } = parsed.data;
      if (!socket.userId) return;

      const roomState = await redisService.getRoomState(roomId);
      if (!roomState) return;

      const acquired = await redisService.acquireHostTakeover(roomId, socket.userId, roomState.host_id);
      if (acquired) {
        io.to(roomId).emit('sync:takeover', { newHostId: socket.userId, timestamp: Date.now() });
        try {
          await supabase.from('rooms').update({ host_id: socket.userId }).eq('id', roomId);
        } catch (dbErr) {
          logger.error(dbErr, 'Failed to persist host takeover:');
        }
        io.to(roomId).emit('room:new_host', { newHostId: socket.userId });
        startHostHeartbeat(roomId);
      }
    } catch (error) {
      logger.error(error, 'Takeover error:');
    }
  });

  socket.on('sync:request', async (payload: { roomId: string }) => {
    try {
      const parsed = roomIdPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        return socket.emit('error', { code: 'VALIDATION_ERROR', details: formatZodError(parsed.error) });
      }
      const { roomId } = parsed.data;
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
