import { Router, Request } from 'express';
import { supabase } from '../lib/supabase';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all routes in this router
router.use(authMiddleware);



// GET /api/activity — Friends activity feed
router.get('/', async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;

  const { limit = '30' } = req.query;

  // Get friend IDs
  const { data: friendships } = await supabase
    .from('friendships')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted');

  if (!friendships) return res.json({ activities: [] });

  const friendIds = friendships.map(f =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  );
  friendIds.push(userId);

  const { data, error } = await supabase
    .from('activity_feed')
    .select('*, profiles:user_id(username, display_name, avatar_url)')
    .in('user_id', friendIds)
    .order('created_at', { ascending: false })
    .limit(parseInt(limit as string));

  if (error) return res.status(500).json({ error: error.message });
  res.json({ activities: data });
});

// GET /api/activity/recommendations — Taste graph recommendations
router.get('/recommendations', async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;

  // Get user's completed anime IDs
  const { data: myAnime } = await supabase
    .from('watch_events')
    .select('anime_id')
    .eq('user_id', userId)
    .eq('completed', true);

  if (!myAnime || myAnime.length === 0) {
    return res.json({ recommendations: [], reason: 'Watch more episodes to get recommendations' });
  }

  const myIds = myAnime.map(a => a.anime_id);

  // Find similar users who watched the same anime
  const { data: similarUsers } = await supabase
    .from('watch_events')
    .select('user_id, anime_id')
    .in('anime_id', myIds)
    .neq('user_id', userId)
    .eq('completed', true);

  if (!similarUsers || similarUsers.length === 0) {
    return res.json({ recommendations: [], reason: 'Not enough data yet' });
  }

  // Count co-occurrences
  const userScores = new Map<string, number>();
  for (const event of similarUsers) {
    userScores.set(event.user_id, (userScores.get(event.user_id) || 0) + 1);
  }

  // Get top similar users
  const topUsers = [...userScores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id]) => id);

  // Get what they watched that I haven't
  const { data: recommendations } = await supabase
    .from('watch_events')
    .select('anime_id, anime_title, episode_number, count')
    .in('user_id', topUsers)
    .not('anime_id', 'in', `(${myIds.map(() => '?').join(',')})`)
    .eq('completed', true)
    .order('count', { ascending: false })
    .limit(20);

  // Deduplicate by anime_id
  const seen = new Set<string>();
  const unique = (recommendations || []).filter(r => {
    if (seen.has(r.anime_id)) return false;
    seen.add(r.anime_id);
    return true;
  });

  res.json({ recommendations: unique });
});


// GET /api/activity/continue-watching — User's in-progress anime
router.get('/continue-watching', async (req: AuthenticatedRequest, res) => {
  const userId = req.userId!;

  const { data, error } = await supabase
    .from('watch_events')
    .select('*, profiles:user_id(username, display_name, avatar_url)')
    .eq('user_id', userId)
    .eq('completed', false)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: error.message });

  // Group by anime_id and get latest episode per anime
  const byAnime = new Map<number, any>();
  for (const event of data || []) {
    const existing = byAnime.get(event.anime_id);
    // Use created_at as fallback if updated_at doesn't exist
    const eventTime = event.updated_at || event.created_at;
    const existingTime = existing?.updated_at || existing?.created_at;
    if (!existing || new Date(eventTime) > new Date(existingTime)) {
      byAnime.set(event.anime_id, event);
    }
  }

  const recent = Array.from(byAnime.values()).map(event => ({
    animeTitle: event.anime_title,
    mediaId: event.anime_id,
    episode: event.episode_number,
    coverImage: null, // Would need to fetch from AniList
    progress: event.duration_seconds ? Math.min(event.duration_seconds / 1440 * 100, 100) : 0,
    updatedAt: event.updated_at,
  }));

  res.json({ recent });
});

export default router;
