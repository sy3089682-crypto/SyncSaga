'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getSocket, disconnectSocket } from '@/lib/socket';

export function useSocket(token?: string | null) {
  const { setCurrentRoom, addMessage, updatePresence, addRoomMember, removeRoomMember, setRoomMembers, updateRoomState } = useAppStore();
  const initialized = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!token || initialized.current) return;
    initialized.current = true;

    const socket = getSocket(token);

    const onRoomState = (room: any) => {
      try {
        setCurrentRoom(room);
        setRoomMembers(room.members || []);
      } catch {}
    };

    const onUserJoined = (user: any) => {
      try {
        addRoomMember({ id: '', room_id: '', user_id: user.id, role: 'member', joined_at: new Date().toISOString() });
        updatePresence({ user_id: user.id, status: 'online' });
      } catch {}
    };

    const onUserLeft = (userId: string) => {
      try { removeRoomMember(userId); } catch {}
    };

    const onChatMessage = (message: any) => {
      try { addMessage(message); } catch {}
    };

    const onSyncState = (state: any) => {
      try {
        updateRoomState({
          playback_position: state.timestamp,
          playback_state: state.playback_state as any,
          playback_speed: state.speed,
          episode_number: state.episode_number,
        });
      } catch {}
    };

    const onPresenceUpdate = (event: any) => {
      try { updatePresence(event); } catch {}
    };

    const onSyncDrift = (data: any) => {
      try {
        useAppStore.getState().setDriftStatus(data.userId, { drift: data.drift, status: data.status });
      } catch {}
    };

    const onReactionNew = (reaction: any) => {
      try { (useAppStore.getState() as any).addTimelineReaction?.(reaction); } catch {}
    };

    socket.on('room:state', onRoomState);
    socket.on('room:user_joined', onUserJoined);
    socket.on('room:user_left', onUserLeft);
    socket.on('chat:message', onChatMessage);
    socket.on('sync:state', onSyncState);
    socket.on('sync:drift_update', onSyncDrift);
    socket.on('presence:update', onPresenceUpdate);
    socket.on('reaction:new', onReactionNew);
    socket.on('disconnect', () => {
      try { (useAppStore.getState() as any).setConnectionStatus?.('disconnected'); } catch {}
    });
    socket.on('connect', () => {
      try { (useAppStore.getState() as any).setConnectionStatus?.('connected'); } catch {}
    });
    (socket as any).on('reconnect_attempt', () => {
      try { (useAppStore.getState() as any).setConnectionStatus?.('reconnecting'); } catch {}
    });

    cleanupRef.current = () => {
      socket.off('room:state', onRoomState);
      socket.off('room:user_joined', onUserJoined);
      socket.off('room:user_left', onUserLeft);
      socket.off('chat:message', onChatMessage);
      socket.off('sync:state', onSyncState);
      socket.off('sync:drift_update', onSyncDrift);
      socket.off('presence:update', onPresenceUpdate);
      socket.off('reaction:new', onReactionNew);
      socket.off('disconnect');
      socket.off('connect');
      (socket as any).off('reconnect_attempt');
    };

    socket.on('room:user_left', (userId: string) => {
      removeRoomMember(userId);
    });

    socket.on('chat:message', (message: any) => {
      addMessage(message);
    });

    socket.on('sync:state', (state: any) => {
      updateRoomState({
        playback_position: state.timestamp,
        playback_state: state.playback_state as any,
        playback_speed: state.speed,
        episode_number: state.episode_number,
      });
    });

    socket.on('presence:update', (event: any) => {
      updatePresence(event);
    });

    return () => {
      if (cleanupRef.current) cleanupRef.current();
      cleanupRef.current = null;
      initialized.current = false;
    };
  }, [token, setCurrentRoom, addMessage, updatePresence, addRoomMember, removeRoomMember, setRoomMembers, updateRoomState]);
}

export function useSocketConnection(token: string | null) {
  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);
    socket.connect();

    return () => {
      disconnectSocket();
    };
  }, [token]);
}
