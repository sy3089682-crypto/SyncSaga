import { Router } from 'express'
import { supabase } from '../lib/supabase'

const router = Router()

const auth = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return res.status(401).json({ error: 'Invalid token' })
  req.userId = user.id
  next()
}

// GET /api/profiles/:username — public profile + achievements
router.get('/:username', async (req, res) => {
  const { username } = req.params
  const { data, error } = await supabase
    .from('profiles')
    .select('*, user_achievements:user_achievements(*, achievement:achievements(*))')
    .eq('username', username)
    .single()
  if (error || !data) return res.status(404).json({ error: 'Profile not found' })
  // Strip private fields
  const { ...safe } = data
  res.json({ profile: safe })
})

// GET /api/profiles/:id/friends — accepted friends list
router.get('/:id/friends', async (req, res) => {
  const { id } = req.params
  const { data, error } = await supabase
    .from('friends')
    .select(`
      *,
      friend:profiles!friends_friend_id_fkey(id,username,display_name,avatar_url,rank,status),
      user:profiles!friends_user_id_fkey(id,username,display_name,avatar_url,rank,status)
    `)
    .or(`user_id.eq.${id},friend_id.eq.${id}`)
    .eq('status', 'accepted')
  if (error) return res.status(500).json({ error: error.message })
  res.json({ friends: data ?? [] })
})

// GET /api/profiles/:id/watch-history — recent watch activity
router.get('/:id/watch-history', async (req, res) => {
  const { id } = req.params
  const { page = '1' } = req.query
  const offset = (parseInt(page as string, 10) - 1) * 20
  const { data, error } = await supabase
    .from('watch_history')
    .select('*')
    .eq('user_id', id)
    .order('watched_at', { ascending: false })
    .range(offset, offset + 19)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ history: data ?? [] })
})

// GET /api/profiles/:id/watchlist — anime watchlist
router.get('/:id/watchlist', async (req, res) => {
  const { id } = req.params
  const { status } = req.query
  let query = supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', id)
    .order('updated_at', { ascending: false })
  if (status) query = query.eq('status', status as string)
  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ watchlist: data ?? [] })
})

// PATCH /api/profiles/me — update own profile (auth required)
router.patch('/me', auth, async (req: any, res) => {
  const allowed = [
    'display_name', 'bio', 'avatar_url', 'banner_url',
    'pronouns', 'timezone', 'custom_status', 'equipped_badge',
  ]
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key]
  }
  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' })
  }
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', req.userId)
    .select()
    .single()
  if (error) return res.status(400).json({ error: error.message })
  res.json({ profile: data })
})

// POST /api/profiles/me/watchlist — add/update watchlist entry
router.post('/me/watchlist', auth, async (req: any, res) => {
  const { anime_id, anime_title, anime_image, status, episode_progress, score, notes } = req.body
  if (!anime_id || !status) return res.status(400).json({ error: 'anime_id and status required' })
  const { data, error } = await supabase
    .from('watchlist')
    .upsert({
      user_id: req.userId,
      anime_id,
      anime_title,
      anime_image,
      status,
      episode_progress: episode_progress ?? 0,
      score: score ?? null,
      notes: notes ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,anime_id' })
    .select()
    .single()
  if (error) return res.status(400).json({ error: error.message })
  res.json({ entry: data })
})

export default router
