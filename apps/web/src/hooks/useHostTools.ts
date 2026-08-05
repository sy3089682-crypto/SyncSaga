'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

export interface ModeratorAction {
  id: string;
  moderatorId: string;
  moderatorUsername: string;
  targetUserId: string;
  targetUsername: string;
  action: 'kick' | 'ban' | 'mute' | 'unmute' | 'warn' | 'unban';
  reason?: string;
  timestamp: number;
  roomId: string;
}

export interface HostToolsState {
  canHost: boolean;
  canModerate: boolean;
  isMuted: boolean;
  isKicked: boolean;
  isBanned: boolean;
  slowMode: boolean;
  slowModeDelay: number; // seconds
  canSpeak: boolean;
  canReact: boolean;
  canShareScreen: boolean;
  lockedPlayback: boolean;
}

export interface UseHostToolsOptions {
  roomId: string;
  userId?: string;
  isHost?: boolean;
}

export function useHostTools(options: UseHostToolsOptions) {
  const { roomId, userId, isHost: initialIsHost = false } = options;
  
  const [isHost, setIsHost] = useState(initialIsHost);
  const [tools, setTools] = useState<HostToolsState>({
    canHost: !!initialIsHost,
    canModerate: !!initialIsHost,
    isMuted: false,
    isKicked: false,
    isBanned: false,
    slowMode: false,
    slowModeDelay: 0,
    canSpeak: true,
    canReact: true,
    canShareScreen: true,
    lockedPlayback: false,
  });
  
  const [moderatorActions, setModeratorActions] = useState<ModeratorAction[]>([]);
  const [roomLogs, setRoomLogs] = useState<{ id: string; message: string; timestamp: number; userId: string; username: string }[]>([]);
  const [filteredUserData, setFilteredUserData] = useState<Map<string, any>>(new Map());
  
  const socketRef = useRef<any>(null);
  const banListRef = useRef<Set<string>>(new Set());

  // Initialize socket
  useEffect(() => {
    const initSocket = async () => {
      try {
        const socket = await getSocket();
        socketRef.current = socket;
        
        // Check host status
        socket.emit('room:status', { roomId }, (response: any) => {
          const host = response.isHost || response.user_role === 'host' || response.host_id === userId;
          setIsHost(!!host);
          setTools(prev => ({
            ...prev,
            canHost: !!host,
            canModerate: !!host,
          }));
        });
        
        // Listen for moderation actions
        socket.on(`mod:action:${roomId}`, (action: ModeratorAction) => {
          setModeratorActions(prev => [action, ...prev].slice(0, 100));
          
          // Apply action if targeting this user
          if (action.targetUserId === userId) {
            switch (action.action) {
              case 'mute':
                setTools(prev => ({ ...prev, canSpeak: false, isMuted: true }));
                break;
              case 'unmute':
                setTools(prev => ({ ...prev, canSpeak: true, isMuted: false }));
                break;
              case 'kick':
                setTools(prev => ({ ...prev, isKicked: true }));
                break;
              case 'ban':
                setTools(prev => ({ ...prev, isBanned: true, isKicked: true }));
                banListRef.current.add(action.targetUserId);
                break;
              case 'unban':
                banListRef.current.delete(action.targetUserId);
                setTools(prev => ({ ...prev, isBanned: false }));
                break;
            }
          }
        });
        
        // Listen for room settings changes
        socket.on(`room:settings:${roomId}`, (settings: Partial<HostToolsState>) => {
          setTools(prev => ({ ...prev, ...settings }));
        });
        
        // Listen for logs
        socket.on(`room:log:${roomId}`, (log: { id: string; message: string; timestamp: number; userId: string; username: string }) => {
          setRoomLogs(prev => [log, ...prev].slice(0, 50));
        });
        
      } catch (err) {
        console.error('Failed to initialize host tools socket:', err);
      }
    };
    
    initSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off(`mod:action:${roomId}`);
        socketRef.current.off(`room:settings:${roomId}`);
        socketRef.current.off(`room:log:${roomId}`);
      }
    };
  }, [roomId, userId, initialIsHost]);

  // Kick user
  const kickUser = useCallback(async (targetUserId: string, reason?: string): Promise<boolean> => {
    if (!isHost || !userId) return false;
    
    try {
      await api.post('/api/room/kick', { roomId, targetUserId, reason });
      
      const action: ModeratorAction = {
        id: `mod_${Date.now()}`,
        moderatorId: userId,
        moderatorUsername: '',
        targetUserId,
        targetUsername: '',
        action: 'kick',
        reason,
        timestamp: Date.now(),
        roomId,
      };
      
      setModeratorActions(prev => [action, ...prev]);
      
      if (socketRef.current) {
        socketRef.current.emit('mod:kick', { roomId, targetUserId, reason });
      }
      
      return true;
    } catch (err) {
      console.error('Failed to kick user:', err);
      return false;
    }
  }, [isHost, userId, roomId]);

  // Ban user
  const banUser = useCallback(async (targetUserId: string, reason?: string, duration?: number): Promise<boolean> => {
    if (!isHost || !userId) return false;
    
    try {
      await api.post('/api/room/ban', { roomId, targetUserId, reason, duration });
      
      const action: ModeratorAction = {
        id: `mod_${Date.now()}`,
        moderatorId: userId,
        moderatorUsername: '',
        targetUserId,
        targetUsername: '',
        action: 'ban',
        reason,
        timestamp: Date.now(),
        roomId,
      };
      
      setModeratorActions(prev => [action, ...prev]);
      banListRef.current.add(targetUserId);
      
      if (socketRef.current) {
        socketRef.current.emit('mod:ban', { roomId, targetUserId, reason, duration });
      }
      
      return true;
    } catch (err) {
      console.error('Failed to ban user:', err);
      return false;
    }
  }, [isHost, userId, roomId]);

  // Mute user
  const muteUser = useCallback(async (targetUserId: string, reason?: string): Promise<boolean> => {
    if (!isHost || !userId) return false;
    
    try {
      await api.post('/api/room/mute', { roomId, targetUserId, reason });
      
      const action: ModeratorAction = {
        id: `mod_${Date.now()}`,
        moderatorId: userId,
        moderatorUsername: '',
        targetUserId,
        targetUsername: '',
        action: 'mute',
        reason,
        timestamp: Date.now(),
        roomId,
      };
      
      setModeratorActions(prev => [action, ...prev]);
      
      if (socketRef.current) {
        socketRef.current.emit('mod:mute', { roomId, targetUserId, reason });
      }
      
      return true;
    } catch (err) {
      console.error('Failed to mute user:', err);
      return false;
    }
  }, [isHost, userId, roomId]);

  // Unmute user
  const unmuteUser = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!isHost || !userId) return false;
    
    try {
      await api.post('/api/room/unmute', { roomId, targetUserId });
      
      const action: ModeratorAction = {
        id: `mod_${Date.now()}`,
        moderatorId: userId,
        moderatorUsername: '',
        targetUserId,
        targetUsername: '',
        action: 'unmute',
        timestamp: Date.now(),
        roomId,
      };
      
      setModeratorActions(prev => [action, ...prev]);
      
      if (socketRef.current) {
        socketRef.current.emit('mod:unmute', { roomId, targetUserId });
      }
      
      return true;
    } catch (err) {
      console.error('Failed to unmute user:', err);
      return false;
    }
  }, [isHost, userId, roomId]);

  // Unban user
  const unbanUser = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!isHost || !userId) return false;
    
    try {
      await api.post('/api/room/unban', { roomId, targetUserId });
      
      const action: ModeratorAction = {
        id: `mod_${Date.now()}`,
        moderatorId: userId,
        moderatorUsername: '',
        targetUserId,
        targetUsername: '',
        action: 'unban',
        timestamp: Date.now(),
        roomId,
      };
      
      setModeratorActions(prev => [action, ...prev]);
      banListRef.current.delete(targetUserId);
      
      if (socketRef.current) {
        socketRef.current.emit('mod:unban', { roomId, targetUserId });
      }
      
      return true;
    } catch (err) {
      console.error('Failed to unban user:', err);
      return false;
    }
  }, [isHost, userId, roomId]);

  // Toggle slow mode
  const toggleSlowMode = useCallback(async (enabled: boolean, delaySeconds = 5): Promise<boolean> => {
    if (!isHost || !userId) return false;
    
    try {
      await api.post('/api/room/slowmode', { roomId, enabled, delaySeconds });
      
      setTools(prev => ({ ...prev, slowMode: enabled, slowModeDelay: enabled ? delaySeconds : 0 }));
      
      if (socketRef.current) {
        socketRef.current.emit('room:slowmode', { roomId, enabled, delaySeconds });
      }
      
      return true;
    } catch (err) {
      console.error('Failed to toggle slow mode:', err);
      return false;
    }
  }, [isHost, userId, roomId]);

  // Lock playback
  const lockPlayback = useCallback(async (locked: boolean): Promise<boolean> => {
    if (!isHost || !userId) return false;
    
    try {
      await api.post('/api/room/lockplayback', { roomId, locked });
      
      setTools(prev => ({ ...prev, lockedPlayback: locked }));
      
      if (socketRef.current) {
        socketRef.current.emit('room:lockplayback', { roomId, locked });
      }
      
      return true;
    } catch (err) {
      console.error('Failed to lock playback:', err);
      return false;
    }
  }, [isHost, userId, roomId]);

  // Toggle screen share permission
  const toggleScreenShare = useCallback(async (allowed: boolean): Promise<boolean> => {
    if (!isHost || !userId) return false;
    
    try {
      await api.post('/api/room/screenshare', { roomId, allowed });
      
      setTools(prev => ({ ...prev, canShareScreen: allowed }));
      
      if (socketRef.current) {
        socketRef.current.emit('room:screenshare', { roomId, allowed });
      }
      
      return true;
    } catch (err) {
      console.error('Failed to toggle screen share:', err);
      return false;
    }
  }, [isHost, userId, roomId]);

  // Toggle reaction permission
  const toggleReactions = useCallback(async (allowed: boolean): Promise<boolean> => {
    if (!isHost || !userId) return false;
    
    try {
      await api.post('/api/room/reactions', { roomId, allowed });
      
      setTools(prev => ({ ...prev, canReact: allowed }));
      
      if (socketRef.current) {
        socketRef.current.emit('room:reactions', { roomId, allowed });
      }
      
      return true;
    } catch (err) {
      console.error('Failed to toggle reactions:', err);
      return false;
    }
  }, [isHost, userId, roomId]);

  // Check if user is banned
  const isUserBanned = useCallback((userId: string): boolean => {
    return banListRef.current.has(userId);
  }, []);

  // Get moderator actions for user
  const getUserActions = useCallback((targetUserId: string): ModeratorAction[] => {
    return moderatorActions.filter(a => a.targetUserId === targetUserId);
  }, [moderatorActions]);

  // Get recent logs
  const getRecentLogs = useCallback((limit = 10) => {
    return roomLogs.slice(0, limit);
  }, [roomLogs]);

  // Clear logs
  const clearLogs = useCallback(() => {
    setRoomLogs([]);
  }, []);

  return {
    isHost,
    tools,
    moderatorActions,
    roomLogs,
    isUserBanned,
    kickUser,
    banUser,
    muteUser,
    unmuteUser,
    unbanUser,
    toggleSlowMode,
    lockPlayback,
    toggleScreenShare,
    toggleReactions,
    getUserActions,
    getRecentLogs,
    clearLogs,
  };
}
