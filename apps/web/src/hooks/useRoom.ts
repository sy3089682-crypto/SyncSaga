'use client';

import { useCallback, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { getSocketSync, getSocket } from '@/lib/socket';

export function useRoom(roomId: string) {
  const { currentRoom, messages, roomMembers, setCurrentRoom, setMessages, setRoomMembers, addMessage, addRoomMember, removeRoomMember, updateRoomState } = useAppStore();

  const join = useCallback(() => {
    const socket = getSocketSync();
    socket?.emit('room:join', { roomId });
    socket?.emit('sync:request', { roomId });
    getSocket().then((sock) => {
      if (!socket?.connected) {
        sock.emit('room:join', { roomId });
        sock.emit('sync:request', { roomId });
      }
    }).catch(() => {});
  }, [roomId]);

  const leave = useCallback(() => {
    getSocket().then((sock) => sock.emit('room:leave', { roomId })).catch(() => {});
    setCurrentRoom(null);
    setMessages([]);
    setRoomMembers([]);
  }, [roomId, setCurrentRoom, setMessages, setRoomMembers]);

  const sendMessage = useCallback((content: string, type: 'text' | 'gif' | 'reaction' = 'text') => {
    getSocket().then((sock) => sock.emit('chat:message', { roomId, content, type })).catch(() => {});
  }, [roomId]);

  const sendTyping = useCallback((isTyping: boolean) => {
    getSocket().then((sock) => sock.emit('chat:typing', { roomId, isTyping })).catch(() => {});
  }, [roomId]);

  const sendSyncEvent = useCallback((event: { type: string; timestamp: number; playback_speed?: number; episode?: string }) => {
    getSocket().then((sock) => sock.emit('sync:event', { room_id: roomId, ...event })).catch(() => {});
  }, [roomId]);

  const sendReaction = useCallback((messageId: string, emoji: string) => {
    getSocket().then((sock) => sock.emit('chat:reaction', { messageId, emoji })).catch(() => {});
  }, []);

  return { currentRoom, messages, roomMembers, join, leave, sendMessage, sendTyping, sendSyncEvent, sendReaction };
}
