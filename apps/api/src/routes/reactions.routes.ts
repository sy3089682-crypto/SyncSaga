import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';

const router = Router();

// In-memory reactions store (use Redis/database in production)
const reactions = new Map<string, {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  type: string;
  timestamp: number;
  episodeTimestamp?: number;
  isFullscreen: boolean;
  likes: number;
  likedBy: string[];
}>();

// Get reactions for a room
router.get('/room/:roomId', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { limit = 100, offset = 0, type, timestamp } = req.query;
    
    let roomReactions = Array.from(reactions.values())
      .filter(r => r.roomId === roomId);
    
    // Filter by type
    if (type) {
      roomReactions = roomReactions.filter(r => r.type === type);
    }
    
    // Filter by episode timestamp
    if (timestamp) {
      const ts = parseInt(timestamp as string);
      roomReactions = roomReactions.filter(r => 
        r.episodeTimestamp && Math.abs(r.episodeTimestamp - ts) < 5
      );
    }
    
    // Sort by timestamp
    roomReactions.sort((a, b) => b.timestamp - a.timestamp);
    
    // Paginate
    const total = roomReactions.length;
    const paginated = roomReactions.slice(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string));
    
    res.json({
      reactions: paginated,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + paginated.length < total,
      },
    });
  } catch (error) {
    console.error('Get reactions error:', error);
    res.status(500).json({ error: 'Failed to fetch reactions' });
  }
});

// Add reaction
router.post('/add', requireAuth, (req: Request, res: Response) => {
  try {
    const { roomId, type, timestamp, episodeTimestamp, fullscreen } = req.body;
    const userId = req.user?.id;
    const username = req.user?.username || 'User';
    
    if (!roomId || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const reaction = {
      id: `reaction_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      roomId,
      userId,
      username,
      type,
      timestamp: timestamp || Date.now(),
      episodeTimestamp,
      isFullscreen: fullscreen || false,
      likes: 0,
      likedBy: [],
    };
    
    reactions.set(reaction.id, reaction);
    
    res.json({ reaction });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// Like reaction
router.post('/like', requireAuth, (req: Request, res: Response) => {
  try {
    const { reactionId } = req.body;
    const userId = req.user?.id;
    
    const reaction = reactions.get(reactionId);
    if (!reaction) {
      return res.status(404).json({ error: 'Reaction not found' });
    }
    
    const hasLiked = reaction.likedBy.includes(userId);
    
    if (hasLiked) {
      reaction.likedBy = reaction.likedBy.filter(id => id !== userId);
      reaction.likes -= 1;
    } else {
      reaction.likedBy.push(userId);
      reaction.likes += 1;
    }
    
    res.json({ reaction, liked: !hasLiked });
  } catch (error) {
    console.error('Like reaction error:', error);
    res.status(500).json({ error: 'Failed to like reaction' });
  }
});

// Remove reaction
router.delete('/:reactionId', requireAuth, (req: Request, res: Response) => {
  try {
    const { reactionId } = req.params;
    const userId = req.user?.id;
    
    const reaction = reactions.get(reactionId);
    if (!reaction) {
      return res.status(404).json({ error: 'Reaction not found' });
    }
    
    // Only creator or host can remove
    if (reaction.userId !== userId && req.user?.role !== 'host') {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    reactions.delete(reactionId);
    res.json({ success: true });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
});

// Get reaction counts for a room
router.get('/room/:roomId/counts', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    
    const counts: Record<string, number> = {};
    
    reactions.forEach(reaction => {
      if (reaction.roomId === roomId) {
        counts[reaction.type] = (counts[reaction.type] || 0) + 1;
      }
    });
    
    res.json({ counts });
  } catch (error) {
    console.error('Get counts error:', error);
    res.status(500).json({ error: 'Failed to get counts' });
  }
});

// Get recent reactions (for sidebar)
router.get('/room/:roomId/recent', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { limit = 10 } = req.query;
    
    const recent = Array.from(reactions.values())
      .filter(r => r.roomId === roomId && !r.isFullscreen)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, parseInt(limit as string));
    
    res.json({ reactions: recent });
  } catch (error) {
    console.error('Get recent error:', error);
    res.status(500).json({ error: 'Failed to get recent reactions' });
  }
});

export default router;
