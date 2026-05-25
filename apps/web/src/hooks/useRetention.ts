'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { UserStats, getDefaultStats, checkAchievements, addXP, updateStreak, calculateLevel, xpForNextLevel } from '@/lib/retention';
import { useToast } from '@/hooks/useToast';
import { analytics } from '@/lib/analytics';

const STATS_KEY = 'syncsaga:client-stats';

export function useRetention() {
  const { user } = useAppStore();
  const { success } = useToast();
  const [stats, setStats] = useState<UserStats>(getDefaultStats);

  useEffect(() => {
    if (!user) return;
    try {
      const saved = localStorage.getItem(`${STATS_KEY}:${user.id}`);
      if (saved) {
        const parsed = JSON.parse(saved) as UserStats;
        setStats(parsed);
      }
    } catch {}
  }, [user?.id]);

  const persistStats = useCallback((newStats: UserStats) => {
    if (!user) return;
    localStorage.setItem(`${STATS_KEY}:${user.id}`, JSON.stringify(newStats));
  }, [user?.id]);

  const recordWatchMinutes = useCallback((minutes: number) => {
    setStats(prev => {
      const updated = { ...prev, totalWatchMinutes: prev.totalWatchMinutes + minutes };
      const streaked = updateStreak(updated);
      const xpResult = addXP(streaked, Math.round(minutes * 2));
      const newlyUnlocked = checkAchievements(xpResult);

      newlyUnlocked.forEach(id => {
        const ach = xpResult.achievements.find(a => a.id === id);
        if (ach) {
          setTimeout(() => {
            success(`Achievement Unlocked!`, `${ach.name} — ${ach.description}`);
            analytics.trackAchievementUnlocked(id, ach.name);
          }, 500);
        }
      });

      if (xpResult.leveledUp) {
        setTimeout(() => {
          success(`Level Up!`, `You're now level ${xpResult.level}`);
        }, 100);
      }

      persistStats(xpResult);
      return xpResult;
    });
  }, [persistStats, success]);

  const recordRoomJoin = useCallback(() => {
    setStats(prev => {
      const updated = { ...prev, totalRoomsJoined: prev.totalRoomsJoined + 1 };
      const xpResult = addXP(updated, 25);
      const newlyUnlocked = checkAchievements(xpResult);
      newlyUnlocked.forEach(id => {
        const ach = xpResult.achievements.find(a => a.id === id);
        if (ach) {
          setTimeout(() => {
            success(`Achievement: ${ach.name}`, ach.description);
            analytics.trackAchievementUnlocked(id, ach.name);
          }, 300);
        }
      });
      persistStats(xpResult);
      return xpResult;
    });
  }, [persistStats, success]);

  const recordMessage = useCallback(() => {
    setStats(prev => {
      const updated = { ...prev, totalMessagesSent: prev.totalMessagesSent + 1 };
      if (updated.totalMessagesSent % 10 === 0) {
        const xpResult = addXP(updated, 5);
        const newlyUnlocked = checkAchievements(xpResult);
        newlyUnlocked.forEach(id => {
          const ach = xpResult.achievements.find(a => a.id === id);
          if (ach) {
            setTimeout(() => {
              success(`Achievement: ${ach.name}`, ach.description);
              analytics.trackAchievementUnlocked(id, ach.name);
            }, 300);
          }
        });
        persistStats(xpResult);
        return xpResult;
      }
      persistStats(updated);
      return updated;
    });
  }, [persistStats, success]);

  const recordReaction = useCallback(() => {
    setStats(prev => {
      const updated = { ...prev, totalReactionsSent: prev.totalReactionsSent + 1 };
      const xpResult = addXP(updated, 2);
      const newlyUnlocked = checkAchievements(xpResult);
      newlyUnlocked.forEach(id => {
        const ach = xpResult.achievements.find(a => a.id === id);
        if (ach) {
          setTimeout(() => {
            success(`Achievement: ${ach.name}`, ach.description);
            analytics.trackAchievementUnlocked(id, ach.name);
          }, 300);
        }
      });
      persistStats(xpResult);
      return xpResult;
    });
  }, [persistStats, success]);

  const recordFriendship = useCallback(() => {
    setStats(prev => {
      const updated = { ...prev, totalFriends: prev.totalFriends + 1 };
      const xpResult = addXP(updated, 50);
      const newlyUnlocked = checkAchievements(xpResult);
      newlyUnlocked.forEach(id => {
        const ach = xpResult.achievements.find(a => a.id === id);
        if (ach) {
          setTimeout(() => {
            success(`Achievement: ${ach.name}`, ach.description);
            analytics.trackAchievementUnlocked(id, ach.name);
          }, 300);
        }
      });
      persistStats(xpResult);
      return xpResult;
    });
  }, [persistStats, success]);

  const recordClip = useCallback(() => {
    setStats(prev => {
      const updated = { ...prev, totalClipsCreated: prev.totalClipsCreated + 1 };
      const xpResult = addXP(updated, 30);
      const newlyUnlocked = checkAchievements(xpResult);
      newlyUnlocked.forEach(id => {
        const ach = xpResult.achievements.find(a => a.id === id);
        if (ach) {
          setTimeout(() => {
            success(`Achievement: ${ach.name}`, ach.description);
            analytics.trackAchievementUnlocked(id, ach.name);
          }, 300);
        }
      });
      persistStats(xpResult);
      return xpResult;
    });
  }, [persistStats, success]);

  return {
    stats,
    recordWatchMinutes,
    recordRoomJoin,
    recordMessage,
    recordReaction,
    recordFriendship,
    recordClip,
    xpProgress: stats.xp % xpForNextLevel(calculateLevel(stats.xp)),
    xpToNext: xpForNextLevel(calculateLevel(stats.xp)),
  };
}

export function useStreakDisplay(stats: UserStats) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date().getDay();
  const weekDays = days.map((d, i) => ({
    label: d,
    isToday: i === today,
    active: i < today && stats.currentStreak > (today - i),
  }));
  return weekDays;
}
