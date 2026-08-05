'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';

export type NotificationType = 
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'room_invite'
  | 'friend_request'
  | 'reaction'
  | 'message_mention'
  | 'clip_like'
  | 'achievement';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  description?: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  icon?: string;
  sound?: boolean;
}

export interface UseNotificationSystemOptions {
  maxNotifications?: number;
  enableSound?: boolean;
  onNotificationClick?: (notification: AppNotification) => void;
}

export function useNotificationSystem(options: UseNotificationSystemOptions = {}) {
  const { 
    maxNotifications = 50,
    enableSound = true,
    onNotificationClick,
  } = options;
  
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(enableSound);
  
  const socketRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize socket
  useEffect(() => {
    const initSocket = async () => {
      try {
        const socket = await getSocket();
        socketRef.current = socket;
        
        socket.on('notification:new', (notification: AppNotification) => {
          addNotification(notification);
        });
        
      } catch (err) {
        console.error('Failed to initialize notification socket:', err);
      }
    };
    
    initSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off('notification:new');
      }
    };
  }, []);

  // Initialize audio context for sounds
  const initAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  // Play notification sound
  const playSound = useCallback((type: NotificationType) => {
    if (!enableSound || !soundEnabled) return;
    
    initAudio();
    
    try {
      const ctx = audioContextRef.current;
      if (!ctx) return;
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Different tones for different types
      switch (type) {
        case 'success':
          oscillator.frequency.value = 880;
          oscillator.type = 'sine';
          break;
        case 'error':
          oscillator.frequency.value = 220;
          oscillator.type = 'sawtooth';
          break;
        case 'warning':
          oscillator.frequency.value = 440;
          oscillator.type = 'triangle';
          break;
        default:
          oscillator.frequency.value = 660;
          oscillator.type = 'sine';
      }
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (err) {
      console.error('Failed to play sound:', err);
    }
  }, [enableSound, soundEnabled]);

  // Add notification
  const addNotification = useCallback((notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>): AppNotification => {
    const newNotification: AppNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, maxNotifications));
    setUnreadCount(prev => prev + 1);
    
    playSound(notification.type);
    
    return newNotification;
  }, [maxNotifications, enableSound, soundEnabled, playSound]);

  // Add system notification
  const notify = useCallback((options: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    return addNotification(options);
  }, [addNotification]);

  // Mark as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Get unread notifications
  const getUnread = useCallback((): AppNotification[] => {
    return notifications.filter(n => !n.read);
  }, [notifications]);

  // Get notifications by type
  const getByType = useCallback((type: NotificationType): AppNotification[] => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  // Toggle sound
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => !prev);
  }, []);

  // Clear old notifications
  const clearOld = useCallback((olderThanDays = 7) => {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const toRemove = notifications.filter(n => n.timestamp < cutoff);
    toRemove.forEach(n => removeNotification(n.id));
  }, [notifications, removeNotification]);

  // Auto-clear old notifications
  useEffect(() => {
    const interval = setInterval(() => {
      clearOld(30); // Clear notifications older than 30 days
    }, 24 * 60 * 60 * 1000); // Daily
    
    return () => clearInterval(interval);
  }, [clearOld]);

  return {
    notifications,
    unreadCount,
    isLoading,
    soundEnabled,
    addNotification,
    notify,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    getUnread,
    getByType,
    toggleSound,
    clearOld,
  };
}
