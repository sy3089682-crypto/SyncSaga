'use client';

import { useCallback, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getSocket } from '@/lib/socket';

export function useRoom(roomId: string) {
  const { currentRoom, messages, roomMembers, setCurrentRoom, setMessages, setRoomMembers, addMessage, addRoomMember, removeRoomMember, updateRoomState } = useAppStore();

  const join = useCallback(async () => {
    try {
      const socket = await getSocket();
      socket.emit('room:join', { roomId });
      socket.emit('sync:request', { roomId });
    } catch (e) { console.error('join failed', e); }
  }, [roomId]);

  const leave = useCallback(async () => {
    try {
      const socket = await getSocket();
      socket.emit('room:leave', { roomId });
    } catch (e) { console.error('leave failed', e); }
    setCurrentRoom(null);
    setMessages([]);
    setRoomMembers([]);
  }, [roomId, setCurrentRoom, setMessages, setRoomMembers]);

  const sendMessage = useCallback(async (content: string, type: 'text' | 'gif' | 'reaction' = 'text') => {
    try {
      const socket = await getSocket();
      socket.emit('chat:message', { roomId, content, type });
    } catch (e) { console.error('sendMessage failed', e); }
  }, [roomId]);

  const sendTyping = useCallback(async (isTyping: boolean) => {
    try {
      const socket = await getSocket();
      socket.emit('chat:typing', { roomId, isTyping });
    } catch (e) { console.error('sendTyping failed', e); }
  }, [roomId]);

  const sendSyncEvent = useCallback(async (event: { type: string; timestamp: number; playback_speed?: number; episode?: string }) => {
    try {
      const socket = await getSocket();
      socket.emit('sync:event', { room_id: roomId, ...event });
    } catch (e) { console.error('sendSyncEvent failed', e); }
  }, [roomId]);

  const sendReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      const socket = await getSocket();
      socket.emit('chat:reaction', { messageId, emoji });
    } catch (e) { console.error('sendReaction failed', e); }
  }, []);

  return { currentRoom, messages, roomMembers, join, leave, sendMessage, sendTyping, sendSyncEvent, sendReaction };
}
