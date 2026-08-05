'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline' | 'in-room';

export interface UserPresence {
  userId: string;
  username: string;
  status: PresenceStatus;
  lastActive: number;
  lastActiveUrl?: string;
  currentRoomId?: string;
  currentRoomName?: string;
  isTyping: boolean;
  typingIn: string[]; // message IDs they're typing in
  watchingSince?: number;
  device?: string;
  region?: string;
  avatarUrl?: string;
}

export interface UseUserPresenceOptions {
  userId?: string;
  username?: string;
  onPresenceChange?: (userId: string, status: PresenceStatus) => void;
  onUserJoin?: (user: UserPresence) => void;
  onUserLeave?: (userId: string) => void;
  onUserTyping?: (userId: string, isTyping: boolean) => void;
}

export function useUserPresence(options: UseUserPresenceOptions = {}) {
  const { userId = '', username = 'User', onPresenceChange, onUserJoin, onUserLeave, onUserTyping } = options;
  
  const [users, setUsers] = useState<Map<string, UserPresence>>(new Map());
  const [onlineCount, setOnlineCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState<Map<string, boolean>>(new Map());
  const [isOnline, setIsOnline] = useState(true);
  const [currentStatus, setCurrentStatus] = useState<PresenceStatus>('online');
  const [lastSeen, setLastSeen] = useState<Map<string, number>>(new Map());
  
  const socketRef = useRef<any>(null);
  const activityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize socket
  useEffect(() => {
    const initSocket = async () => {
      try {
        const socket = await getSocket();
        socketRef.current = socket;
        
        socket.on('presence:update', (presence: UserPresence) => {
          setUsers(prev => {
            const newUsers = new Map(prev);
            newUsers.set(presence.userId, presence);
            
            // Update online count based on new state
            const count = [...newUsers.values()].filter(u => u.status !== 'offline').length;
            setOnlineCount(count);
            
            return newUsers;
          });
          
          onPresenceChange?.(presence.userId, presence.status);
        });
        
        socket.on('presence:join', (user: UserPresence) => {
          setUsers(prev => {
            const newUsers = new Map(prev);
            newUsers.set(user.userId, user);
            return newUsers;
          });
          onUserJoin?.(user);
        });
        
        socket.on('presence:leave', ({ userId: leavingUserId }: { userId: string }) => {
          setUsers(prev => {
            const newUsers = new Map(prev);
            newUsers.delete(leavingUserId);
            return newUsers;
          });
          onUserLeave?.(leavingUserId);
        });
        
        socket.on('presence:typing', ({ userId: typingUserId, isTyping }: { userId: string; isTyping: boolean }) => {
          setTypingUsers(prev => {
            const newTyping = new Map(prev);
            if (isTyping) {
              newTyping.set(typingUserId, true);
            } else {
              newTyping.delete(typingUserId);
            }
            return newTyping;
          });
          onUserTyping?.(typingUserId, isTyping);
        });
        
        socket.on('presence:offline', ({ userId: offlineUserId }: { userId: string }) => {
          setUsers(prev => {
            const newUsers = new Map(prev);
            const user = newUsers.get(offlineUserId);
            if (user) {
              newUsers.set(offlineUserId, { ...user, status: 'offline' });
            }
            return newUsers;
          });
          setOnlineCount(prev => Math.max(0, prev - 1));
        });
        
      } catch (err) {
        console.error('Failed to initialize presence socket:', err);
        setIsOnline(false);
      }
    };
    
    initSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off('presence:update');
        socketRef.current.off('presence:join');
        socketRef.current.off('presence:leave');
        socketRef.current.off('presence:typing');
        socketRef.current.off('presence:offline');
      }
    };
  }, [userId, username, onPresenceChange, onUserJoin, onUserLeave, onUserTyping]);

  // Set personal status
  const setStatus = useCallback((status: PresenceStatus) => {
    setCurrentStatus(status);
    
    if (socketRef.current) {
      socketRef.current.emit('presence:set_status', { userId, status, username });
    }
    
    onPresenceChange?.(userId, status);
  }, [userId, username, onPresenceChange]);

  // Set away status
  const setAway = useCallback(() => setStatus('away'), [setStatus]);

  // Set busy status
  const setBusy = useCallback(() => setStatus('busy'), [setStatus]);

  // Set online status
  const setOnline = useCallback(() => setStatus('online'), [setStatus]);

  // Set offline status
  const setOffline = useCallback(() => setStatus('offline'), [setStatus]);

  // Set in-room status
  const setInRoom = useCallback((roomId: string, roomName: string) => {
    setStatus('in-room');
    
    if (socketRef.current) {
      socketRef.current.emit('presence:set_room', { userId, roomId, roomName, username });
    }
  }, [userId, username, setStatus]);

  // Track user activity
  const trackActivity = useCallback(() => {
    // Reset activity timeout
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    
    // Set user as online
    setIsOnline(true);
    
    // After 5 minutes of inactivity, set to away
    activityTimeoutRef.current = setTimeout(() => {
      setAway();
    }, 5 * 60 * 1000);
  }, [setAway]);

  // Start typing indicator
  const startTyping = useCallback(() => {
    setTypingUsers(prev => new Map(prev).set(userId, true));
    
    if (socketRef.current) {
      socketRef.current.emit('presence:typing', { userId, isTyping: true });
    }
    
    // Clear typing after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setTypingUsers(prev => {
        const newTyping = new Map(prev);
        newTyping.delete(userId);
        return newTyping;
      });
      
      if (socketRef.current) {
        socketRef.current.emit('presence:typing', { userId, isTyping: false });
      }
    }, 3000);
  }, [userId]);

  // Stop typing
  const stopTyping = useCallback(() => {
    setTypingUsers(prev => {
      const newTyping = new Map(prev);
      newTyping.delete(userId);
      return newTyping;
    });
    
    if (socketRef.current) {
      socketRef.current.emit('presence:typing', { userId, isTyping: false });
    }
  }, [userId]);

  // Get user presence
  const getUserPresence = useCallback((targetUserId: string): UserPresence | undefined => {
    return users.get(targetUserId);
  }, [users]);

  // Get online users
  const getOnlineUsers = useCallback((): UserPresence[] => {
    return [...users.values()].filter(u => u.status !== 'offline');
  }, [users]);

  // Get users in room
  const getUsersInRoom = useCallback((roomId: string): UserPresence[] => {
    return [...users.values()].filter(u => u.currentRoomId === roomId);
  }, [users]);

  // Get typing users
  const getTypingUsers = useCallback((): string[] => {
    return [...typingUsers.keys()];
  }, [typingUsers]);

  // Check if user is online
  const isUserOnline = useCallback((targetUserId: string): boolean => {
    const user = users.get(targetUserId);
    return user?.status !== 'offline';
  }, [users]);

  // Get last active time
  const getLastActive = useCallback((targetUserId: string): number | undefined => {
    return lastSeen.get(targetUserId);
  }, [lastSeen]);

  // Get time since last active
  const getTimeSinceLastActive = useCallback((targetUserId: string): string => {
    const lastActive = lastSeen.get(targetUserId);
    if (!lastActive) return 'Unknown';
    
    const diff = Date.now() - lastActive;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }, [lastSeen]);

  // Get presence count by status
  const getCountByStatus = useCallback((status: PresenceStatus): number => {
    return [...users.values()].filter(u => u.status === status).length;
  }, [users]);

  // Get online count
  const getOnlineCount = useCallback((): number => {
    return onlineCount;
  }, [onlineCount]);

  // Clear all presence data
  const clearAll = useCallback(() => {
    setUsers(new Map());
    setOnlineCount(0);
    setTypingUsers(new Map());
    setLastSeen(new Map());
  }, []);

  // Activity tracking effect
  useEffect(() => {
    const handleActivity = () => {
      trackActivity();
    };
    
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    
    // Track initial activity
    trackActivity();
    
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [trackActivity]);

  return {
    users,
    onlineCount,
    typingUsers,
    isOnline,
    currentStatus,
    setStatus,
    setAway,
    setBusy,
    setOnline,
    setOffline,
    setInRoom,
    trackActivity,
    startTyping,
    stopTyping,
    getUserPresence,
    getOnlineUsers,
    getUsersInRoom,
    getTypingUsers,
    isUserOnline,
    getLastActive,
    getTimeSinceLastActive,
    getCountByStatus,
    getOnlineCount,
    clearAll,
  };
}
