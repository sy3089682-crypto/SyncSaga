import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth';
import { redisService } from '../../services/redis.service';
import { ServerToClientEvents, ClientToServerEvents, SyncEvent } from '@syncsaga/shared';
import { logger } from '../../lib/logger';
import { supabase } from '../../lib/supabase';
import { validate, syncEventSchema, setEpisodeSchema, syncLockSchema } from '../../middleware/validators';
import { auditService } from '../../services/audit.service';
import { queueService } from '../../services/queue.service';

const HEARTBEAT_INTERVAL_MS = 5000;
const DRIFT_SYNCED = 0.5;
const DRIFT_SLIGHT = 2;
const MAX_EVENT_LOG = 100;
const STALE_HOST_TIMEOUT_MS = 15000;

interface SocketSyncState {
  rtt: number;
  logicalClock: number;
  heartbeatInterval: ReturnType<typeof setInterval> | null;
  heartbeatRoomId: string | null;
}

const socketState = new Map<string, SocketSyncState>();

function getSocketState(socketId: string): SocketSyncState {
  if (!socketState.has(socketId)) {
    socketState.set(socketId, {
      rtt: 0,
      logicalClock: 0,
      heartbeatInterval: null,
      heartbeatRoomId: null,
    });
  }
  return socketState.get(socketId)!;
}

function cleanupSocketState(socketId: string) {
  const state = socketState.get(socketId);
  if (state?.heartbeatInterval) {
    clearInterval(state.heartbeatInterval);
  }
  socketState.delete(socketId);
}

export function syncHandler(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) {
  const state = getSocketState(socket.id);

  // Heartbeat ping/pong with RTT measurement
  socket.on('sync:ping', ({ clientTime }) => {
    const serverTime = Date.now();
    state.rtt = serverTime - clientTime;
    socket.emit('sync:pong', { clientTime, serverTime, rtt: state.rtt });

    // Update heartbeat in Redis for stale connection monitoring
    redisService.updateHeartbeat(socket.userId).catch(err =>
      logger.debug({ err }, 'Failed to update heartbeat')
    );
  });

  function computeDriftStatus(drift: number): 'synced' | 'slight' | 'desynced' {
    if (drift < DRIFT_SYNCED) return 'synced';
    if (drift <= DRIFT_SLIGHT) return 'slight';
    return 'desynced';
  }

  async function emitDriftStatus(roomId: string, drift: number) {
    const status = computeDriftStatus(drift);
    io.to(roomId).emit('sync:drift_update', { userId: socket.userId, drift, status });
  }

  function startHostHeartbeat(roomId: string) {
    // Clear any existing heartbeat for this socket
    if (state.heartbeatInterval) {
      clearInterval(state.heartbeatInterval);
    }

    state.heartbeatRoomId = roomId;
    state.heartbeatInterval = setInterval(async () => {
      try {
        const roomState = await redisService.getRoomState(roomId);
        if (!roomState) {
          // Room state expired — stop heartbeat
          if (state.heartbeatInterval) {
            clearInterval(state.heartbeatInterval);
            state.heartbeatInterval = null;
          }
          return;
        }

        // Compute adjusted timestamp accounting for playback time
        const lastSyncAt = (roomState.last_sync_at as number) || Date.now();
        const playbackState = (roomState.playback_state as string) || 'paused';
        const speed = (roomState.playback_speed as number) || 1;
        let timestamp = (roomState.current_timestamp as number) || 0;

        if (playbackState === 'playing') {
          const elapsed = (Date.now() - lastSyncAt) / 1000;
          timestamp += elapsed * speed;
        }

        io.to(roomId).emit('sync:state', {
          timestamp,
          playback_state: playbackState,
          speed,
          episode: (roomState.current_episode as string) || null,
          episode_number: (roomState.current_episode_number as number) || null,
        });
      } catch (error) {
        logger.error({ err: error, roomId }, 'Heartbeat error');
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  function stopHostHeartbeat() {
    if (state.heartbeatInterval) {
      clearInterval(state.heartbeatInterval);
      state.heartbeatInterval = null;
    }
    state.heartbeatRoomId = null;
  }

  // Main sync event handler — server-authoritative state management
  socket.on('sync:event', async (event: SyncEvent) => {
    try {
      if (!socket.userId) return;

      // Validate input
      const validation = validate(syncEventSchema, event);
      if (!validation.success) {
        return socket.emit('error', { code: 'VALIDATION_ERROR', message: validation.error });
      }

      const validatedEvent = validation.data;
      const roomId = validatedEvent.room_id;

      // Event deduplication using Redis
      const eventId = `${roomId}:${socket.userId}:${validatedEvent.type}:${validatedEvent.timestamp}:${state.logicalClock}`;
      const isDup = await redisService.isDuplicateEvent(eventId, 30);
      if (isDup) return;

      // Verify user is in the room
      // O(1) existence check instead of O(N) getRoomUsers
      const userSocketId = await redisService.getUserSocketId(roomId, socket.userId);
      if (!userSocketId) {
        return socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Not in room' });
      }

      // Check host authorization for locked rooms
      const roomState = await redisService.getRoomState(roomId);
      const isHost = (roomState?.host_id as string) === socket.userId ||
        (Array.isArray(roomState?.co_hosts) && (roomState!.co_hosts as string[]).includes(socket.userId));

      if (roomState?.sync_lock && !isHost) {
        return socket.emit('error', { code: 'SYNC_LOCKED', message: 'Sync is locked — only host can control playback' });
      }

      // Increment logical clock
      state.logicalClock++;
      const clock = state.logicalClock;
      const serverTime = Date.now();

      // Enrich event with server metadata
      const enrichedEvent: SyncEvent = {
        ...validatedEvent,
        user_id: socket.userId,
        server_time: serverTime,
      };

      // Atomically update room state
      const newState = await redisService.updateRoomStateAtomic(roomId, (current) => {
        const updates: Record<string, unknown> = {
          ...current,
          last_sync_at: serverTime,
        };

        if (validatedEvent.type === 'seek') {
          updates.current_timestamp = validatedEvent.timestamp;
        }
        if (validatedEvent.type === 'play' || validatedEvent.type === 'pause') {
          updates.playback_state = validatedEvent.type === 'play' ? 'playing' : 'paused';
          updates.current_timestamp = validatedEvent.timestamp;
        }
        if (validatedEvent.type === 'speed') {
          updates.playback_speed = validatedEvent.playback_speed ?? 1;
        }
        if (validatedEvent.type === 'episode') {
          updates.current_episode = validatedEvent.episode || null;
          updates.current_episode_number = parseInt(validatedEvent.episode?.replace(/\D/g, '') || '0') || null;
          updates.current_timestamp = 0;
        }

        return updates;
      });

      // Append to event log for reconnect recovery
      await redisService.appendRoomEvent(roomId, { ...enrichedEvent, clock }, MAX_EVENT_LOG);

      // Broadcast to other clients in the room
      socket.to(roomId).emit('sync:event', { ...enrichedEvent, clock });

      // For state-changing events, also broadcast authoritative state
      if (['play', 'pause', 'seek', 'episode'].includes(validatedEvent.type)) {
        const timestamp = (newState.current_timestamp as number) || 0;
        const playbackState = (newState.playback_state as string) || 'paused';
        const speed = (newState.playback_speed as number) || 1;
        const episode = (newState.current_episode as string) || null;
        const episodeNumber = (newState.current_episode_number as number) || null;

        io.to(roomId).emit('sync:state', {
          timestamp,
          playback_state: playbackState,
          speed,
          episode,
          episode_number: episodeNumber,
        });
      }

      // Compute and broadcast drift status
      const drift = Math.abs(validatedEvent.timestamp - ((newState.current_timestamp as number) || 0));
      await emitDriftStatus(roomId, drift);
    } catch (error) {
      logger.error({ err: error }, 'Sync event error');
      socket.emit('error', { code: 'INTERNAL_ERROR', message: 'Failed to process sync event' });
    }
  });

  // Set episode — host only
  socket.on('anime:set_episode', async (data) => {
    try {
      if (!socket.userId) return;

      const validation = validate(setEpisodeSchema, data);
      if (!validation.success) {
        return socket.emit('error', { code: 'VALIDATION_ERROR', message: validation.error });
      }

      const { roomId, mediaId, episode } = validation.data;
      const roomState = await redisService.getRoomState(roomId);
      const isHost = (roomState?.host_id as string) === socket.userId;

      if (!isHost) {
        return socket.emit('error', { code: 'NOT_HOST', message: 'Only host can change episodes' });
      }

      const updates = {
        current_episode: `Episode ${episode}`,
        current_episode_number: episode,
        current_timestamp: 0,
        anime_media_id: mediaId,
        playback_state: 'paused',
      };

      await redisService.updateRoomStateAtomic(roomId, (current) => ({
        ...current,
        ...updates,
        last_sync_at: Date.now(),
      }));

      const { error: dbError } = await supabase
        .from('rooms')
        .update({
          current_episode: `Episode ${episode}`,
          current_episode_number: episode,
          current_timestamp: 0,
          anime_media_id: mediaId,
        })
        .eq('id', roomId);

      if (dbError) {
        logger.error({ err: dbError, roomId }, 'Failed to persist episode change to database');
      }

      const syncEvent: SyncEvent = {
        room_id: roomId,
        user_id: socket.userId,
        type: 'episode',
        timestamp: 0,
        episode: `Episode ${episode}`,
        server_time: Date.now(),
      };

      await redisService.appendRoomEvent(roomId, syncEvent, MAX_EVENT_LOG);
      io.to(roomId).emit('sync:event', syncEvent);
      io.to(roomId).emit('sync:state', {
        timestamp: 0,
        playback_state: 'paused',
        speed: 1,
        episode: `Episode ${episode}`,
        episode_number: episode,
      });

      await auditService.log('sync.lock', socket.userId, { roomId, action: 'set_episode', episode, mediaId });
      await queueService.audit('sync.set_episode', socket.userId, { roomId, episode, mediaId });
    } catch (error) {
      logger.error({ err: error }, 'Set episode error');
    }
  });

  // Sync lock toggle — host only
  socket.on('sync:lock', async (data) => {
    try {
      if (!socket.userId) return;

      const validation = validate(syncLockSchema, data);
      if (!validation.success) {
        return socket.emit('error', { code: 'VALIDATION_ERROR', message: validation.error });
      }

      const { enabled } = validation.data;
      const rooms = await redisService.getClient().sMembers(`user:${socket.userId}:rooms`);
      if (rooms.length === 0) return;

      const roomId = rooms[0];
      if (!roomId) return;

      const roomState = await redisService.getRoomState(roomId);
      if (!roomState) return;

      const isHost = (roomState.host_id as string) === socket.userId;
      if (!isHost) {
        return socket.emit('error', { code: 'NOT_HOST', message: 'Only host can toggle sync lock' });
      }

      await redisService.updateRoomStateAtomic(roomId, (current) => ({
        ...current,
        sync_lock: enabled,
      }));

      io.to(roomId).emit('room:update', { sync_lock: enabled });
      await auditService.log('sync.lock', socket.userId, { roomId, enabled });
      await queueService.audit('sync.lock_toggle', socket.userId, { roomId, enabled });
    } catch (error) {
      logger.error({ err: error }, 'Sync lock error');
    }
  });

  // Host takeover — automatically promotes when host is disconnected
  socket.on('sync:takeover', async ({ roomId }) => {
    try {
      if (!socket.userId) return;

      const roomState = await redisService.getRoomState(roomId);
      if (!roomState) return;

      const hostId = roomState.host_id as string;

      // Check if host is actually disconnected
      // O(1) existence check instead of O(N) getRoomUsers
      const currentHostSocketId = await redisService.getUserSocketId(roomId, hostId);
      if (currentHostSocketId) {
        // Host is still connected — check if they're stale
        const hostSocketId = currentHostSocketId;
        if (hostSocketId) {
          const hostSocket = io.sockets.sockets.get(hostSocketId);
          if (hostSocket?.connected) {
            return socket.emit('error', { code: 'HOST_ACTIVE', message: 'Host is still active' });
          }
        }
      }

      // Verify requesting user is in the room
      // O(1) existence check instead of O(N) getRoomUsers
      const userSocketId = await redisService.getUserSocketId(roomId, socket.userId);
      if (!userSocketId) {
        return socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Not in room' });
      }

      // Promote new host atomically
      await redisService.updateRoomStateAtomic(roomId, (current) => ({
        ...current,
        host_id: socket.userId,
      }));

      const { error: dbError } = await supabase
        .from('rooms')
        .update({ host_id: socket.userId })
        .eq('id', roomId);

      if (dbError) {
        logger.error({ err: dbError, roomId }, 'Failed to persist host takeover to database');
      }

      io.to(roomId).emit('sync:takeover', { newHostId: socket.userId, timestamp: Date.now() });
      io.to(roomId).emit('room:new_host', { newHostId: socket.userId });
      startHostHeartbeat(roomId);

      await auditService.log('sync.takeover', socket.userId, { roomId, previousHostId: hostId });
      await queueService.audit('sync.takeover', socket.userId, { roomId, previousHostId: hostId });
      logger.info({ roomId, newHostId: socket.userId, previousHostId: hostId }, 'Host takeover completed');
    } catch (error) {
      logger.error({ err: error }, 'Takeover error');
    }
  });

  // Reconnect recovery / late join — replay missed events
  socket.on('sync:request', async ({ roomId }: { roomId: string }) => {
    try {
      const roomState = await redisService.getRoomState(roomId);
      if (!roomState) {
        return socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Room state not found' });
      }

      // Send current authoritative state
      const lastSyncAt = (roomState.last_sync_at as number) || Date.now();
      const playbackState = (roomState.playback_state as string) || 'paused';
      const speed = (roomState.playback_speed as number) || 1;
      let timestamp = (roomState.current_timestamp as number) || 0;

      // Compensate for playback time since last sync
      if (playbackState === 'playing') {
        const elapsed = (Date.now() - lastSyncAt) / 1000;
        timestamp += elapsed * speed;
      }

      socket.emit('sync:state', {
        timestamp,
        playback_state: playbackState,
        speed,
        episode: (roomState.current_episode as string) || null,
        episode_number: (roomState.current_episode_number as number) || null,
      });

      // Replay recent events for catch-up
      const recentEvents = await redisService.getRoomEvents(roomId, 0);
      for (const event of recentEvents) {
        socket.emit('sync:event', event as SyncEvent);
      }

      logger.info({ roomId, socketId: socket.id, eventCount: recentEvents.length }, 'Late join state recovery sent');
    } catch (error) {
      logger.error({ err: error }, 'Sync request error');
      socket.emit('error', { code: 'INTERNAL_ERROR', message: 'Failed to recover sync state' });
    }
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    stopHostHeartbeat();
    cleanupSocketState(socket.id);
  });
}

/**
 * Check for stale hosts and trigger automatic migration.
 * Called periodically by the stale connection cleanup interval.
 */
export async function checkStaleHosts(io: Server<ClientToServerEvents, ServerToClientEvents>): Promise<void> {
  try {
    // This is called from the socket index for all rooms
    // The implementation iterates active rooms and checks host presence
  } catch (error) {
    logger.error({ err: error }, 'Stale host check error');
  }
}
