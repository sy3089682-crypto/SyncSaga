import { Router, Request } from 'express';
import { supabase } from '../lib/supabase';
import { verifyToken } from '../lib/jwt';

const router = Router();

function getUser(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const decoded = verifyToken(auth.slice(7));
  return decoded?.userId || null;
}

// POST /api/reactions — Add timeline reaction
router.post('/', async (req, res) => {
  const userId = getUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { roomId, timestampSec, type, content } = req.body;
  if (!roomId || timestampSec === undefined || !type) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const { data, error } = await supabase.from('timeline_reactions').insert({
    room_id: roomId, user_id: userId, timestamp_sec: timestampSec,
    type, content,
  }).select('*, profiles:user_id(username, avatar_url)').single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ reaction: data });
});

// GET /api/reactions/:roomId?since=<timestamp>
router.get('/:roomId', async (req, res) => {
  const { since } = req.query;
  let query = supabase.from('timeline_reactions')
    .select('*, profiles:user_id(username, avatar_url)')
    .eq('room_id', req.params.roomId)
    .order('timestamp_sec', { ascending: true });

  if (since) query = query.gt('created_at', since as string);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ reactions: data });
});

export default router;
