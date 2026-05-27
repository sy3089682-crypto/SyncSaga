import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { verifyToken } from '../lib/jwt';
import { getAiRouter } from '../services/ai.service';
import { aiCache } from '../lib/ai/cache/ai-cache';
import { logger } from '../lib/logger';
import crypto from 'crypto';

const router = Router();

function getUser(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const decoded = verifyToken(auth.slice(7));
  return decoded?.userId || null;
}

router.post('/config', async (req, res) => {
  const userId = getUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { roomId, theme, features, allowedOrigins } = req.body;
  if (!roomId) return res.status(400).json({ error: 'roomId required' });

  const { data, error } = await supabase.from('embed_configs').upsert({
    user_id: userId, room_id: roomId,
    theme: theme || 'dark',
    features: features || ['chat', 'voice', 'sync'],
    allowed_origins: allowedOrigins || ['*'],
  }).select('*').single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ config: data });
});

router.post('/api-keys', async (req, res) => {
  const userId = getUser(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { name, permissions } = req.body;
  const rawKey = `ss_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const { data, error } = await supabase.from('api_keys').insert({
    user_id: userId, name, key_hash: keyHash, permissions: permissions || ['read'],
  }).select('*').single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ key: { ...data, raw_key: rawKey } });
});

router.get('/room/:roomId', async (req, res) => {
  const origin = req.headers.origin;
  const { data: config } = await supabase.from('embed_configs')
    .select('*').eq('room_id', req.params.roomId).single();

  if (config?.allowed_origins && !config.allowed_origins.includes('*')) {
    if (!origin || !config.allowed_origins.includes(origin)) {
      return res.status(403).json({ error: 'Origin not allowed' });
    }
  }

  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);

  const { data: room } = await supabase.from('rooms')
    .select('*, room_members(*)').eq('id', req.params.roomId).single();

  if (!room) return res.status(404).json({ error: 'Room not found' });

  res.json({
    room: {
      id: room.id, name: room.name, member_count: room.room_members?.length,
      host_id: room.host_id, current_episode: room.current_episode,
    },
    embed: config ? { theme: config.theme, features: config.features } : null,
  });
});

router.get('/widget/:roomId', async (req, res) => {
  const wsUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:4000';
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.send(`
(function() {
  var roomId = '${req.params.roomId}';
  var container = document.createElement('div');
  container.id = 'syncsaga-embed-' + roomId;
  container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;width:320px;height:480px;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.4);';
  document.body.appendChild(container);
  var iframe = document.createElement('iframe');
  iframe.src = '${process.env.WIDGET_URL || 'http://localhost:3000'}/embed/room/' + roomId;
  iframe.style.cssText = 'width:100%;height:100%;border:none;';
  container.appendChild(iframe);
  var toggle = document.createElement('button');
  toggle.textContent = '\u25C7 Watch Party';
  toggle.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99998;padding:10px 20px;border-radius:8px;border:none;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(139,92,246,0.4);display:none;';
  toggle.onclick = function() { container.style.display = container.style.display === 'none' ? 'block' : 'none'; };
  document.body.appendChild(toggle);
  var closeBtn = document.createElement('button');
  closeBtn.textContent = '\u00D7';
  closeBtn.style.cssText = 'position:absolute;top:8px;right:8px;z-index:100000;width:24px;height:24px;border-radius:50%;border:none;background:rgba(0,0,0,0.5);color:white;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;';
  closeBtn.onclick = function() { container.style.display = 'none'; toggle.style.display = 'block'; };
  container.appendChild(closeBtn);
})();
`);
});

router.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query required' });
    }

    const router = getAiRouter();
    if (!router.hasProvider('cloudflare')) {
      const { data: rooms } = await supabase
        .from('rooms')
        .select('id, name, anime_title, current_episode')
        .or(`name.ilike.%${query}%,anime_title.ilike.%${query}%`)
        .limit(20);
      return res.json({ results: rooms || [] });
    }

    const cacheKey = `search:${aiCache.dedupKey('search', query.toLowerCase())}`;
    const cached = await aiCache.get(cacheKey);
    if (cached) {
      return res.json({ results: JSON.parse(cached), cached: true });
    }

    const [embeddings] = await router.embed([query]);
    if (embeddings.length > 0) {
      const { data: rooms } = await supabase
        .from('rooms')
        .select('id, name, anime_title, current_episode')
        .limit(20);

      const scored = (rooms || []).map(room => {
        let score = 0;
        const q = query.toLowerCase();
        if (room.name?.toLowerCase().includes(q)) score += 10;
        if (room.anime_title?.toLowerCase().includes(q)) score += 8;
        if (room.current_episode?.toLowerCase().includes(q)) score += 5;
        return { ...room, score };
      }).sort((a, b) => b.score - a.score).slice(0, 20);

      await aiCache.set(cacheKey, JSON.stringify(scored), 300);
      return res.json({ results: scored });
    }

    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, name, anime_title, current_episode')
      .or(`name.ilike.%${query}%,anime_title.ilike.%${query}%`)
      .limit(20);

    res.json({ results: rooms || [] });
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
