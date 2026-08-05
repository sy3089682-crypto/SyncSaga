import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';

const router = Router();

// In-memory room directory (use Redis + database in production)
const roomDirectory = new Map<string, {
  id: string;
  name: string;
  hostUsername: string;
  participantCount: number;
  maxParticipants: number;
  isPrivate: boolean;
  animeTitle?: string;
  animeCover?: string;
  currentEpisode?: string;
  tags: string[];
  createdAt: number;
  lastActivity: number;
  viewers: string[];
}>();

// Helper to calculate activity status
function getActivityStatus(lastActivity: number): 'active' | 'idle' | 'ending' {
  const now = Date.now();
  const idleThreshold = 5 * 60 * 1000; // 5 minutes
  const endingThreshold = 24 * 60 * 60 * 1000; // 24 hours
  
  if (now - lastActivity > endingThreshold) {
    return 'ending';
  }
  if (now - lastActivity > idleThreshold) {
    return 'idle';
  }
  return 'active';
}

// Get room directory
router.get('/', requireAuth, (req: Request, res: Response) => {
  try {
    const {
      query,
      tags,
      activity,
      maxParticipants,
      sortBy = 'activity',
      limit = 50,
      offset = 0,
    } = req.query;
    
    let rooms = Array.from(roomDirectory.values())
      .filter(room => !room.isPrivate) // Only public rooms
      .map(room => ({
        id: room.id,
        name: room.name,
        hostUsername: room.hostUsername,
        participantCount: room.participantCount,
        maxParticipants: room.maxParticipants,
        isPrivate: room.isPrivate,
        animeTitle: room.animeTitle,
        animeCover: room.animeCover,
        currentEpisode: room.currentEpisode,
        tags: room.tags,
        createdAt: room.createdAt,
        activity: getActivityStatus(room.lastActivity),
        viewerCount: room.viewers.length,
      }));
    
    // Filter by query
    if (query) {
      const q = (query as string).toLowerCase();
      rooms = rooms.filter(room =>
        room.name.toLowerCase().includes(q) ||
        room.animeTitle?.toLowerCase().includes(q) ||
        room.hostUsername.toLowerCase().includes(q)
      );
    }
    
    // Filter by tags
    if (tags) {
      const tagList = (tags as string).split(',');
      rooms = rooms.filter(room =>
        tagList.some(tag => room.tags.includes(tag))
      );
    }
    
    // Filter by activity
    if (activity) {
      rooms = rooms.filter(room => room.activity === activity);
    }
    
    // Filter by max participants
    if (maxParticipants) {
      rooms = rooms.filter(room => room.maxParticipants <= parseInt(maxParticipants as string));
    }
    
    // Sort
    switch (sortBy) {
      case 'activity':
        rooms.sort((a, b) => b.viewerCount - a.viewerCount || b.lastActivity - a.lastActivity);
        break;
      case 'participants':
        rooms.sort((a, b) => b.participantCount - a.participantCount);
        break;
      case 'alphabetical':
        rooms.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        rooms.sort((a, b) => b.viewerCount - a.viewerCount);
    }
    
    // Pagination
    const total = rooms.length;
    rooms = rooms.slice(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string));
    
    res.json({
      rooms,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + rooms.length < total,
      },
    });
  } catch (error) {
    console.error('Directory error:', error);
    res.status(500).json({ error: 'Failed to fetch directory' });
  }
});

// Get single room details
router.get('/:roomId', requireAuth, (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = roomDirectory.get(roomId);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json({
      id: room.id,
      name: room.name,
      hostUsername: room.hostUsername,
      participantCount: room.participantCount,
      maxParticipants: room.maxParticipants,
      isPrivate: room.isPrivate,
      animeTitle: room.animeTitle,
      animeCover: room.animeCover,
      currentEpisode: room.currentEpisode,
      tags: room.tags,
      createdAt: room.createdAt,
      activity: getActivityStatus(room.lastActivity),
      viewerCount: room.viewers.length,
    });
  } catch (error) {
    console.error('Room detail error:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// Update room activity (called by room service)
router.post('/:roomId/activity', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = roomDirectory.get(roomId);
    
    if (room) {
      room.lastActivity = Date.now();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Room not found' });
    }
  } catch (error) {
    console.error('Activity update error:', error);
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

// Add room to directory (called when room is created)
router.post('/', requireAuth, (req: Request, res: Response) => {
  try {
    const { id, name, hostUsername, maxParticipants, isPrivate, animeTitle, animeCover, currentEpisode, tags } = req.body;
    
    if (!id || !name || !hostUsername) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const room = {
      id,
      name,
      hostUsername,
      participantCount: 1,
      maxParticipants: maxParticipants || 10,
      isPrivate: isPrivate || false,
      animeTitle,
      animeCover,
      currentEpisode,
      tags: tags || [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
      viewers: [],
    };
    
    roomDirectory.set(id, room);
    
    res.json({ success: true, room });
  } catch (error) {
    console.error('Add room error:', error);
    res.status(500).json({ error: 'Failed to add room' });
  }
});

// Remove room from directory (called when room is deleted)
router.delete('/:roomId', requireAuth, (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    roomDirectory.delete(roomId);
    res.json({ success: true });
  } catch (error) {
    console.error('Remove room error:', error);
    res.status(500).json({ error: 'Failed to remove room' });
  }
});

// Update room info
router.patch('/:roomId', requireAuth, (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = roomDirectory.get(roomId);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const updates = req.body;
    
    if (updates.name) room.name = updates.name;
    if (updates.maxParticipants) room.maxParticipants = updates.maxParticipants;
    if (updates.tags) room.tags = updates.tags;
    if (updates.animeTitle !== undefined) room.animeTitle = updates.animeTitle;
    if (updates.animeCover !== undefined) room.animeCover = updates.animeCover;
    if (updates.currentEpisode !== undefined) room.currentEpisode = updates.currentEpisode;
    
    room.lastActivity = Date.now();
    
    res.json({ success: true, room });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// Update viewer count
router.post('/:roomId/viewers', (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { userId, action } = req.body; // action: 'join' | 'leave'
    
    const room = roomDirectory.get(roomId);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (action === 'join' && !room.viewers.includes(userId)) {
      room.viewers.push(userId);
    } else if (action === 'leave') {
      room.viewers = room.viewers.filter(id => id !== userId);
    }
    
    room.lastActivity = Date.now();
    
    res.json({ 
      success: true, 
      viewerCount: room.viewers.length 
    });
  } catch (error) {
    console.error('Viewer update error:', error);
    res.status(500).json({ error: 'Failed to update viewers' });
  }
});

// Cleanup old rooms (runs every hour)
setInterval(() => {
  const now = Date.now();
  const expirationTime = 48 * 60 * 60 * 1000; // 48 hours
  
  for (const [roomId, room] of roomDirectory.entries()) {
    if (now - room.createdAt > expirationTime && room.viewers.length === 0) {
      roomDirectory.delete(roomId);
    }
  }
  
  console.log(`Cleaned up old rooms. Total rooms: ${roomDirectory.size}`);
}, 60 * 60 * 1000);

export default router;
