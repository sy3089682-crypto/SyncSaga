import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../lib/logger';

const router = Router();

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

// GET /api/users/search?q= - Search users by username
router.get('/search', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json({ users: [] });
    }

    // Search profiles by username or display_name
    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username, display_name, avatar_url, status')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .neq('id', userId)
      .limit(20);

    if (error) {
      logger.error('User search error:', error);
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to search users' } });
    }

    // Exclude existing friends and pending requests
    const { data: friendships } = await supabaseAdmin
      .from('friendships')
      .select('requester_id, addressee_id, status')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    const friendIds = new Set<string>();
    (friendships || []).forEach((f: any) => {
      friendIds.add(f.requester_id);
      friendIds.add(f.addressee_id);
    });

    const filtered = (users || []).filter((u: any) => !friendIds.has(u.id));

    return res.json({ users: filtered });
  } catch (error) {
    logger.error('User search error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
