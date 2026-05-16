import { Router } from 'express';
import { roomService } from '../services/room.service';
import { z } from 'zod';

const router = Router();

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

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isPrivate: z.boolean().optional(),
  maxUsers: z.number().min(2).max(50).optional(),
});

router.post('/', async (req, res) => {
  try {
    // TODO: Add auth middleware to get userId from token
    const userId = req.body.userId || '00000000-0000-0000-0000-000000000000';
    const data = createSchema.parse(req.body);
    
    const room = await roomService.createRoom({
      ...data,
      hostId: userId,
    });

    if (!room) {
      return res.status(500).json({ error: 'Failed to create room' });
    }

    res.status(201).json({ room });
  } catch (error) {
    res.status(400).json({ error: 'Invalid request' });
  }
});

export { router as roomRouter };
