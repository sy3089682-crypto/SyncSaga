import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Queue item schema
const queueItemSchema = z.object({
  title: z.string().min(1).max(200),
  url: z.string().url().optional(),
  thumbnail: z.string().url().optional(),
  episode: z.number().int().min(1).optional(),
  animeId: z.string().optional(),
});

// In-memory queue store (use Redis in production)
const queues = new Map<string, Map<string, {
  id: string;
  title: string;
  url?: string;
  thumbnail?: string;
  addedBy: string;
  addedAt: number;
  votes: number;
  voters: string[];
  episode?: number;
  animeId?: string;
}>>();

// Helper to get or create room queue
function getRoomQueue(roomId: string): Map<string, any> {
  if (!queues.has(roomId)) {
    queues.set(roomId, new Map());
  }
  return queues.get(roomId)!;
}

// Helper to broadcast queue update
function broadcastQueueUpdate(roomId: string, io: any) {
  const queue = getRoomQueue(roomId as string);
  const items = Array.from(queue.values())
    .sort((a, b) => b.votes - a.votes || b.addedAt - a.addedAt);
  
  io.to(`room:${roomId}`).emit(`queue:update:${roomId}`, items);
}

// Get room queue
router.get('/:roomId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const queue = getRoomQueue(roomId as string);
  
  const items = Array.from(queue.values())
    .sort((a, b) => b.votes - a.votes || b.addedAt - a.addedAt);
  
  res.json({ items });
});

// Add item to queue
router.post('/add', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { roomId, item } = req.body;
    const validatedItem = queueItemSchema.parse(item);
    
    const queue = getRoomQueue(roomId as string);
    const id = `item_${uuidv4().slice(0, 8)}`;
    
    const newItem = {
      id,
      title: validatedItem.title,
      url: validatedItem.url,
      thumbnail: validatedItem.thumbnail,
      episode: validatedItem.episode,
      animeId: validatedItem.animeId,
      addedBy: req.user!.id || 'unknown',
      addedAt: Date.now(),
      votes: 0,
      voters: [],
    };
    
    queue.set(id, newItem);
    
    // Emit to room via socket
    // This would be handled by the Socket.IO handler
    
    res.json({ item: newItem });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid item data' });
    } else {
      console.error('Add to queue error:', error);
      res.status(500).json({ error: 'Failed to add item' });
    }
  }
});

// Vote for item
router.post('/vote', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { roomId, itemId } = req.body;
    
    if (!roomId || !itemId) {
      return res.status(400).json({ error: 'Missing roomId or itemId' });
    }
    
    const queue = getRoomQueue(roomId as string);
    const item = queue.get(itemId);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Check if user already voted
    if (item.voters.includes(req.user!.id)) {
      return res.status(400).json({ error: 'Already voted' });
    }
    
    // Add vote
    item.votes += 1;
    item.voters.push(req.user!.id);
    
    res.json({ item });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// Remove item
router.post('/remove', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { roomId, itemId } = req.body;
    const queue = getRoomQueue(roomId as string);
    const item = queue.get(itemId);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Check permissions (only adder or host can remove)
    const userId = req.user?.id;
    if (item.addedBy !== req.user!.id) {
      // Would check if user is host in production
      return res.status(403).json({ error: 'Permission denied' });
    }
    
    queue.delete(itemId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Remove error:', error);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

// Move item (reorder)
router.post('/move', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { roomId, itemId, newIndex } = req.body;
    const queue = getRoomQueue(roomId as string);
    const item = queue.get(itemId);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Reorder logic would be implemented here
    // For now, just return success
    
    res.json({ success: true });
  } catch (error) {
    console.error('Move error:', error);
    res.status(500).json({ error: 'Failed to move item' });
  }
});

// Clear queue (host only)
router.post('/clear', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { roomId } = req.body;
    const queue = getRoomQueue(roomId as string);
    
    // Would check if user is host in production
    // For now allow anyone to clear
    queue.clear();
    res.json({ success: true });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Clear error:', error);
    res.status(500).json({ error: 'Failed to clear queue' });
  }
});

// Get top items (for recommendations)
router.get('/:roomId/top/:limit', (req: AuthenticatedRequest, res: Response) => {
  const roomId = req.params.roomId as string;
  const limit = parseInt(req.params.limit as string) || 5;
  
  const queue = getRoomQueue(roomId);
  const items = Array.from(queue.values())
    .sort((a, b) => b.votes - a.votes)
    .slice(0, limit);
  
  res.json({ items });
});

export default router;
