import { Router } from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { getEnv } from '@syncsaga/config';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { z } from 'zod';
import { logger } from '../lib/logger';

const router = Router();

const tokenSchema = z.object({
  roomName: z.string(),
  isHost: z.boolean().optional().default(false),
});

router.post('/token', requireAuth, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.userId!;
    const env = getEnv();

    const parsed = tokenSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid payload' } });
    }

    const { roomName, isHost } = parsed.data;

    // Verify user is in the room
    const { data: member } = await supabase
      .from('room_members')
      .select('id')
      .eq('room_id', roomName)
      .eq('user_id', userId)
      .single();

    if (!member) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not a member of this room' } });
    }

    // Verify user profile for name
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();

    const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      identity: userId,
      name: profile?.username || 'User',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isHost,
    });

    const token = await at.toJwt();
    res.json({ token, url: env.NEXT_PUBLIC_LIVEKIT_URL });
  } catch (error) {
    logger.error(error, 'LiveKit token error:');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to generate token' } });
  }
});

export default router;
