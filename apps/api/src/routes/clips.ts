import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { logger } from '../lib/logger';

const router = Router();

const createClipSchema = z.object({
  roomId: z.string().uuid().optional(),
  animeTitle: z.string().min(1).max(200),
  episodeNumber: z.number().int().min(1).optional(),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
});

const browseClipsSchema = z.object({
  anime: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// POST /api/clips — Create a clip moment
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const validation = createClipSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ') },
      });
    }

    const { roomId, animeTitle, episodeNumber, startTime, endTime, title, description } = validation.data;

    if (endTime <= startTime) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'endTime must be greater than startTime' } });
    }

    const { data, error } = await supabase.from('clips').insert({
      user_id: req.userId,
      room_id: roomId,
      anime_title: animeTitle,
      episode_number: episodeNumber,
      start_time: startTime,
      end_time: endTime,
      title,
      description,
    }).select('*').single();

    if (error) {
      logger.error({ err: error }, 'Failed to create clip');
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create clip' } });
    }

    // Add to activity feed
    await supabase.from('activity_feed').insert({
      user_id: req.userId,
      type: 'clip_created',
      data: { clipId: data.id, animeTitle, episodeNumber },
    });

    res.status(201).json({ clip: data });
  } catch (error) {
    logger.error({ err: error }, 'Clip creation error');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// GET /api/clips — Browse clips with pagination
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const validation = browseClipsSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ') },
      });
    }

    const { anime, limit, offset } = validation.data;

    let query = supabase.from('clips')
      .select('*, profiles:user_id(username, avatar_url)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (anime) query = query.ilike('anime_title', `%${anime}%`);

    const { data, error } = await query;
    if (error) {
      logger.error({ err: error }, 'Failed to browse clips');
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch clips' } });
    }

    res.json({ clips: data || [] });
  } catch (error) {
    logger.error({ err: error }, 'Clip browse error');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// GET /api/clips/:id — Get a single clip
router.get('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('clips')
      .select('*, profiles:user_id(username, avatar_url)')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Clip not found' } });
    }

    res.json({ clip: data });
  } catch (error) {
    logger.error({ err: error }, 'Clip fetch error');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// DELETE /api/clips/:id — Delete a clip (owner only)
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('clips')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId!);

    if (error) {
      logger.error({ err: error }, 'Failed to delete clip');
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete clip' } });
    }

    res.status(204).send();
  } catch (error) {
    logger.error({ err: error }, 'Clip deletion error');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
