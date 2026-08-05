import { Router, Request, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// In-memory clips store (use database in production)
const clips = new Map<string, {
  id: string;
  roomId: string;
  startTime: number;
  endTime: number;
  duration: number;
  episodeTitle?: string;
  episodeId?: string;
  views: number;
  shares: number;
  likes: number;
  likedBy: string[];
  createdBy: string;
  createdByName: string;
  createdAt: number;
  privacy: 'public' | 'unlisted' | 'private';
  tags: string[];
}>();

// Get clips for a room
router.get('/room/:roomId', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { limit = 20, offset = 0, sort = 'newest' } = req.query;
    
    let roomClips = Array.from(clips.values())
      .filter(c => c.roomId === roomId && c.privacy !== 'private');
    
    // Sort
    switch (sort) {
      case 'popular':
        roomClips.sort((a, b) => (b.views + b.likes) - (a.views + a.likes));
        break;
      case 'oldest':
        roomClips.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'newest':
      default:
        roomClips.sort((a, b) => b.createdAt - a.createdAt);
    }
    
    // Paginate
    const total = roomClips.length;
    const paginated = roomClips.slice(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string));
    
    res.json({
      clips: paginated,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + paginated.length < total,
      },
    });
  } catch (error) {
    console.error('Get clips error:', error);
    res.status(500).json({ error: 'Failed to fetch clips' });
  }
});

// Create clip
router.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { roomId, startTime, endTime, episodeTitle, episodeId, privacy = 'public', tags } = req.body;
    const userId = req.user!.id;
    const username = req.user?.username || 'User';
    
    if (!roomId || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (endTime <= startTime) {
      return res.status(400).json({ error: 'End time must be after start time' });
    }
    
    if (endTime - startTime > 60) {
      return res.status(400).json({ error: 'Clips cannot exceed 60 seconds' });
    }
    
    const clip = {
      id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      roomId,
      startTime,
      endTime,
      duration: endTime - startTime,
      episodeTitle,
      episodeId,
      views: 0,
      shares: 0,
      likes: 0,
      likedBy: [],
      createdBy: userId,
      createdByName: username,
      createdAt: Date.now(),
      privacy,
      tags: tags || [],
    };
    
    clips.set(clip.id, clip);
    
    res.json({ clip });
  } catch (error) {
    console.error('Create clip error:', error);
    res.status(500).json({ error: 'Failed to create clip' });
  }
});

// Like clip
router.post('/like', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clipId } = req.body;
    const userId = req.user!.id;
    
    const clip = clipId ? clips.get(clipId) : undefined;
    if (!clip) {
      return res.status(404).json({ error: 'Clip not found' });
    }
    
    const hasLiked = clip.likedBy.includes(userId);
    
    if (hasLiked) {
      clip.likedBy = clip.likedBy.filter(id => id !== userId);
      clip.likes -= 1;
    } else {
      clip.likedBy.push(userId);
      clip.likes += 1;
    }
    
    res.json({ clip, liked: !hasLiked });
  } catch (error) {
    console.error('Like clip error:', error);
    res.status(500).json({ error: 'Failed to like clip' });
  }
});

// Share clip
router.post('/share', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clipId, platform } = req.body;
    
    const clip = clipId ? clips.get(clipId) : undefined;
    if (!clip) {
      return res.status(404).json({ error: 'Clip not found' });
    }
    
    // Track share
    clip.shares += 1;
    
    res.json({ clip, shareUrl: `/clip/${clipId}` });
  } catch (error) {
    console.error('Share clip error:', error);
    res.status(500).json({ error: 'Failed to share clip' });
  }
});

// Increment view count
router.post('/view', (req: Request, res: Response) => {
  try {
    const { clipId } = req.body;
    
    const clip = clipId ? clips.get(clipId) : undefined;
    if (clip) {
      clip.views += 1;
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('View clip error:', error);
    res.status(500).json({ error: 'Failed to increment view' });
  }
});

// Get single clip
router.get('/:clipId', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clipId } = req.params;
    const clip = clipId! ? clips.get(clipId!) : undefined;
    
    if (!clip) {
      return res.status(404).json({ error: 'Clip not found' });
    }
    
    // Check privacy
    if (clip.privacy === 'private') {
      return res.status(403).json({ error: 'This clip is private' });
    }
    
    res.json({ clip });
  } catch (error) {
    console.error('Get clip error:', error);
    res.status(500).json({ error: 'Failed to get clip' });
  }
});

// Delete clip
router.delete('/:clipId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { clipId } = req.params;
    const userId = req.user!.id;
    
    const clip = clipId ? clips.get(clipId) : undefined;
    if (!clip) {
      return res.status(404).json({ error: 'Clip not found' });
    }
    
    // Only creator can delete
    if (clip.createdBy !== req.user!.id) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    clips.delete(clipId!);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete clip error:', error);
    res.status(500).json({ error: 'Failed to delete clip' });
  }
});

// Get trending clips (across all rooms)
router.get('/trending', (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    
    const trending = Array.from(clips.values())
      .filter(c => c.privacy !== 'private')
      .sort((a, b) => (b.views + b.likes * 2 + b.shares * 3) - (a.views + a.likes * 2 + a.shares * 3))
      .slice(0, parseInt(limit as string));
    
    res.json({ clips: trending });
  } catch (error) {
    console.error('Get trending error:', error);
    res.status(500).json({ error: 'Failed to get trending clips' });
  }
});

export default router;
