import { Router, Request, Response } from 'express';
import { roomService, decodeRoomCursor } from '../services/room.service';
import { z } from 'zod';
import { getAuthenticatedUser } from '../middleware/auth';

const router = Router();
const requireAuth = getAuthenticatedUser;

const listRoomsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z.string().optional(),
  animeMediaId: z.coerce.number().int().positive().optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

router.get('/', async (req, res) => {
  const params = listRoomsSchema.safeParse(req.query);
  if (!params.success) return res.status(400).json({ error: 'Invalid query', details: params.error.errors });

  const cursor = decodeRoomCursor(params.data.cursor);
  if (params.data.cursor && !cursor) return res.status(400).json({ error: 'Invalid cursor' });

  const page = await roomService.getPublicRoomsPage({ ...params.data, cursor });
  res.json(page);
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
  password: z.string().min(8).max(128).optional(),
}).superRefine((data, ctx) => {
  if (data.isPrivate && !data.password) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['password'], message: 'Password is required for private rooms' });
  }
});

router.post('/', async (req: Request, res: Response) => {
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
