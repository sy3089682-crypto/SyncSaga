'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { useAppStore } from '@/store/useAppStore';

interface SyncState {
  timestamp: number;
  playback_state: 'playing' | 'paused' | 'buffering';
  speed: number;
  episode: string | null;
  episode_number: number | null;
}

const HEARTBEAT_INTERVAL = 3000;
const HARD_SEEK_THRESHOLD = 2; // seconds
const SOFT_DRIFT_MIN = 0.5; // seconds
const SOFT_DRIFT_MAX = 2; // seconds
const SPEED_CORRECTION_FAST = 1.05;
const SPEED_CORRECTION_SLOW = 0.95;
const MAX_RTT_SAMPLES = 20;

export interface SyncEngineCallbacks {
  onSeek?: (timestamp: number) => void;
  onPlaybackStateChange?: (state: 'playing' | 'paused') => void;
  onSpeedChange?: (speed: number) => void;
  onEpisodeChange?: (episode: string | null, episodeNumber: number | null) => void;
  getCurrentTime?: () => number;
  isPlaying?: () => boolean;
}

/**
 * useSyncEngine — deterministic synchronization engine.
 *
 * Implements:
 * - RTT measurement with exponential moving average
 * - Drift correction (hard seek for large drift, speed adjust for small)
 * - Heartbeat ping/pong for latency monitoring
 * - Reconnect recovery via sync:request
 * - Server-authoritative state following
 *
 * @param roomId - The room ID to sync with
 * @param callbacks - Optional callbacks to control the video player
 */
export function useSyncEngine(roomId: string, callbacks?: SyncEngineCallbacks) {
  const { user } = useAppStore();
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rttSamples = useRef<number[]>([]);
  const lastHostState = useRef<SyncState | null>(null);
  const clientTimeRef = useRef(0);
  const hostTimeRef = useRef(0);
  const isReconnectingRef = useRef(false);
  const lastEventClockRef = useRef(0);

  const measureRTT = useCallback(() => {
    (async () => {
      try {
        const socket = await getSocket();
        const clientTime = Date.now();
        socket.emit('sync:ping', { clientTime });

        socket.once('sync:pong', (data) => {
          const now = Date.now();
          const rtt = now - data.clientTime;
          rttSamples.current.push(rtt);
          if (rttSamples.current.length > MAX_RTT_SAMPLES) rttSamples.current.shift();
        });
      } catch (e) {
        // Socket not connected — will retry on next interval
      }
    })();
  }, []);

  const getAverageRTT = useCallback(() => {
    if (rttSamples.current.length === 0) return 50;
    // Use exponential moving average for more recent samples
    const samples = rttSamples.current;
    let ema = samples[0]!;
    const alpha = 2 / (samples.length + 1);
    for (let i = 1; i < samples.length; i++) {
      ema = alpha * samples[i]! + (1 - alpha) * ema;
    }
    return ema;
  }, []);

  const calculateDrift = useCallback((hostTimestamp: number) => {
    const now = Date.now();
    const networkLatency = getAverageRTT() / 2 / 1000; // seconds
    const elapsedSinceHostUpdate = (now - hostTimeRef.current) / 1000;
    const estimatedHostTime = hostTimestamp + elapsedSinceHostUpdate;
    const clientTime = callbacks?.getCurrentTime?.() ?? clientTimeRef.current;
    return Math.abs(clientTime - estimatedHostTime - networkLatency);
  }, [getAverageRTT, callbacks]);

  useEffect(() => {
    if (!roomId || !user) return;

    let cancelled = false;
    let socket: Awaited<ReturnType<typeof getSocket>> | null = null;

    (async () => {
      try {
        socket = await getSocket();
        if (cancelled) return;

        // Request initial state for late join / reconnect recovery
        socket.emit('sync:request', { roomId });

        const onSyncState = (state: SyncState) => {
          if (cancelled) return;
          lastHostState.current = state;
          hostTimeRef.current = Date.now();
          clientTimeRef.current = state.timestamp;

          // Apply playback state
          if (state.playback_state === 'playing' || state.playback_state === 'paused') {
            callbacks?.onPlaybackStateChange?.(state.playback_state);
          }

          // Apply episode change
          if (state.episode !== lastHostState.current?.episode) {
            callbacks?.onEpisodeChange?.(state.episode, state.episode_number);
          }

          const drift = calculateDrift(state.timestamp);

          if (drift > HARD_SEEK_THRESHOLD) {
            // Hard correction — seek to authoritative position
            callbacks?.onSeek?.(state.timestamp);
            clientTimeRef.current = state.timestamp;
          } else if (drift >= SOFT_DRIFT_MIN && drift <= SOFT_DRIFT_MAX) {
            // Soft correction — adjust playback speed slightly
            const correctionSpeed = drift > 1 ? SPEED_CORRECTION_FAST : SPEED_CORRECTION_SLOW;
            callbacks?.onSpeedChange?.(correctionSpeed);

            // Reset speed after 2 seconds
            setTimeout(() => {
              if (!cancelled) callbacks?.onSpeedChange?.(state.speed);
            }, 2000);
          }
        };

        const onSyncEvent = (event: {
          type: string;
          timestamp: number;
          playback_speed?: number;
          episode?: string;
          clock?: number;
        }) => {
          if (cancelled) return;

          // Replay protection — ignore events with older clocks
          if (event.clock && event.clock <= lastEventClockRef.current) return;
          if (event.clock) lastEventClockRef.current = event.clock;

          if (event.type === 'play') {
            callbacks?.onPlaybackStateChange?.('playing');
            callbacks?.onSeek?.(event.timestamp);
          } else if (event.type === 'pause') {
            callbacks?.onPlaybackStateChange?.('paused');
            callbacks?.onSeek?.(event.timestamp);
          } else if (event.type === 'seek') {
            callbacks?.onSeek?.(event.timestamp);
            clientTimeRef.current = event.timestamp;
          } else if (event.type === 'speed') {
            callbacks?.onSpeedChange?.(event.playback_speed ?? 1);
          } else if (event.type === 'episode') {
            callbacks?.onEpisodeChange?.(event.episode ?? null, null);
          }
        };

        const onDisconnect = () => {
          isReconnectingRef.current = true;
        };

        const onReconnect = () => {
          if (isReconnectingRef.current && socket) {
            isReconnectingRef.current = false;
            // Request full state recovery after reconnect
            socket.emit('sync:request', { roomId });
          }
        };

        socket.on('sync:state', onSyncState);
        socket.on('sync:event', onSyncEvent);
        socket.on('disconnect', onDisconnect);
        socket.on('connect', onReconnect);

        // Start heartbeat
        pingIntervalRef.current = setInterval(measureRTT, HEARTBEAT_INTERVAL);

        // Visibility change — re-sync when tab becomes visible again
        const onVisibilityChange = () => {
          if (document.visibilityState === 'visible' && socket) {
            socket.emit('sync:request', { roomId });
          }
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
          socket?.off('sync:state', onSyncState);
          socket?.off('sync:event', onSyncEvent);
          socket?.off('disconnect', onDisconnect);
          socket?.off('connect', onReconnect);
          document.removeEventListener('visibilitychange', onVisibilityChange);
        };
      } catch (e) {
        console.error('Sync engine initialization error:', e);
      }
    })();

    return () => {
      cancelled = true;
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [roomId, user, calculateDrift, measureRTT, callbacks]);
}
