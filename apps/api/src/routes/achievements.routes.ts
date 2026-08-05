import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Achievement definitions
const ACHIEVEMENTS = [
  // Viewing achievements
  { id: 'first_watch', name: 'First Steps', description: 'Watch your first video', icon: '🎬', rarity: 'common' as const, category: 'viewing' as const, requirement: 1 },
  { id: 'marathon_viewer', name: 'Marathon Viewer', description: 'Watch 5 hours in one session', icon: '🏃', rarity: 'uncommon' as const, category: 'viewing' as const, requirement: 300 },
  { id: 'weekend_warrior', name: 'Weekend Warrior', description: 'Watch 10 hours in a weekend', icon: '⚔️', rarity: 'rare' as const, category: 'viewing' as const, requirement: 600 },
  { id: 'night_owl', name: 'Night Owl', description: 'Watch after midnight', icon: '🦉', rarity: 'uncommon' as const, category: 'viewing' as const, requirement: 1 },
  { id: 'early_bird', name: 'Early Bird', description: 'Watch before 8am', icon: '🌅', rarity: 'uncommon' as const, category: 'viewing' as const, requirement: 1 },
  
  // Episode achievements
  { id: 'episode_10', name: 'Decathlete', description: 'Watch 10 episodes', icon: '📺', rarity: 'common' as const, category: 'viewing' as const, requirement: 10 },
  { id: 'episode_50', name: 'Seasoned Viewer', description: 'Watch 50 episodes', icon: '📺', rarity: 'uncommon' as const, category: 'viewing' as const, requirement: 50 },
  { id: 'episode_100', name: 'Century Mark', description: 'Watch 100 episodes', icon: '🎯', rarity: 'rare' as const, category: 'viewing' as const, requirement: 100 },
  { id: 'episode_500', name: 'Half Millennium', description: 'Watch 500 episodes', icon: '🏆', rarity: 'epic' as const, category: 'viewing' as const, requirement: 500 },
  
  // Room achievements
  { id: 'first_room', name: 'Room Creator', description: 'Create your first room', icon: '🚪', rarity: 'common' as const, category: 'hosting' as const, requirement: 1 },
  { id: 'room_10', name: 'Social Host', description: 'Host 10 rooms', icon: '🎉', rarity: 'uncommon' as const, category: 'hosting' as const, requirement: 10 },
  { id: 'room_50', name: 'Party Planner', description: 'Host 50 rooms', icon: '🎊', rarity: 'rare' as const, category: 'hosting' as const, requirement: 50 },
  { id: 'crowd_controller', name: 'Crowd Controller', description: 'Host a room with 10+ people', icon: '👥', rarity: 'rare' as const, category: 'hosting' as const, requirement: 10 },
  { id: 'super_host', name: 'Super Host', description: 'Host a room with 50+ people', icon: '👑', rarity: 'epic' as const, category: 'hosting' as const, requirement: 50 },
  
  // Social achievements
  { id: 'first_friend', name: 'Friend Maker', description: 'Add your first friend', icon: '🤝', rarity: 'common' as const, category: 'social' as const, requirement: 1 },
  { id: 'friend_10', name: 'Social Butterfly', description: 'Have 10 friends', icon: '🦋', rarity: 'uncommon' as const, category: 'social' as const, requirement: 10 },
  { id: 'friend_50', name: 'Socialite', description: 'Have 50 friends', icon: '🌟', rarity: 'rare' as const, category: 'social' as const, requirement: 50 },
  { id: 'popular_host', name: 'Popular Host', description: 'Host with 5 different people in one week', icon: '🎪', rarity: 'epic' as const, category: 'social' as const, requirement: 5 },
  
  // Reaction achievements
  { id: 'first_reaction', name: 'First Reaction', description: 'Send your first reaction', icon: '💬', rarity: 'common' as const, category: 'reactions' as const, requirement: 1 },
  { id: 'reaction_100', name: 'Reaction Master', description: 'Send 100 reactions', icon: '🎭', rarity: 'uncommon' as const, category: 'reactions' as const, requirement: 100 },
  { id: 'reaction_1000', name: 'Reaction Legend', description: 'Send 1000 reactions', icon: '👑', rarity: 'epic' as const, category: 'reactions' as const, requirement: 1000 },
  { id: 'fullscreen_reaction', name: 'Fullscreen Fan', description: 'Use fullscreen reaction 10 times', icon: '🎪', rarity: 'rare' as const, category: 'reactions' as const, requirement: 10 },
  
  // Clip achievements
  { id: 'first_clip', name: 'Clip Creator', description: 'Create your first clip', icon: '✂️', rarity: 'common' as const, category: 'clips' as const, requirement: 1 },
  { id: 'clip_10', name: 'Clip Collector', description: 'Create 10 clips', icon: '📁', rarity: 'uncommon' as const, category: 'clips' as const, requirement: 10 },
  { id: 'clip_100', name: 'Clip Master', description: 'Create 100 clips', icon: '🏆', rarity: 'rare' as const, category: 'clips' as const, requirement: 100 },
  { id: 'viral_clip', name: 'Viral Star', description: 'Get 1000 views on a clip', icon: '🌟', rarity: 'epic' as const, category: 'clips' as const, requirement: 1000 },
  { id: 'shared_clip', name: 'Sharer', description: 'Share a clip to social media', icon: '📤', rarity: 'common' as const, category: 'clips' as const, requirement: 1 },
  
  // Special achievements
  { id: 'streak_7', name: 'Week Streak', description: 'Watch for 7 consecutive days', icon: '📅', rarity: 'rare' as const, category: 'special' as const, requirement: 7 },
  { id: 'streak_30', name: 'Monthly Streak', description: 'Watch for 30 consecutive days', icon: '🔥', rarity: 'epic' as const, category: 'special' as const, requirement: 30 },
  { id: 'streak_100', name: 'Century Streak', description: 'Watch for 100 consecutive days', icon: '👑', rarity: 'legendary' as const, category: 'special' as const, requirement: 100 },
  { id: 'anime_fan', name: 'Anime Fan', description: 'Watch 10 different anime', icon: '🇯🇵', rarity: 'uncommon' as const, category: 'special' as const, requirement: 10 },
  { id: 'anime_explorer', name: 'Anime Explorer', description: 'Watch 50 different anime', icon: '🌏', rarity: 'rare' as const, category: 'special' as const, requirement: 50 },
];

// In-memory user achievements (use database in production)
const userAchievements = new Map<string, {
  achievements: Achievement[];
  totalPoints: number;
  XP: number;
  level: number;
  streak: { current: number; longest: number; lastActive: number };
  stats: Record<string, number>;
}>();

// Check and award achievements
function checkAchievements(userId: string, statType: string, value: number) {
  const user = userAchievements.get(userId);
  if (!user) return;

  ACHIEVEMENTS.forEach(ach => {
    // Skip already completed
    if (user.achievements.find(a => a.id === ach.id)?.isCompleted) return;

    // Check if this achievement matches the stat type
    const categoryMap: Record<string, string> = {
      watch_time: 'viewing',
      episodes_watched: 'viewing',
      rooms_hosted: 'hosting',
      rooms_joined: 'hosting',
      reactions_sent: 'reactions',
      clips_created: 'clips',
      friends_count: 'social',
      unique_anime: 'special',
      streak_days: 'special',
    };

    if (categoryMap[statType] !== ach.category) return;

    // Check if requirement is met
    if (value >= ach.requirement) {
      // Award achievement
      const completedAt = Date.now();
      const newAch = {
        ...ach,
        currentProgress: ach.requirement,
        isCompleted: true,
        completedAt,
        unlockedAt: completedAt,
      };

      user.achievements.push(newAch);
      user.totalPoints += getRarityPoints(ach.rarity);
      user.XP += getRarityPoints(ach.rarity);
      user.level = Math.floor(user.XP / 1000) + 1;

      // Update streak
      const now = new Date();
      const lastActive = new Date(user.streak.lastActive);
      const daysDiff = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        user.streak.current += 1;
        user.streak.longest = Math.max(user.streak.longest, user.streak.current);
      } else if (daysDiff > 1) {
        user.streak.current = 0;
      }
      user.streak.lastActive = now.getTime();
    }
  });

  userAchievements.set(userId, user);
}

function getRarityPoints(rarity: string): number {
  const points: Record<string, number> = {
    common: 10,
    uncommon: 25,
    rare: 50,
    epic: 100,
    legendary: 250,
  };
  return points[rarity] || 0;
}

// Get user achievements
router.get('/', requireAuth, (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    const user = userAchievements.get(userId as string);
    
    if (!user) {
      // Create new user with no achievements
      return res.json({
        achievements: [],
        totalPoints: 0,
        XP: 0,
        level: 1,
        streak: { current: 0, longest: 0, lastActive: Date.now() },
        stats: {},
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Achievements error:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// Get all available achievements
router.get('/all', (req: Request, res: Response) => {
  res.json({ achievements: ACHIEVEMENTS });
});

// Get user progress for achievements
router.get('/progress/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = userAchievements.get(userId);
    
    if (!user) {
      return res.json({ progress: {} });
    }

    const progress = user.achievements.reduce((acc, ach) => {
      if (!ach.isCompleted) {
        acc[ach.id] = {
          current: ach.currentProgress,
          required: ach.requirement,
          percentage: Math.round((ach.currentProgress / ach.requirement) * 100),
        };
      }
      return acc;
    }, {} as Record<string, { current: number; required: number; percentage: number }>);

    res.json({ progress });
  } catch (error) {
    console.error('Progress error:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// Update user stats (called by other services)
router.post('/update-stat', requireAuth, (req: Request, res: Response) => {
  try {
    const { userId, statType, value } = req.body;
    
    let user = userAchievements.get(userId);
    if (!user) {
      user = {
        achievements: [],
        totalPoints: 0,
        XP: 0,
        level: 1,
        streak: { current: 0, longest: 0, lastActive: Date.now() },
        stats: {},
      };
    }

    // Update stat
    const currentValue = user.stats[statType] || 0;
    user.stats[statType] = Math.max(currentValue, value);
    
    // Check achievements
    checkAchievements(userId, statType, user.stats[statType]);
    
    userAchievements.set(userId, user);

    res.json({ success: true });
  } catch (error) {
    console.error('Update stat error:', error);
    res.status(500).json({ error: 'Failed to update stat' });
  }
});

// Get achievements for a specific user (public)
router.get('/public/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = userAchievements.get(userId);
    
    if (!user) {
      return res.json({ achievements: [], totalPoints: 0, level: 1 });
    }

    // Return only completed achievements for public view
    const completedAchievements = user.achievements.filter(a => a.isCompleted);
    
    res.json({
      achievements: completedAchievements,
      totalPoints: user.totalPoints,
      level: user.level,
    });
  } catch (error) {
    console.error('Public achievements error:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

export default router;
