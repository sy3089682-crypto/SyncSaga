import { Router } from 'express'
import { supabase } from '../lib/supabase'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

const auth = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Unauthorized' })
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return res.status(401).json({ error: 'Invalid token' })
  req.user = user
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  req.profile = profile
  next()
}

// GET /api/rooms — list public rooms with pagination + filters
router.get('/', async (req, res) => {
  const { page = '1', limit = '20', anime_id, theme } = req.query
  const pageNum = parseInt(page as string, 10)
  const limitNum = parseInt(limit as string, 10)
  const offset = (pageNum - 1) * limitNum

  let query = supabase
    .from('rooms')
    .select('*, host:profiles!rooms_host_id_fkey(id,username,avatar_url,rank)', { count: 'exact' })
    .is('ended_at', null)
    .eq('is_public', true)
    .order('member_count', { ascending: false })
    .range(offset, offset + limitNum - 1)

  if (anime_id) query = query.eq('anime_id', parseInt(anime_id as string, 10))
  if (theme) query = query.eq('theme', theme as string)

  const { data, count, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  res.json({ rooms: data ?? [], total: count ?? 0, page: pageNum, limit: limitNum })
})

// POST /api/rooms — create room (auth required)
router.post('/', auth, async (req: any, res) => {
  const profile = req.profile
  const tierLimits: Record<string, number> = { free: 5, plus: 50, pro: 999 }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('rooms')
    .select('id', { count: 'exact', head: true })
    .eq('host_id', profile.id)
    .gte('created_at', today.toISOString())

  const tier = profile.tier ?? 'free'
  if ((count ?? 0) >= (tierLimits[tier] ?? 5)) {
    return res.status(429).json({ error: 'Daily room limit reached. Upgrade to Plus for more!' })
  }

  const {
    name, description, anime_id, anime_title, anime_image,
    episode_number, streaming_platform, is_public, is_locked,
    max_members, theme, password,
  } = req.body

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Room name is required' })
  }

  const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)}-${uuidv4().replace(/-/g, '').slice(0, 6)}`

  const { data: room, error } = await supabase
    .from('rooms')
    .insert({
      slug,
      name: name.trim(),
      description: description ?? null,
      host_id: profile.id,
      anime_id: anime_id ?? null,
      anime_title: anime_title ?? null,
      anime_image: anime_image ?? null,
      episode_number: episode_number ?? null,
      streaming_platform: streaming_platform ?? null,
      is_public: is_public ?? true,
      is_locked: is_locked ?? false,
      max_members: max_members ?? 50,
      theme: theme ?? 'default',
      password_hash: password ?? null,
      playback_state: 'paused',
      playback_position: 0,
      playback_speed: 1,
    })
    .select()
    .single()

  if (error) return res.status(400).json({ error: error.message })

  await supabase.from('room_members').insert({
    room_id: room.id,
    user_id: profile.id,
    role: 'host',
  })

  res.status(201).json({ room })
})

// GET /api/rooms/:id — get room by id or slug
router.get('/:id', async (req, res) => {
  const { id } = req.params
  const { data: room, error } = await supabase
    .from('rooms')
    .select('*, host:profiles!rooms_host_id_fkey(*), members:room_members(*, profile:profiles(*))')
    .or(`id.eq.${id},slug.eq.${id}`)
    .single()
  if (error || !room) return res.status(404).json({ error: 'Room not found' })
  res.json({ room })
})

// PATCH /api/rooms/:id — update room settings (host only)
router.patch('/:id', auth, async (req: any, res) => {
  const { id } = req.params
  const allowed = ['name', 'description', 'is_public', 'is_locked', 'max_members', 'theme', 'episode_number', 'streaming_platform']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key]
  }
  const { data, error } = await supabase
    .from('rooms')
    .update(updates)
    .eq('id', id)
    .eq('host_id', req.profile.id)
    .select()
    .single()
  if (error) return res.status(403).json({ error: 'Forbidden or not found' })
  res.json({ room: data })
})

// DELETE /api/rooms/:id — soft delete (set ended_at)
router.delete('/:id', auth, async (req: any, res) => {
  const { id } = req.params
  const { error } = await supabase
    .from('rooms')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', id)
    .eq('host_id', req.profile.id)
  if (error) return res.status(403).json({ error: 'Forbidden or not found' })
  res.json({ success: true })
})

export default router
