import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';
import { z } from 'zod';
import { logger } from '../lib/logger';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    // In a full implementation, we'd fetch from a 'notifications' table
    res.json({ notifications: [] });
  } catch (error) {
    logger.error(error, 'Fetch notifications error');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch notifications' } });
  }
});

export default router;
