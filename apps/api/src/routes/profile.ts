import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../lib/logger';
import { z } from 'zod';

const router = Router();

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

// GET /api/profile - Get current user's profile
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Failed to fetch profile:', error);
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch profile' } });
    }

    if (!profile) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Profile not found' } });
    }

    return res.json({ profile });
  } catch (error) {
    logger.error('Get profile error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// PATCH /api/profile - Update current user's profile
const updateProfileSchema = z.object({
  display_name: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional().nullable(),
  banner_url: z.string().url().optional().nullable(),
  status: z.enum(['online', 'offline', 'away', 'dnd', 'in_room']).optional(),
  custom_status: z.string().max(100).optional().nullable(),
  theme_preference: z.enum(['dark', 'light', 'system']).optional(),
  accent_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

router.patch('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        },
      });
    }

    const userId = req.userId!;
    const data = validation.data;

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update(data)
      .eq('id', userId)
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to update profile:', error);
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update profile' } });
    }

    return res.json({ profile });
  } catch (error) {
    logger.error('Update profile error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
