import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { logger } from '../lib/logger';

const router = Router();

router.get('/', requireAuth, async (_req, res) => {
  try {
    // In a full implementation, we'd fetch from a 'notifications' table
    res.json({ notifications: [] });
  } catch (error) {
    logger.error(error, 'Fetch notifications error');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch notifications' } });
  }
});

export default router;
