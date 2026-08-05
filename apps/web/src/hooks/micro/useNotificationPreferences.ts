'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export type NotificationChannel = 
  | 'push'
  | 'email'
  | 'in_app';

export type NotificationType = 
  | 'room_invite'
  | 'friend_request'
  | 'friend_accept'
  | 'message_mention'
  | 'reaction'
  | 'clip_like'
  | 'clip_share'
  | 'achievement'
  | 'streak'
  | 'reminder'
  | 'schedule'
  | 'system';

export interface NotificationPreferences {
  channels: {
    push: boolean;
    email: boolean;
    in_app: boolean;
  };
  types: Record<NotificationType, Record<NotificationChannel, boolean>>;
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm
    end: string;
  };
  soundEnabled: boolean;
  badgeEnabled: boolean;
}

export interface UseNotificationPreferencesOptions {
  userId?: string;
  defaultPreferences?: Partial<NotificationPreferences>;
  onPreferencesChange?: (prefs: NotificationPreferences) => void;
}

export function useNotificationPreferences(options: UseNotificationPreferencesOptions = {}) {
  const { userId, defaultPreferences, onPreferencesChange } = options;
  
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    channels: {
      push: true,
      email: false,
      in_app: true,
    },
    types: {
      room_invite: { push: true, email: true, in_app: true },
      friend_request: { push: true, email: true, in_app: true },
      friend_accept: { push: true, email: false, in_app: true },
      message_mention: { push: true, email: false, in_app: true },
      reaction: { push: false, email: false, in_app: true },
      clip_like: { push: false, email: false, in_app: true },
      clip_share: { push: false, email: false, in_app: true },
      achievement: { push: true, email: false, in_app: true },
      streak: { push: true, email: false, in_app: true },
      reminder: { push: true, email: true, in_app: true },
      schedule: { push: true, email: true, in_app: true },
      system: { push: true, email: true, in_app: true },
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
    soundEnabled: true,
    badgeEnabled: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotificationTime, setLastNotificationTime] = useState<number | null>(null);

  // Merge preferences
  const mergePreferences = useCallback((newPrefs: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({
      ...prev,
      ...newPrefs,
      types: { ...prev.types, ...(newPrefs.types || {}) },
    }));
    onPreferencesChange?.({ ...preferences, ...newPrefs });
  }, [preferences, onPreferencesChange]);

  // Set channel preference
  const setChannelEnabled = useCallback((channel: NotificationChannel, enabled: boolean) => {
    setPreferences(prev => ({
      ...prev,
      channels: { ...prev.channels, [channel]: enabled },
    }));
    
    // Update all types for this channel
    setPreferences(prev => ({
      ...prev,
      types: Object.fromEntries(
        Object.entries(prev.types).map(([type, channels]) => [
          type,
          { ...channels, [channel]: enabled },
        ])
      ) as Record<NotificationType, Record<NotificationChannel, boolean>>,
    }));
    
    onPreferencesChange?.({ ...preferences, channels: { ...preferences.channels, [channel]: enabled } });
  }, [preferences, onPreferencesChange]);

  // Set type preference
  const setTypeEnabled = useCallback((type: NotificationType, channel: NotificationChannel, enabled: boolean) => {
    setPreferences(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: { ...prev.types[type], [channel]: enabled },
      },
    }));
    
    onPreferencesChange?.({ ...preferences, types: { ...preferences.types, [type]: { ...preferences.types[type], [channel]: enabled } } });
  }, [preferences, onPreferencesChange]);

  // Toggle quiet hours
  const toggleQuietHours = useCallback(() => {
    setPreferences(prev => ({
      ...prev,
      quietHours: { ...prev.quietHours, enabled: !prev.quietHours.enabled },
    }));
  }, []);

  // Set quiet hours
  const setQuietHours = useCallback((start: string, end: string) => {
    setPreferences(prev => ({
      ...prev,
      quietHours: { ...prev.quietHours, start, end },
    }));
  }, []);

  // Toggle sound
  const toggleSound = useCallback(() => {
    setPreferences(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  }, []);

  // Toggle badge
  const toggleBadge = useCallback(() => {
    setPreferences(prev => ({ ...prev, badgeEnabled: !prev.badgeEnabled }));
  }, []);

  // Check if notification should be sent
  const shouldNotify = useCallback((type: NotificationType, channel: NotificationChannel): boolean => {
    const typePrefs = preferences.types[type];
    if (!typePrefs) return preferences.channels[channel];
    return typePrefs[channel] && preferences.channels[channel];
  }, [preferences]);

  // Check if quiet hours are active
  const isQuietHours = useCallback((): boolean => {
    if (!preferences.quietHours.enabled) return false;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startHours, startMins] = preferences.quietHours.start.split(':').map(Number);
    const [endHours, endMins] = preferences.quietHours.end.split(':').map(Number);
    
    const startMinutes = startHours * 60 + startMins;
    const endMinutes = endHours * 60 + endMins;
    
    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Overnight quiet hours
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  }, [preferences.quietHours]);

  // Get unread count
  const getUnreadCount = useCallback((): number => {
    return unreadCount;
  }, [unreadCount]);

  // Mark as read
  const markAsRead = useCallback((count: number = 1) => {
    setUnreadCount(prev => Math.max(0, prev - count));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Reset to defaults
  const reset = useCallback(() => {
    setPreferences({
      channels: {
        push: true,
        email: false,
        in_app: true,
      },
      types: {
        room_invite: { push: true, email: true, in_app: true },
        friend_request: { push: true, email: true, in_app: true },
        friend_accept: { push: true, email: false, in_app: true },
        message_mention: { push: true, email: false, in_app: true },
        reaction: { push: false, email: false, in_app: true },
        clip_like: { push: false, email: false, in_app: true },
        clip_share: { push: false, email: false, in_app: true },
        achievement: { push: true, email: false, in_app: true },
        streak: { push: true, email: false, in_app: true },
        reminder: { push: true, email: true, in_app: true },
        schedule: { push: true, email: true, in_app: true },
        system: { push: true, email: true, in_app: true },
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
      soundEnabled: true,
      badgeEnabled: true,
    });
  }, []);

  // Get summary
  const getSummary = useCallback((): string => {
    const enabledChannels = Object.entries(preferences.channels)
      .filter(([, enabled]) => enabled)
      .map(([channel]) => channel);
    
    return `Notifications: ${enabledChannels.join(', ')}`;
  }, [preferences.channels]);

  return {
    preferences,
    isLoading,
    unreadCount,
    lastNotificationTime,
    setChannelEnabled,
    setTypeEnabled,
    toggleQuietHours,
    setQuietHours,
    toggleSound,
    toggleBadge,
    shouldNotify,
    isQuietHours,
    getUnreadCount,
    markAsRead,
    clearAll,
    reset,
    getSummary,
  };
}
