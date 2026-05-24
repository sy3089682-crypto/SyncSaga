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

const HEARTBEAT_INTERVAL = 5000;
const HARD_SEEK_THRESHOLD = 2;
const SPEED_ADJUST_MIN = 0.5;
const SPEED_ADJUST_MAX = 2;

export function useSyncEngine(roomId: string) {
  const { user } = useAppStore();
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rttSamples = useRef<number[]>([]);
  const lastHostState = useRef<SyncState | null>(null);
  const clientTimeRef = useRef(0);
  const hostTimeRef = useRef(0);

  const measureRTT = useCallback(() => {
    const socket = getSocket();
    const clientTime = Date.now();
    socket.emit('sync:ping', { clientTime });

    socket.once('sync:pong', (data) => {
      const now = Date.now();
      const rtt = now - data.clientTime;
      rttSamples.current.push(rtt);
      if (rttSamples.current.length > 10) rttSamples.current.shift();
    });
  }, []);

  const getAverageRTT = useCallback(() => {
    if (rttSamples.current.length === 0) return 50;
    return rttSamples.current.reduce((a, b) => a + b, 0) / rttSamples.current.length;
  }, []);

  const calculateDrift = useCallback((hostTimestamp: number) => {
    const now = Date.now();
    const networkLatency = getAverageRTT() / 2;
    const estimatedHostTime = hostTimestamp + (now - hostTimeRef.current);
    return Math.abs(clientTimeRef.current - estimatedHostTime - networkLatency) / 1000;
  }, [getAverageRTT]);

  useEffect(() => {
    if (!roomId || !user) return;

    const socket = getSocket();

    const onSyncState = (state: SyncState) => {
      lastHostState.current = state;
      hostTimeRef.current = Date.now();
      clientTimeRef.current = state.timestamp;

      const drift = calculateDrift(state.timestamp);

      if (drift > HARD_SEEK_THRESHOLD) {
        socket.emit('sync:event', {
          room_id: roomId,
          user_id: user.id,
          type: 'seek',
          timestamp: state.timestamp,
          server_time: Date.now(),
        });
      } else if (drift >= SPEED_ADJUST_MIN && drift <= SPEED_ADJUST_MAX) {
        const correctionSpeed = drift > 1 ? 1.05 : 0.95;
        socket.emit('sync:event', {
          room_id: roomId,
          user_id: user.id,
          type: 'speed',
          timestamp: state.timestamp,
          playback_speed: correctionSpeed,
          server_time: Date.now(),
        });
      }
    };

    socket.on('sync:state', onSyncState);

    pingIntervalRef.current = setInterval(measureRTT, 3000);

    return () => {
      socket.off('sync:state', onSyncState);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [roomId, user, calculateDrift, measureRTT]);
}
