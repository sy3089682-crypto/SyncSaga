import { Router, Request, Response } from 'express';
import { roomService } from '../services/room.service';
import { verifyToken } from '../lib/jwt';
import { z } from 'zod';

const router = Router();

function requireAuth(req: Request, res: Response): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return null;
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    res.status(401).json({ error: 'Invalid token' });
    return null;
  }

  return decoded.userId;
}

router.get('/', async (_req, res) => {
  const rooms = await roomService.getPublicRooms(50);
  res.json({ rooms });
});

router.get('/:id', async (req, res) => {
  const room = await roomService.getRoom(req.params.id);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({ room });
});

const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isPrivate: z.boolean().optional(),
  maxUsers: z.number().min(2).max(50).optional(),
  animeTitle: z.string().optional(),
  animeMediaId: z.number().optional(),
});

router.post('/', async (req, res) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  try {
    const data = createRoomSchema.parse(req.body);
    const room = await roomService.createRoom({
      ...data,
      hostId: userId,
      animeTitle: data.animeTitle,
      animeMediaId: data.animeMediaId,
    });

    if (!room) {
      return res.status(500).json({ error: 'Failed to create room' });
    }

    res.status(201).json({ room });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as roomRouter };
