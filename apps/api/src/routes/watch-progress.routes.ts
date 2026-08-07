import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { supabase } from '../lib/supabase';

const router = Router();

// Validation schemas
const watchProgressUpdateSchema = z.object({
  anime_id: z.number().int().positive(),
  anime_title: z.string().min(1).max(200),
  anime_cover_url: z.string().url().nullable().optional(),
  episode: z.number().int().positive(),
  season: z.number().int().positive().default(1),
  timestamp: z.number().nonnegative(),
  duration: z.number().positive().optional(),
  completed: z.boolean().optional(),
});

const watchProgressQuerySchema = z.object({
  anime_id: z.number().int().positive().optional(),
  episode: z.number().int().positive().optional(),
  season: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
});

// GET /api/watch-progress - Get user's watch progress (with optional filters)
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const query = watchProgressQuerySchema.parse(req.query);
    
    let queryBuilder = supabase
      .from('watch_progress')
      .select('*')
      .eq('user_id', userId)
      .order('last_watched_at', { ascending: false });
    
    if (query.anime_id) queryBuilder = queryBuilder.eq('anime_id', query.anime_id);
    if (query.episode) queryBuilder = queryBuilder.eq('episode', query.episode);
    if (query.season) queryBuilder = queryBuilder.eq('season', query.season);
    
    queryBuilder = queryBuilder.range(query.offset, query.offset + query.limit - 1);
    
    const { data, error, count } = await queryBuilder;
    
    if (error) {
      console.error('Watch progress fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch watch progress' });
    }
    
    return res.json({ 
      progress: data || [], 
      total: count,
      limit: query.limit,
      offset: query.offset
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    console.error('Watch progress GET error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/watch-progress/continue-watching - Get continue watching items
router.get('/continue-watching', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const { data, error } = await supabase
      .from('watch_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('completed', false)
      .order('last_watched_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Continue watching fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch continue watching' });
    }
    
    // Transform to continue watching format with computed progress
    const continueWatching = (data || []).map(item => ({
      anime_id: item.anime_id,
      anime_title: item.anime_title,
      anime_cover_url: item.anime_cover_url,
      episode: item.episode,
      season: item.season,
      timestamp: item.timestamp,
      duration: item.duration,
      progress: item.duration ? Math.min(100, Math.max(0, (item.timestamp / item.duration) * 100)) : 0,
      last_watched_at: item.last_watched_at,
      room_id: null // Could be extended with room context
    }));
    
    return res.json({ continue_watching: continueWatching });
  } catch (error) {
    console.error('Continue watching error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/watch-progress/:animeId/:episode/:season - Get specific progress
router.get('/:animeId/:episode/:season', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const animeId = parseInt(req.params.animeId as string);
    const episode = parseInt(req.params.episode as string);
    const season = parseInt(req.params.season as string) || 1;
    
    if (isNaN(animeId) || isNaN(episode)) {
      return res.status(400).json({ error: 'Invalid anime ID or episode' });
    }
    
    const { data, error } = await supabase
      .from('watch_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('anime_id', animeId)
      .eq('episode', episode)
      .eq('season', season)
      .single();
    
    if (error && error.code !== 'PGRST116') { // Not found is ok
      console.error('Watch progress fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch watch progress' });
    }
    
    return res.json({ progress: data || null });
  } catch (error) {
    console.error('Watch progress GET single error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/watch-progress - Create or update watch progress
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const body = watchProgressUpdateSchema.parse(req.body);
    
    // Compute progress if duration provided
    const progress = body.duration 
      ? Math.min(100, Math.max(0, (body.timestamp / body.duration) * 100))
      : 0;
    
    const completed = body.completed ?? (body.duration && body.timestamp >= body.duration * 0.95);
    
    // Upsert watch progress
    const { data, error } = await supabase
      .from('watch_progress')
      .upsert({
        user_id: userId,
        anime_id: body.anime_id,
        anime_title: body.anime_title,
        anime_cover_url: body.anime_cover_url ?? null,
        episode: body.episode,
        season: body.season,
        timestamp: body.timestamp,
        duration: body.duration ?? null,
        completed: completed,
        last_watched_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,anime_id,episode,season',
        ignoreDuplicates: false
      })
      .select()
      .single();
    
    if (error) {
      console.error('Watch progress upsert error:', error);
      return res.status(500).json({ error: 'Failed to save watch progress' });
    }
    
    // Also update watch_history table for activity feed
    await supabase.from('watch_history').upsert({
      user_id: userId,
      anime_title: body.anime_title,
      episode_number: body.episode,
      episode_title: `Episode ${body.episode}`,
      timestamp: body.timestamp,
      duration: body.duration ?? null,
      completed: completed,
    }, {
      onConflict: 'user_id,anime_title,episode_number',
      ignoreDuplicates: false
    });
    
    // Emit real-time event for room members (if watching in a room)
    // This would be handled by Socket.io on the frontend
    
    return res.status(201).json({ 
      progress: {
        ...data,
        progress: data.duration ? Math.min(100, Math.max(0, (data.timestamp / data.duration) * 100)) : 0
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request body', details: error.errors });
    }
    console.error('Watch progress POST error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/watch-progress/:animeId/:episode/:season - Update specific progress
router.patch('/:animeId/:episode/:season', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const animeId = parseInt(req.params.animeId as string);
    const episode = parseInt(req.params.episode as string);
    const season = parseInt(req.params.season as string) || 1;
    
    if (isNaN(animeId) || isNaN(episode)) {
      return res.status(400).json({ error: 'Invalid anime ID or episode' });
    }
    
    const body = watchProgressUpdateSchema.partial().parse(req.body);
    
    // Build update object
    const updateData: any = {
      ...body,
      last_watched_at: new Date().toISOString(),
    };
    
    // Recalculate progress if timestamp or duration changed
    if (body.timestamp !== undefined || body.duration !== undefined) {
      // We need current values to compute - fetch first
      const { data: current } = await supabase
        .from('watch_progress')
        .select('timestamp, duration')
        .eq('user_id', userId)
        .eq('anime_id', animeId)
        .eq('episode', episode)
        .eq('season', season)
        .single();
      
      const timestamp = body.timestamp ?? current?.timestamp ?? 0;
      const duration = body.duration ?? current?.duration;
      
      if (duration) {
        updateData.completed = body.completed ?? (timestamp >= duration * 0.95);
      }
    }
    
    const { data, error } = await supabase
      .from('watch_progress')
      .update(updateData)
      .eq('user_id', userId)
      .eq('anime_id', animeId)
      .eq('episode', episode)
      .eq('season', season)
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Watch progress not found' });
      }
      console.error('Watch progress update error:', error);
      return res.status(500).json({ error: 'Failed to update watch progress' });
    }
    
    // Also update watch_history
    if (body.timestamp !== undefined) {
      await supabase.from('watch_history').upsert({
        user_id: userId,
        anime_title: data.anime_title,
        episode_number: episode,
        episode_title: `Episode ${episode}`,
        timestamp: body.timestamp,
        duration: body.duration ?? data.duration ?? null,
        completed: data.completed,
      }, {
        onConflict: 'user_id,anime_title,episode_number',
        ignoreDuplicates: false
      });
    }
    
    return res.json({ 
      progress: {
        ...data,
        progress: data.duration ? Math.min(100, Math.max(0, (data.timestamp / data.duration) * 100)) : 0
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request body', details: error.errors });
    }
    console.error('Watch progress PATCH error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/watch-progress/:animeId/:episode/:season - Delete progress
router.delete('/:animeId/:episode/:season', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const animeId = parseInt(req.params.animeId as string);
    const episode = parseInt(req.params.episode as string);
    const season = parseInt(req.params.season as string) || 1;
    
    if (isNaN(animeId) || isNaN(episode)) {
      return res.status(400).json({ error: 'Invalid anime ID or episode' });
    }
    
    const { error } = await supabase
      .from('watch_progress')
      .delete()
      .eq('user_id', userId)
      .eq('anime_id', animeId)
      .eq('episode', episode)
      .eq('season', season);
    
    if (error) {
      console.error('Watch progress delete error:', error);
      return res.status(500).json({ error: 'Failed to delete watch progress' });
    }
    
    return res.status(204).send();
  } catch (error) {
    console.error('Watch progress DELETE error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
