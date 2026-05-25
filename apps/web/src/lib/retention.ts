export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'watching' | 'social' | 'milestone' | 'special';
  progress: number;
  maxProgress: number;
  unlockedAt?: string;
}

export interface UserStats {
  totalWatchMinutes: number;
  totalRoomsJoined: number;
  totalMessagesSent: number;
  totalReactionsSent: number;
  totalClipsCreated: number;
  totalFriends: number;
  currentStreak: number;
  longestStreak: number;
  xp: number;
  level: number;
  achievements: Achievement[];
  lastWatchDate: string;
}

const XP_PER_LEVEL = 1000;

export function calculateLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function xpForNextLevel(level: number): number {
  return level * XP_PER_LEVEL;
}

function streakKey(userId: string): string {
  return `syncsaga:streak:${userId}`;
}

function statsKey(userId: string): string {
  return `syncsaga:stats:${userId}`;
}

function achievementsKey(userId: string): string {
  return `syncsaga:achievements:${userId}`;
}

const DEFAULT_STATS: UserStats = {
  totalWatchMinutes: 0,
  totalRoomsJoined: 0,
  totalMessagesSent: 0,
  totalReactionsSent: 0,
  totalClipsCreated: 0,
  totalFriends: 0,
  currentStreak: 0,
  longestStreak: 0,
  xp: 0,
  level: 1,
  achievements: [],
  lastWatchDate: '',
};

const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_room', name: 'First Steps', description: 'Join your first watch room', icon: '🚪', category: 'milestone', progress: 0, maxProgress: 1 },
  { id: 'first_message', name: 'Chatterbox', description: 'Send your first message', icon: '💬', category: 'social', progress: 0, maxProgress: 1 },
  { id: 'first_reaction', name: 'Express Yourself', description: 'Send your first reaction', icon: '😄', category: 'social', progress: 0, maxProgress: 1 },
  { id: 'streak_3', name: 'Getting Started', description: 'Watch for 3 days in a row', icon: '🔥', category: 'watching', progress: 0, maxProgress: 3 },
  { id: 'streak_7', name: 'Dedicated Fan', description: 'Watch for 7 days in a row', icon: '🔥', category: 'watching', progress: 0, maxProgress: 7 },
  { id: 'streak_30', name: 'Otaku Dedication', description: 'Watch for 30 days in a row', icon: '🔥', category: 'watching', progress: 0, maxProgress: 30 },
  { id: 'messages_100', name: 'Talkative', description: 'Send 100 messages', icon: '🗣️', category: 'social', progress: 0, maxProgress: 100 },
  { id: 'messages_1000', name: 'Legendary Chatter', description: 'Send 1,000 messages', icon: '👑', category: 'social', progress: 0, maxProgress: 1000 },
  { id: 'rooms_10', name: 'Social Butterfly', description: 'Join 10 different rooms', icon: '🦋', category: 'milestone', progress: 0, maxProgress: 10 },
  { id: 'hours_10', name: 'Binge Watcher', description: 'Watch 10 hours of anime', icon: '⏰', category: 'watching', progress: 0, maxProgress: 600 },
  { id: 'hours_50', name: 'Marathon Master', description: 'Watch 50 hours of anime', icon: '🏃', category: 'watching', progress: 0, maxProgress: 3000 },
  { id: 'friends_5', name: 'Making Friends', description: 'Add 5 friends', icon: '🤝', category: 'social', progress: 0, maxProgress: 5 },
  { id: 'friends_20', name: 'Social Network', description: 'Add 20 friends', icon: '🌐', category: 'social', progress: 0, maxProgress: 20 },
  { id: 'first_clip', name: 'Director', description: 'Create your first clip', icon: '🎬', category: 'milestone', progress: 0, maxProgress: 1 },
  { id: 'clips_10', name: 'Content Creator', description: 'Create 10 clips', icon: '🎥', category: 'milestone', progress: 0, maxProgress: 10 },
  { id: 'reactions_50', name: 'Reactive', description: 'Send 50 timeline reactions', icon: '⚡', category: 'social', progress: 0, maxProgress: 50 },
];

export function getDefaultStats(): UserStats {
  return { ...DEFAULT_STATS, achievements: ALL_ACHIEVEMENTS.map(a => ({ ...a })) };
}

export function checkAchievements(stats: UserStats): string[] {
  const newlyUnlocked: string[] = [];

  for (const achievement of ALL_ACHIEVEMENTS) {
    const existing = stats.achievements.find(a => a.id === achievement.id);
    if (existing?.unlockedAt) continue;

    switch (achievement.id) {
      case 'first_room':
        if (stats.totalRoomsJoined >= 1) { markUnlocked(stats, achievement.id, newlyUnlocked); }
        break;
      case 'first_message':
        if (stats.totalMessagesSent >= 1) { markUnlocked(stats, achievement.id, newlyUnlocked); }
        break;
      case 'first_reaction':
        if (stats.totalReactionsSent >= 1) { markUnlocked(stats, achievement.id, newlyUnlocked); }
        break;
      case 'streak_3':
        if (stats.currentStreak >= 3) { markUnlocked(stats, achievement.id, newlyUnlocked); }
        break;
      case 'streak_7':
        if (stats.currentStreak >= 7) { markUnlocked(stats, achievement.id, newlyUnlocked); }
        break;
      case 'streak_30':
        if (stats.currentStreak >= 30) { markUnlocked(stats, achievement.id, newlyUnlocked); }
        break;
      case 'messages_100':
        if (stats.totalMessagesSent >= 100) { markUnlocked(stats, achievement.id, newlyUnlocked); }
        break;
      case 'messages_1000':
        if (stats.totalMessagesSent >= 1000) { markUnlocked(stats, achievement.id, newlyUnlocked); }
        break;
      case 'rooms_10':
        if (stats.totalRoomsJoined >= 10) { markUnlocked(stats, achievement.id, newlyUnlocked); }
        break;
      case 'hours_10':
        if (stats.totalWatchMinutes >= 600) { markUnlocked(stats, achievement.id, newlyUnlocked); }
        break;
      case 'hours_50':
        if (stats.totalWatchMinutes >= 3000) { markUnlocked(stats, achievement.id, newlyUnlocked); }
        break;
      case 'friends_5':
        if (stats.totalFriends >= 5) { markUnlocked(stats, achievement.id, newlyUnlocked); }
        break;
      case 'friends_20':
        if (stats.totalFriends >= 20) { markUnlocked(stats, achievement.id, newlyUnlocked); }
        break;
      case 'first_clip':
        if (stats.totalClipsCreated >= 1) { markUnlocked(stats, achievement.id, newlyUnlocked); }
        break;
      case 'clips_10':
        if (stats.totalClipsCreated >= 10) { markUnlocked(stats, achievement.id, newlyUnlocked); }
        break;
      case 'reactions_50':
        if (stats.totalReactionsSent >= 50) { markUnlocked(stats, achievement.id, newlyUnlocked); }
        break;
    }
  }

  return newlyUnlocked;
}

function markUnlocked(stats: UserStats, id: string, newly: string[]) {
  const a = stats.achievements.find(ach => ach.id === id);
  if (a && !a.unlockedAt) {
    a.unlockedAt = new Date().toISOString();
    a.progress = a.maxProgress;
    newly.push(id);
  }
}

export function updateStreak(stats: UserStats): UserStats {
  const today = new Date().toDateString();
  const lastDate = stats.lastWatchDate ? new Date(stats.lastWatchDate).toDateString() : null;

  if (lastDate === today) {
    return stats;
  }

  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (lastDate === yesterday) {
    stats.currentStreak += 1;
  } else if (lastDate && lastDate !== today) {
    stats.currentStreak = 1;
  } else if (!lastDate) {
    stats.currentStreak = 1;
  }

  if (stats.currentStreak > stats.longestStreak) {
    stats.longestStreak = stats.currentStreak;
  }

  stats.lastWatchDate = today;
  return stats;
}

export function addXP(stats: UserStats, amount: number): UserStats & { leveledUp: boolean } {
  stats.xp += amount;
  const newLevel = calculateLevel(stats.xp);
  const leveledUp = newLevel > stats.level;
  stats.level = newLevel;
  return { ...stats, leveledUp };
}
