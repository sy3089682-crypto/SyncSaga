'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface ViewerStats {
  // Time tracking
  totalWatchTime: number;         // seconds
  sessionWatchTime: number;       // seconds in current session
  averageWatchTimePerSession: number;
  longestSession: number;
  
  // Episode tracking
  episodesWatched: number;
  uniqueEpisodesWatched: number;
  completedEpisodes: number;
  totalEpisodesViewed: number;    // includes rewatches
  
  // Engagement
  reactionsSent: number;
  messagesSent: number;
  clipsCreated: number;
  clipsShared: number;
  clipsLiked: number;
  
  // Social
  roomsJoined: number;
  roomsHosted: number;
  uniqueRoommates: number;
  friendsAdded: number;
  
  // Achievement progress
  currentStreak: number;          // days
  longestStreak: number;
  lastActiveDate: string;         // YYYY-MM-DD
  daysActiveThisMonth: number;
  
  // Quality
  totalBufferTime: number;        // seconds spent buffering
  averageLatency: number;
  timesReconnected: number;
  
  // Preferences
  defaultQuality: string;
  defaultSpeed: number;
  subtitlesEnabled: boolean;
}

export interface UseViewerStatsOptions {
  userId?: string;
  onStatUpdate?: (statName: keyof ViewerStats, newValue: number) => void;
}

// Get today's date string
const getTodayString = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export function useViewerStats(options: UseViewerStatsOptions = {}) {
  const { userId, onStatUpdate } = options;
  
  const [stats, setStats] = useState<ViewerStats>({
    totalWatchTime: 0,
    sessionWatchTime: 0,
    averageWatchTimePerSession: 0,
    longestSession: 0,
    episodesWatched: 0,
    uniqueEpisodesWatched: 0,
    completedEpisodes: 0,
    totalEpisodesViewed: 0,
    reactionsSent: 0,
    messagesSent: 0,
    clipsCreated: 0,
    clipsShared: 0,
    clipsLiked: 0,
    roomsJoined: 0,
    roomsHosted: 0,
    uniqueRoommates: 0,
    friendsAdded: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: getTodayString(),
    daysActiveThisMonth: 0,
    totalBufferTime: 0,
    averageLatency: 0,
    timesReconnected: 0,
    defaultQuality: 'auto',
    defaultSpeed: 1.0,
    subtitlesEnabled: false,
  });
  
  const [sessionStart, setSessionStart] = useState<number>(Date.now());
  const [sessionEpisodes, setSessionEpisodes] = useState<Set<string>>(new Set());
  const statsRef = useRef(stats);
  const sessionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  statsRef.current = stats;

  // Start tracking session
  const startSession = useCallback(() => {
    setSessionStart(Date.now());
    setSessionEpisodes(new Set());
    
    if (sessionIntervalRef.current) {
      clearInterval(sessionIntervalRef.current);
    }
    
    // Update session watch time every second
    sessionIntervalRef.current = setInterval(() => {
      setStats(prev => {
        const newSessionTime = prev.sessionWatchTime + 1;
        const totalTime = prev.totalWatchTime + 1;
        
        // Calculate average
        const avgSession = prev.averageWatchTimePerSession;
        const newAvg = prev.sessionWatchTime > 0 
          ? (avgSession * (prev.sessionWatchTime / (prev.sessionWatchTime + 1)) + 1 / (prev.sessionWatchTime + 1))
          : 1;
        
        return {
          ...prev,
          sessionWatchTime: newSessionTime,
          totalWatchTime: totalTime,
        };
      });
    }, 1000);
  }, []);

  // End session
  const endSession = useCallback(() => {
    if (sessionIntervalRef.current) {
      clearInterval(sessionIntervalRef.current);
      sessionIntervalRef.current = null;
    }
    
    setStats(prev => {
      const sessionTime = prev.sessionWatchTime;
      const newLongest = Math.max(prev.longestSession, sessionTime);
      const newAvg = prev.sessionWatchTime > 0
        ? Math.round((prev.averageWatchTimePerSession * 10 + sessionTime) / 11)
        : sessionTime;
      
      return {
        ...prev,
        longestSession: newLongest,
        averageWatchTimePerSession: newAvg,
        sessionWatchTime: 0,
      };
    });
  }, []);

  // Increment watch time
  const addWatchTime = useCallback((seconds: number) => {
    setStats(prev => ({
      ...prev,
      totalWatchTime: prev.totalWatchTime + seconds,
      sessionWatchTime: prev.sessionWatchTime + seconds,
    }));
    onStatUpdate?.('totalWatchTime', stats.totalWatchTime + seconds);
  }, [stats.totalWatchTime, onStatUpdate]);

  // Record episode watch
  const recordEpisode = useCallback((episodeId: string, completed: boolean = false) => {
    setStats(prev => {
      const newUnique = prev.uniqueEpisodesWatched;
      const newTotal = prev.totalEpisodesViewed + 1;
      const newCompleted = completed ? prev.completedEpisodes + 1 : prev.completedEpisodes;
      
      // Track unique episodes (would use Set in real implementation)
      const episodeKey = `${episodeId}`;
      
      return {
        ...prev,
        episodesWatched: prev.episodesWatched + 1,
        uniqueEpisodesWatched: newUnique, // Would check if new
        totalEpisodesViewed: newTotal,
        completedEpisodes: newCompleted,
      };
    });
    
    setSessionEpisodes(prev => new Set([...prev, episodeId]));
    onStatUpdate?.('episodesWatched', stats.episodesWatched + 1);
  }, [stats.episodesWatched, onStatUpdate]);

  // Increment reactions
  const incrementReactions = useCallback((count: number = 1) => {
    setStats(prev => ({
      ...prev,
      reactionsSent: prev.reactionsSent + count,
    }));
    onStatUpdate?.('reactionsSent', stats.reactionsSent + count);
  }, [stats.reactionsSent, onStatUpdate]);

  // Increment messages
  const incrementMessages = useCallback((count: number = 1) => {
    setStats(prev => ({
      ...prev,
      messagesSent: prev.messagesSent + count,
    }));
    onStatUpdate?.('messagesSent', stats.messagesSent + count);
  }, [stats.messagesSent, onStatUpdate]);

  // Increment clips
  const incrementClips = useCallback((type: 'created' | 'shared' | 'liked', count: number = 1) => {
    setStats(prev => {
      const updates: Partial<ViewerStats> = {};
      if (type === 'created') updates.clipsCreated = prev.clipsCreated + count;
      if (type === 'shared') updates.clipsShared = prev.clipsShared + count;
      if (type === 'liked') updates.clipsLiked = prev.clipsLiked + count;
      return { ...prev, ...updates };
    });
  }, []);

  // Join room
  const joinRoom = useCallback((roomId: string, isHost: boolean = false) => {
    setStats(prev => ({
      ...prev,
      roomsJoined: prev.roomsJoined + 1,
      roomsHosted: isHost ? prev.roomsHosted + 1 : prev.roomsHosted,
    }));
  }, []);

  // Add unique roommate
  const addRoommate = useCallback((userId: string) => {
    setStats(prev => ({
      ...prev,
      uniqueRoommates: prev.uniqueRoommates + 1,
    }));
  }, []);

  // Add friend
  const addFriend = useCallback(() => {
    setStats(prev => ({
      ...prev,
      friendsAdded: prev.friendsAdded + 1,
    }));
  }, []);

  // Update streak
  const updateStreak = useCallback(() => {
    const today = getTodayString();
    setStats(prev => {
      if (prev.lastActiveDate === today) {
        return prev; // Already active today
      }
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      
      let newStreak = 1;
      if (prev.lastActiveDate === yesterdayStr) {
        newStreak = prev.currentStreak + 1;
      }
      
      const newLongest = Math.max(prev.longestStreak, newStreak);
      
      return {
        ...prev,
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastActiveDate: today,
        daysActiveThisMonth: prev.daysActiveThisMonth + 1,
      };
    });
  }, []);

  // Add buffer time
  const addBufferTime = useCallback((seconds: number) => {
    setStats(prev => ({
      ...prev,
      totalBufferTime: prev.totalBufferTime + seconds,
    }));
  }, []);

  // Update latency
  const updateLatency = useCallback((latency: number) => {
    setStats(prev => ({
      ...prev,
        averageLatency: Math.round((prev.averageLatency * 9 + latency) / 10),
    }));
  }, []);

  // Increment reconnections
  const incrementReconnections = useCallback(() => {
    setStats(prev => ({
      ...prev,
      timesReconnected: prev.timesReconnected + 1,
    }));
  }, []);

  // Set preferences
  const setPreferences = useCallback((updates: Partial<Pick<ViewerStats, 'defaultQuality' | 'defaultSpeed' | 'subtitlesEnabled'>>) => {
    setStats(prev => ({ ...prev, ...updates }));
  }, []);

  // Get stats summary
  const getSummary = useCallback((): string => {
    const hours = Math.floor(stats.totalWatchTime / 3600);
    const minutes = Math.floor((stats.totalWatchTime % 3600) / 60);
    return `${hours}h ${minutes}m watched across ${stats.episodesWatched} episodes in ${stats.roomsJoined} rooms`;
  }, [stats]);

  // Get achievement progress
  const getAchievementProgress = useCallback((): Record<string, { current: number; target: number }> => {
    return {
      'watch_10_hours': { current: stats.totalWatchTime / 3600, target: 10 },
      'watch_100_episodes': { current: stats.episodesWatched, target: 100 },
      'react_100_times': { current: stats.reactionsSent, target: 100 },
      'message_50_times': { current: stats.messagesSent, target: 50 },
      'create_10_clips': { current: stats.clipsCreated, target: 10 },
      '7_day_streak': { current: stats.currentStreak, target: 7 },
    };
  }, [stats]);

  // Reset all stats
  const reset = useCallback(() => {
    if (sessionIntervalRef.current) {
      clearInterval(sessionIntervalRef.current);
    }
    setStats({
      totalWatchTime: 0,
      sessionWatchTime: 0,
      averageWatchTimePerSession: 0,
      longestSession: 0,
      episodesWatched: 0,
      uniqueEpisodesWatched: 0,
      completedEpisodes: 0,
      totalEpisodesViewed: 0,
      reactionsSent: 0,
      messagesSent: 0,
      clipsCreated: 0,
      clipsShared: 0,
      clipsLiked: 0,
      roomsJoined: 0,
      roomsHosted: 0,
      uniqueRoommates: 0,
      friendsAdded: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: getTodayString(),
      daysActiveThisMonth: 0,
      totalBufferTime: 0,
      averageLatency: 0,
      timesReconnected: 0,
      defaultQuality: 'auto',
      defaultSpeed: 1.0,
      subtitlesEnabled: false,
    });
    setSessionStart(Date.now());
    setSessionEpisodes(new Set());
  }, []);

  // Auto-start session tracking
  useEffect(() => {
    startSession();
    
    return () => {
      endSession();
    };
  }, [startSession, endSession]);

  return {
    ...stats,
    sessionStart,
    startSession,
    endSession,
    addWatchTime,
    recordEpisode,
    incrementReactions,
    incrementMessages,
    incrementClips,
    joinRoom,
    addRoommate,
    addFriend,
    updateStreak,
    addBufferTime,
    updateLatency,
    incrementReconnections,
    setPreferences,
    getSummary,
    getAchievementProgress,
    reset,
  };
}
