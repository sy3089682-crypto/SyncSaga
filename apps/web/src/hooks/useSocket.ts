'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getSocket, disconnectSocket, getSocketSync } from '@/lib/socket';

/**
 * useSocket — establishes and manages the Socket.IO connection.
 *
 * Automatically connects when a token is available and registers
 * global event handlers for room state, chat, sync, and presence.
 *
 * @param token - The Supabase access token (null = not authenticated)
 */
export function useSocket(token?: string | null) {
  const {
    setCurrentRoom,
    addMessage,
    updatePresence,
    addRoomMember,
    removeRoomMember,
    setRoomMembers,
    updateRoomState,
  } = useAppStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (!token || initialized.current) return;
    initialized.current = true;

    let cancelled = false;
    let socket: Awaited<ReturnType<typeof getSocket>> | null = null;

    (async () => {
      try {
        socket = await getSocket();
        if (cancelled) return;

        socket.on('room:state', (room) => {
          try {
            setCurrentRoom(room);
            setRoomMembers(room.members || []);
          } catch (e) {
            console.error('Error handling room:state:', e);
          }
        });

        socket.on('room:user_joined', (user) => {
          try {
            addRoomMember({
              id: '',
              room_id: '',
              user_id: user.id,
              role: 'member',
              joined_at: new Date().toISOString(),
            });
            updatePresence({ user_id: user.id, status: 'online' });
          } catch (e) {
            console.error('Error handling room:user_joined:', e);
          }
        });

        socket.on('room:user_left', (userId) => {
          try {
            removeRoomMember(userId);
          } catch (e) {
            console.error('Error handling room:user_left:', e);
          }
        });

        socket.on('chat:message', (message) => {
          try {
            addMessage(message);
          } catch (e) {
            console.error('Error handling chat:message:', e);
          }
        });

        socket.on('sync:state', (state) => {
          try {
            updateRoomState({
              current_timestamp: state.timestamp,
              playback_state: state.playback_state as any,
              playback_speed: state.speed,
              current_episode: state.episode,
            });
          } catch (e) {
            console.error('Error handling sync:state:', e);
          }
        });

        socket.on('presence:update', (event) => {
          try {
            updatePresence(event);
          } catch (e) {
            console.error('Error handling presence:update:', e);
          }
        });
      } catch (e) {
        console.error('Socket initialization error:', e);
      }
    })();

    return () => {
      cancelled = true;
      if (socket) {
        socket.off('room:state');
        socket.off('room:user_joined');
        socket.off('room:user_left');
        socket.off('chat:message');
        socket.off('sync:state');
        socket.off('presence:update');
      }
    };
  }, [token]);
}

/**
 * useSocketConnection — manages connect/disconnect lifecycle.
 */
export function useSocketConnection(token: string | null) {
  useEffect(() => {
    if (!token) return;

    let socket: Awaited<ReturnType<typeof getSocket>> | null = null;
    let cancelled = false;

    (async () => {
      try {
        socket = await getSocket();
        if (cancelled) return;
        socket.connect();
      } catch (e) {
        console.error('Socket connection error:', e);
      }
    })();

    return () => {
      cancelled = true;
      disconnectSocket();
    };
  }, [token]);
}
