'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getSocket, disconnectSocket } from '@/lib/socket';
import { useRouter } from 'next/navigation';

export function useSocket(token?: string | null) {
  const { setCurrentRoom, addMessage, updatePresence, addRoomMember, removeRoomMember, setRoomMembers, updateRoomState } = useAppStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (!token || initialized.current) return;
    initialized.current = true;

    const socket = getSocket(token);

    socket.on('room:state', (room) => {
      setCurrentRoom(room);
      setRoomMembers(room.members || []);
    });

    socket.on('room:user_joined', (user) => {
      addRoomMember({ id: '', room_id: '', user_id: user.id, role: 'member', joined_at: new Date().toISOString() });
      updatePresence({ user_id: user.id, status: 'online' });
    });

    socket.on('room:user_left', (userId) => {
      removeRoomMember(userId);
    });

    socket.on('chat:message', (message: any) => {
      addMessage(message);
    });

    socket.on('sync:state', (state) => {
      updateRoomState({
        current_timestamp: state.timestamp,
        playback_state: state.playback_state as any,
        playback_speed: state.speed,
        current_episode: state.episode,
      });
    });

    socket.on('presence:update', (event: any) => {
      updatePresence(event);
    });

    return () => {
      socket.off('room:state');
      socket.off('room:user_joined');
      socket.off('room:user_left');
      socket.off('chat:message');
      socket.off('sync:state');
      socket.off('presence:update');
    };
  }, [token]);
}

export function useSocketConnection(token: string | null) {
  const router = useRouter();

  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);
    socket.connect();

    return () => {
      disconnectSocket();
    };
  }, [token]);
}
