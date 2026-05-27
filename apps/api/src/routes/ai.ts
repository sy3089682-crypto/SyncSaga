import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getAiRouter } from '../services/ai.service';
import { aiCache } from '../lib/ai/cache/ai-cache';
import { supabase } from '../lib/supabase';
import { verifyToken } from '../lib/jwt';
import { RECOMMENDATIONS_PROMPT, SUMMARY_PROMPT, ROOM_NAME_PROMPT, RECAP_PROMPT } from '../lib/ai/prompts';
import { providerHealth } from '../lib/ai/router/provider-health';
import { logger } from '../lib/logger';

const router = Router();

const recommendSchema = z.object({
  watchHistory: z.array(z.object({
    title: z.string(),
    genres: z.array(z.string()),
    score: z.number().optional(),
  })),
  preferredGenres: z.array(z.string()).optional(),
});

const summarizeSchema = z.object({
  messages: z.array(z.object({
    username: z.string(),
    content: z.string(),
    timestamp: z.string(),
  })),
  animeTitle: z.string().optional(),
});

const generateRoomNamesSchema = z.object({
  animeTitle: z.string().min(1).max(200),
});

const recapSchema = z.object({
  roomId: z.string(),
  animeTitle: z.string().optional(),
  episodeNumber: z.number().optional(),
});

function requireAuth(req: Request, res: Response): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return null;
  }
  const decoded = verifyToken(authHeader.slice(7));
  if (!decoded) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
    return null;
  }
  return decoded.userId;
}

async function generateWithFallback(
  prompt: string,
  system: string,
  fallback: () => any,
  opts: { cacheKey?: string; cacheTtl?: number; temperature?: number; maxTokens?: number } = {},
) {
  try {
    const router = getAiRouter();
    if (!router.isAvailable()) return fallback();

    const { result } = await router.generate(prompt, {
      system,
      temperature: opts.temperature ?? 0.7,
      maxTokens: opts.maxTokens ?? 800,
      cacheKey: opts.cacheKey,
      cacheTtl: opts.cacheTtl ?? 600,
      priority: 'speed',
    });

    try {
      return JSON.parse(result);
    } catch {
      return result;
    }
  } catch (error) {
    logger.error({ error }, 'AI generation failed, using fallback');
    return fallback();
  }
}

router.post('/recommend', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { watchHistory, preferredGenres } = recommendSchema.parse(req.body);
    const titleList = watchHistory.map(w => w.title).join(', ');
    const genreList = preferredGenres?.join(', ') || 'any';
    const prompt = `${RECOMMENDATIONS_PROMPT}\n\nUser watch history: ${titleList || 'none yet'}\nPreferred genres: ${genreList}`;
    const cacheKey = `rec:${aiCache.dedupKey('rec', `${titleList}:${genreList}`)}`;

    const result = await generateWithFallback(prompt, 'You are an anime recommendation AI.', () => {
      return { recommendations: [
        { title: 'Fullmetal Alchemist: Brotherhood', reason: 'A masterpiece with perfect pacing and story.', matchScore: 98 },
        { title: 'Steins;Gate', reason: 'Brilliant time-travel story with deep character development.', matchScore: 96 },
        { title: 'Hunter x Hunter', reason: 'Exceptional world-building and character growth.', matchScore: 95 },
        { title: 'Attack on Titan', reason: 'Epic scale with constant twists.', matchScore: 93 },
        { title: 'Vinland Saga', reason: 'Incredible character development and historical depth.', matchScore: 91 },
      ]};
    }, { cacheKey, cacheTtl: 3600 });

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request', details: error.errors });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/summarize-session', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { messages, animeTitle } = summarizeSchema.parse(req.body);
    const messagesText = messages.slice(-100).map(m => `${m.username}: ${m.content}`).join('\n');
    const prompt = `${SUMMARY_PROMPT}\n\nAnime: ${animeTitle || 'an anime'}\n\nChat:\n${messagesText}`;
    const cacheKey = `sum:${aiCache.dedupKey('sum', messagesText.slice(0, 200))}`;

    const result = await generateWithFallback(prompt, 'You are a session summarizer.', () => {
      const total = messages.length;
      const uniqueUsers = [...new Set(messages.map(m => m.username))].length;
      return {
        title: `${animeTitle || 'Watch Session'} Highlights`,
        stats: { totalMessages: total, uniqueParticipants: uniqueUsers, totalReactions: messages.filter(m => /[\u{1F300}-\u{1FAFF}]/u.test(m.content)).length },
        topMoments: messages.slice(-3).reverse().map(m => ({ user: m.username, message: m.content, time: m.timestamp })),
        vibe: total > 50 ? 'Lively' : total > 20 ? 'Chatty' : total > 5 ? 'Quiet' : 'Silent',
      };
    }, { cacheKey, cacheTtl: 300, priority: 'quality' });

    res.json({ summary: result });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request', details: error.errors });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/generate-room-names', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { animeTitle } = generateRoomNamesSchema.parse(req.body);
    const prompt = `${ROOM_NAME_PROMPT}\n\nAnime: ${animeTitle}`;
    const cacheKey = `rn:${aiCache.dedupKey('rn', animeTitle)}`;

    const result = await generateWithFallback(prompt, 'You are a creative naming AI.', () => {
      const templates = [
        `${animeTitle} Watch Party`, `${animeTitle} Night`, `${animeTitle} Squad`,
        `${animeTitle} Marathon`, `${animeTitle} Club`, `${animeTitle} Fans Unite`,
        `${animeTitle} Hour`, `${animeTitle} Adventure`, `${animeTitle} Showdown`,
        `${animeTitle} Chronicles`, `${animeTitle} Vibes`, `${animeTitle} and Chill`,
        `${animeTitle} Watchalong`, `${animeTitle} Reactor`, `The ${animeTitle} Experience`,
      ];
      return { suggestions: templates.sort(() => Math.random() - 0.5).slice(0, 5) };
    }, { cacheKey, cacheTtl: 3600, temperature: 0.9 });

    res.json({ suggestions: Array.isArray(result) ? result.slice(0, 5) : result.suggestions?.slice(0, 5) || [] });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request', details: error.errors });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/recap', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { roomId, animeTitle, episodeNumber } = recapSchema.parse(req.body);

    const { data: messages } = await supabase
      .from('messages')
      .select('content, sender_id, created_at, type')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(200);

    const { data: reactions } = await supabase
      .from('timeline_reactions')
      .select('type, created_at')
      .eq('room_id', roomId)
      .limit(100);

    const chatMessages = (messages || []).map(m => ({
      user: m.sender_id,
      message: m.content,
      time: m.created_at,
      type: m.type,
    }));

    const topReactions = (reactions || []).reduce<Record<string, number>>((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});

    const chatText = chatMessages.slice(0, 100).map(m => `${m.user}: ${m.message}`).join('\n');
    const prompt = `${RECAP_PROMPT}\n\nAnime: ${animeTitle || 'Unknown'} Episode ${episodeNumber || '?'}\n\nChat:\n${chatText}`;
    const cacheKey = `recap:${aiCache.dedupKey('recap', roomId)}`;

    const result = await generateWithFallback(prompt, 'You are a premium recap generator.', () => ({
      title: `${animeTitle || 'Watch Party'} — Episode ${episodeNumber || '?'} Recap`,
      epicMoments: chatMessages.slice(0, 3).map((m, i) => ({
        description: `"${m.message.slice(0, 80)}..."`,
        reactionCount: i === 0 ? 8 : 3,
        timestamp: new Date(m.time).toLocaleTimeString(),
      })),
      partyVibe: chatMessages.length > 50 ? 'Hype' : 'Chill',
      topReactions: Object.entries(topReactions).slice(0, 3).map(([emoji, count]) => ({
        emoji, count,
        description: count > 5 ? 'Everyone was feeling this!' : 'A few reactions',
      })),
      memorableQuotes: chatMessages.slice(0, 2).map(m => ({
        user: m.user,
        quote: m.message.slice(0, 100),
        context: m.type || 'chat',
      })),
      funStats: {
        totalMessages: chatMessages.length,
        mostActiveUser: chatMessages[0]?.user || 'N/A',
        hypeMoments: Math.min(chatMessages.length, 15),
      },
    }), { cacheKey, cacheTtl: 600, priority: 'quality', maxTokens: 1500, temperature: 0.8 });

    res.json({ recap: result });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request', details: error.errors });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/health', async (_req: Request, res: Response) => {
  try {
    const router = getAiRouter();
    res.json({
      available: router.isAvailable(),
      providers: router.getHealth(),
      groq: router.hasProvider('groq'),
      gemini: router.hasProvider('gemini'),
      cloudflare: router.hasProvider('cloudflare'),
    });
  } catch (error) {
    res.json({ available: false, providers: providerHealth.getStats() });
  }
});

export default router;
