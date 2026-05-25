import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { verifyToken } from '../lib/jwt';

const router = Router();

function getUser(req: any): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const decoded = verifyToken(auth.slice(7));
  return decoded?.userId || null;
}

// POST /api/clips — Create a clip moment
router.post('/', async (req, res) => {
  const userId = getUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { roomId, animeTitle, episodeNumber, startTime, endTime, title, description } = req.body;
  if (!animeTitle || startTime === undefined || endTime === undefined) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const { data, error } = await supabase.from('clips').insert({
    user_id: userId, room_id: roomId, anime_title: animeTitle,
    episode_number: episodeNumber, start_time: startTime, end_time: endTime,
    title, description,
  }).select('*').single();

  if (error) return res.status(500).json({ error: error.message });

  // Add to activity feed
  await supabase.from('activity_feed').insert({
    user_id: userId, type: 'clip_created',
    data: { clipId: data.id, animeTitle, episodeNumber },
  });

  res.json({ clip: data });
});

// GET /api/clips — Browse clips
router.get('/', async (req, res) => {
  const { anime, limit = '20', offset = '0' } = req.query;
  let query = supabase.from('clips')
    .select('*, profiles:user_id(username, avatar_url)')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(parseInt(limit as string))
    .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

  if (anime) query = query.ilike('anime_title', `%${anime}%`);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ clips: data });
});

// GET /api/clips/:id — Get single clip
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase.from('clips')
    .select('*, profiles:user_id(username, avatar_url)')
    .eq('id', req.params.id).single();

  if (error) return res.status(404).json({ error: 'Clip not found' });

  await supabase.from('clips').update({ view_count: data.view_count + 1 }).eq('id', req.params.id);

  res.json({ clip: data });
});

export default router;
