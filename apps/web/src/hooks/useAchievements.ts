'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  category: 'viewing' | 'social' | 'hosting' | 'reactions' | 'clips' | 'special';
  requirement: number;
  currentProgress: number;
  isCompleted: boolean;
  completedAt?: number;
  unlockedAt?: number;
}

export interface UserAchievements {
  achievements: Achievement[];
  totalPoints: number;
  level: number;
  XP: number;
  nextLevelXP: number;
  streak: {
    current: number;
    longest: number;
    lastActive: number;
  };
  stats: {
    totalWatchTime: number; // minutes
    totalEpisodesWatched: number;
    totalRoomsJoined: number;
    totalRoomsHosted: number;
    totalClipsCreated: number;
    totalReactions: number;
    friendsCount: number;
    likedClips: number;
  };
}

export interface AchievementProgress {
  achievementId: string;
  current: number;
  required: number;
  percentage: number;
}

export function useAchievements(userId?: string) {
  const [userAchievements, setUserAchievements] = useState<UserAchievements | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [progress, setProgress] = useState<Map<string, AchievementProgress>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentUnlocks, setRecentUnlocks] = useState<Achievement[]>([]);
  
  const socketRef = useRef<any>(null);
  const lastCheckRef = useRef<number>(Date.now());

  // Initialize socket
  useEffect(() => {
    const initSocket = async () => {
      try {
        const socket = await getSocket();
        socketRef.current = socket;
        
        // Listen for achievement unlocks
        socket.on('achievement:unlock', (achievement: Achievement) => {
          setRecentUnlocks(prev => [achievement, ...prev].slice(0, 5));
          setAchievements(prev => {
            const existing = prev.find(a => a.id === achievement.id);
            if (existing) {
              return prev.map(a => a.id === achievement.id ? achievement : a);
            }
            return [achievement, ...prev];
          });
          
          // Show notification
          if (typeof window !== 'undefined') {
            new Notification('Achievement Unlocked!', {
              body: `${achievement.name}: ${achievement.description}`,
              icon: '/icon-192.png',
              badge: '/icon-192.png',
            });
          }
        });
        
        // Listen for progress updates
        socket.on('achievement:progress', ({ achievementId, current, required }: { achievementId: string; current: number; required: number }) => {
          setProgress(prev => {
            const existing = prev.get(achievementId);
            const newProgress = existing ? existing.current : 0;
            return new Map(prev).set(achievementId, {
              achievementId,
              current: Math.max(newProgress, current),
              required,
              percentage: Math.min(100, Math.round((Math.max(newProgress, current) / required) * 100)),
            });
          });
        });
        
        // Listen for XP updates
        socket.on('achievement:xp', ({ xp, totalXP, level }: { xp: number; totalXP: number; level: number }) => {
          setUserAchievements(prev => prev ? {
            ...prev,
            XP: xp,
            totalPoints: totalXP,
            level,
            nextLevelXP: level * 1000,
          } : null);
        });
        
      } catch (err) {
        console.error('Failed to initialize achievements socket:', err);
      }
    };
    
    initSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off('achievement:unlock');
        socketRef.current.off('achievement:progress');
        socketRef.current.off('achievement:xp');
      }
    };
  }, []);

  // Fetch user achievements
  const fetchAchievements = useCallback(async (): Promise<UserAchievements | null> => {
    if (!userId) {
      setError('User ID required');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get<{ achievements: UserAchievements }>(`/api/achievements?userId=${userId}`);

      setUserAchievements(response.achievements);
      setAchievements(response.achievements.achievements);
      
      // Update progress map
      const progressMap = new Map<string, AchievementProgress>();
      response.achievements.achievements.forEach(ach => {
        if (!ach.isCompleted) {
          progressMap.set(ach.id, {
            achievementId: ach.id,
            current: ach.currentProgress,
            required: ach.requirement,
            percentage: Math.round((ach.currentProgress / ach.requirement) * 100),
          });
        }
      });
      setProgress(progressMap);

      return response.achievements;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch achievements';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Get specific achievement
  const getAchievement = useCallback((achievementId: string): Achievement | undefined => {
    return achievements.find(a => a.id === achievementId);
  }, [achievements]);

  // Get achievement progress
  const getProgress = useCallback((achievementId: string): AchievementProgress | undefined => {
    return progress.get(achievementId);
  }, [progress]);

  // Get completed achievements count
  const getCompletedCount = useCallback((): number => {
    return achievements.filter(a => a.isCompleted).length;
  }, [achievements]);

  // Get achievements by category
  const getByCategory = useCallback((category: Achievement['category']): Achievement[] => {
    return achievements.filter(a => a.category === category);
  }, [achievements]);

  // Get achievements by rarity
  const getByRarity = useCallback((rarity: Achievement['rarity']): Achievement[] => {
    return achievements.filter(a => a.rarity === rarity);
  }, [achievements]);

  // Get current streak
  const getStreak = useCallback((): number => {
    return userAchievements?.streak.current || 0;
  }, [userAchievements]);

  // Get total XP
  const getTotalXP = useCallback((): number => {
    return userAchievements?.totalPoints || 0;
  }, [userAchievements]);

  // Get level
  const getLevel = useCallback((): number => {
    return userAchievements?.level || 1;
  }, [userAchievements]);

  // Get XP progress to next level
  const getXPProgress = useCallback((): number => {
    if (!userAchievements) return 0;
    const progress = userAchievements.XP - ((userAchievements.level - 1) * 1000);
    const needed = 1000;
    return Math.round((progress / needed) * 100);
  }, [userAchievements]);

  // Calculate XP earned this session
  const calculateSessionXP = useCallback((): number => {
    // This would be calculated based on activities during the session
    return 0;
  }, []);

  // Get all achievements unlocked today
  const getTodayUnlocks = useCallback((): Achievement[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return recentUnlocks.filter(a => {
      if (!a.unlockedAt) return false;
      return a.unlockedAt >= today.getTime();
    });
  }, [recentUnlocks]);

  // Clear recent unlocks
  const clearRecentUnlocks = useCallback(() => {
    setRecentUnlocks([]);
  }, []);

  // Get next achievements to unlock (based on progress)
  const getNextAchievements = useCallback((): AchievementProgress[] => {
    const sorted = Array.from(progress.values())
      .sort((a, b) => a.percentage - b.percentage);
    return sorted.slice(0, 5);
  }, [progress]);

  // Get completion percentage
  const getCompletionPercentage = useCallback((): number => {
    if (achievements.length === 0) return 0;
    const completed = achievements.filter(a => a.isCompleted).length;
    return Math.round((completed / achievements.length) * 100);
  }, [achievements]);

  // Memoized stats
  const stats = useMemo(() => userAchievements?.stats || {}, [userAchievements]);

  return {
    userAchievements,
    achievements,
    progress,
    stats,
    isLoading,
    error,
    recentUnlocks,
    fetchAchievements,
    getAchievement,
    getProgress,
    getCompletedCount,
    getByCategory,
    getByRarity,
    getStreak,
    getTotalXP,
    getLevel,
    getXPProgress,
    calculateSessionXP,
    getTodayUnlocks,
    clearRecentUnlocks,
    getNextAchievements,
    getCompletionPercentage,
  };
}
