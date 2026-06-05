import { Router } from 'express'

const router = Router()

const MAL_BASE = 'https://api.jikan.moe/v4'
const ANILIST_BASE = 'https://graphql.anilist.co'

async function jikanFetch(path: string): Promise<unknown> {
  const res = await fetch(`${MAL_BASE}${path}`, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Jikan ${res.status}: ${path}`)
  return res.json()
}

async function anilistQuery(query: string, variables?: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(ANILIST_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`AniList ${res.status}`)
  return res.json()
}

// GET /api/anime/search?q=&page=
router.get('/search', async (req, res) => {
  const { q, page = '1' } = req.query
  if (!q || typeof q !== 'string') return res.status(400).json({ error: 'Query required' })
  try {
    const data = await jikanFetch(`/anime?q=${encodeURIComponent(q)}&page=${page}&limit=20&sfw=true`)
    res.json(data)
  } catch (err: any) {
    res.status(502).json({ error: err.message })
  }
})

// GET /api/anime/trending — AniList trending
router.get('/trending', async (_req, res) => {
  const query = `{
    Page(page: 1, perPage: 20) {
      media(type: ANIME, sort: TRENDING_DESC, status: RELEASING) {
        id idMal
        title { romaji english native }
        coverImage { large medium extraLarge color }
        bannerImage description episodes duration
        status season seasonYear format
        genres averageScore popularity trending
        nextAiringEpisode { airingAt timeUntilAiring episode }
      }
    }
  }`
  try {
    const data: any = await anilistQuery(query)
    res.json(data.data?.Page?.media ?? [])
  } catch (err: any) {
    res.status(502).json({ error: err.message })
  }
})

// GET /api/anime/seasonal — current season from AniList
router.get('/seasonal', async (_req, res) => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const season = month < 3 ? 'WINTER' : month < 6 ? 'SPRING' : month < 9 ? 'SUMMER' : 'FALL'
  const query = `{
    Page(page: 1, perPage: 30) {
      media(type: ANIME, season: ${season}, seasonYear: ${year}, sort: POPULARITY_DESC) {
        id idMal
        title { romaji english native }
        coverImage { large medium color }
        episodes averageScore popularity genres format
        nextAiringEpisode { airingAt episode }
      }
    }
  }`
  try {
    const data: any = await anilistQuery(query)
    res.json(data.data?.Page?.media ?? [])
  } catch (err: any) {
    res.status(502).json({ error: err.message })
  }
})

// GET /api/anime/top?type=tv&filter=airing&page=
router.get('/top', async (req, res) => {
  const { type = 'tv', filter = 'airing', page = '1' } = req.query
  try {
    const data = await jikanFetch(`/top/anime?type=${type}&filter=${filter}&page=${page}&limit=25`)
    res.json(data)
  } catch (err: any) {
    res.status(502).json({ error: err.message })
  }
})

// GET /api/anime/genres — genre list from Jikan
router.get('/genres', async (_req, res) => {
  try {
    const data = await jikanFetch('/genres/anime')
    res.json(data)
  } catch (err: any) {
    res.status(502).json({ error: err.message })
  }
})

// GET /api/anime/:id — full anime details from Jikan
router.get('/:id', async (req, res) => {
  const { id } = req.params
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid anime ID' })
  try {
    const data = await jikanFetch(`/anime/${id}/full`)
    res.json(data)
  } catch (err: any) {
    res.status(502).json({ error: err.message })
  }
})

// GET /api/anime/:id/episodes?page=
router.get('/:id/episodes', async (req, res) => {
  const { id } = req.params
  const { page = '1' } = req.query
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid anime ID' })
  try {
    const data = await jikanFetch(`/anime/${id}/episodes?page=${page}`)
    res.json(data)
  } catch (err: any) {
    res.status(502).json({ error: err.message })
  }
})

// GET /api/anime/:id/characters
router.get('/:id/characters', async (req, res) => {
  const { id } = req.params
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid anime ID' })
  try {
    const data = await jikanFetch(`/anime/${id}/characters`)
    res.json(data)
  } catch (err: any) {
    res.status(502).json({ error: err.message })
  }
})

// GET /api/anime/:id/recommendations
router.get('/:id/recommendations', async (req, res) => {
  const { id } = req.params
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid anime ID' })
  try {
    const data = await jikanFetch(`/anime/${id}/recommendations`)
    res.json(data)
  } catch (err: any) {
    res.status(502).json({ error: err.message })
  }
})

export default router
