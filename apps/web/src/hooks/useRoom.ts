'use client';

import { useCallback, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getSocket } from '@/lib/socket';

export function useRoom(roomId: string) {
  const { user, currentRoom, messages, roomMembers, setCurrentRoom, setMessages, setRoomMembers, addMessage, addRoomMember, removeRoomMember, updateRoomState } = useAppStore();

  const join = useCallback(() => {
    const socket = getSocket();
    socket.emit('room:join' as any, { roomId });
    socket.emit('sync:request' as any, { roomId });
  }, [roomId]);

  const leave = useCallback(() => {
    const socket = getSocket();
    socket.emit('room:leave' as any, { roomId });
    setCurrentRoom(null);
    setMessages([]);
    setRoomMembers([]);
  }, [roomId, setCurrentRoom, setMessages, setRoomMembers]);

  const sendMessage = useCallback((content: string, type: 'text' | 'gif' | 'reaction' = 'text') => {
    const socket = getSocket();
    socket.emit('chat:message' as any, { roomId, content, type });
  }, [roomId]);

  const sendTyping = useCallback((isTyping: boolean) => {
    const socket = getSocket();
    socket.emit('chat:typing' as any, { roomId, isTyping });
  }, [roomId]);

  const sendSyncEvent = useCallback((event: { type: 'play' | 'pause' | 'seek' | 'speed' | 'episode' | 'fullscreen' | 'buffering' | 'ready'; timestamp: number; playback_speed?: number; episode?: string }) => {
    const socket = getSocket();
    socket.emit('sync:event' as any, { room_id: roomId, user_id: user?.id || '', ...event });
  }, [roomId, user?.id]);

  const sendReaction = useCallback((messageId: string, emoji: string) => {
    const socket = getSocket();
    socket.emit('chat:reaction' as any, { messageId, emoji });
  }, []);

  return { currentRoom, messages, roomMembers, join, leave, sendMessage, sendTyping, sendSyncEvent, sendReaction };
}
