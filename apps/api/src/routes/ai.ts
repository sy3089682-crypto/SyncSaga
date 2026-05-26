import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { aiService } from '../services/ai.service';
import { supabase } from '../lib/supabase';
import { verifyToken } from '../lib/jwt';

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

const subtitleQuerySchema = z.object({
  question: z.string().min(1).max(500),
  animeTitle: z.string().optional(),
  episode: z.number().optional(),
  timestamp: z.number().optional(),
  context: z.string().optional(),
});

const generateRoomNamesSchema = z.object({
  animeTitle: z.string().min(1).max(200),
});

const chatAssistantSchema = z.object({
  message: z.string().min(1).max(1000),
  roomContext: z.object({
    animeTitle: z.string().optional(),
    episode: z.number().optional(),
    participants: z.array(z.string()).optional(),
  }).optional(),
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

router.post('/recommend', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { watchHistory, preferredGenres } = recommendSchema.parse(req.body);

    const titleList = watchHistory.map(w => w.title).join(', ');
    const genreList = preferredGenres?.join(', ') || 'any';

    const prompt = `You are an anime recommendation AI. Based on the user's watch history (${titleList || 'none yet'}) and preferred genres (${genreList}), recommend 5 anime titles. Return ONLY valid JSON with this exact structure, no other text: { "recommendations": [{ "title": "string", "reason": "string", "matchScore": number(0-100), "coverUrl": "string" }] }`;

    const result = await aiService.generate(prompt, { temperature: 0.8, maxTokens: 800 });

    try {
      const parsed = JSON.parse(result);
      res.json({ recommendations: parsed.recommendations || [] });
    } catch {
      const { data: trending } = await supabase
        .from('rooms')
        .select('anime_title')
        .not('anime_title', 'is', null)
        .limit(20);

      const fallbackRecs = (trending || []).slice(0, 5).map((r, i) => ({
        title: r.anime_title,
        reason: 'Popular choice among SyncSaga users!',
        matchScore: Math.round(85 + Math.random() * 15),
        coverUrl: `https://img.anili.st/media/${i + 1}`,
      }));

      res.json({ recommendations: fallbackRecs });
    }
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

    if (aiService.isAvailable()) {
      const messagesText = messages.slice(-50).map(m => `${m.username}: ${m.content}`).join('\n');
      const prompt = `Summarize this anime watch party chat session for "${animeTitle || 'an anime'}". Return ONLY valid JSON with this structure: { "title": "string", "stats": { "totalMessages": number, "uniqueParticipants": number, "totalReactions": number, "questionsAsked": number }, "topMoments": [{ "user": "string", "message": "string", "time": "string" }], "vibe": "string", "duration": "string" }\n\nChat:\n${messagesText}`;

      const result = await aiService.generate(prompt, { temperature: 0.5, maxTokens: 500 });
      try {
        const parsed = JSON.parse(result);
        return res.json({ summary: parsed });
      } catch {}
    }

    const total = messages.length;
    const uniqueUsers = [...new Set(messages.map(m => m.username))].length;
    const reactions = messages.filter(m => m.content.startsWith(':') || /[\u{1F300}-\u{1FAFF}]/u.test(m.content)).length;
    const questions = messages.filter(m => m.content.includes('?')).length;
    const topMessages = messages.slice(-3).reverse();

    res.json({
      summary: {
        title: `${animeTitle || 'Watch Session'} Highlights`,
        stats: { totalMessages: total, uniqueParticipants: uniqueUsers, totalReactions: reactions, questionsAsked: questions },
        topMoments: topMessages.map(m => ({
          user: m.username,
          message: m.content,
          time: m.timestamp,
        })),
        vibe: total > 50 ? 'Lively' : total > 20 ? 'Chatty' : total > 5 ? 'Quiet' : 'Silent',
        duration: `${Math.floor(total / 5)} minutes of chat`,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request', details: error.errors });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/subtitle-assist', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { question, animeTitle, timestamp } = subtitleQuerySchema.parse(req.body);

    if (aiService.isAvailable()) {
      const prompt = `You are a Japanese anime subtitle/cultural assistant. Answer this question about an anime scene: "${question}"${animeTitle ? ` (from ${animeTitle})` : ''}${timestamp ? ` at ${Math.floor(timestamp / 60)}:${Math.floor(timestamp % 60).toString().padStart(2, '0')}` : ''}. Give a helpful, concise explanation. Return ONLY valid JSON: { "explanation": "string", "context": "string", "relatedTerms": ["string"] }`;

      const result = await aiService.generate(prompt, { temperature: 0.4, maxTokens: 300 });
      try {
        const parsed = JSON.parse(result);
        return res.json(parsed);
      } catch {}
    }

    const responses = [
      `In Japanese culture, the phrase carries nuanced meaning. The character is expressing deep respect mixed with personal hesitation.`,
      `This scene references a common trope in ${animeTitle || 'anime'} where characters use indirect language to preserve harmony.`,
      `The translation doesn't fully capture the original Japanese honorifics. The character uses a casual form implying close friendship.`,
      `This is a cultural reference to "reading the atmosphere" (kuuki wo yomu). The character deliberately avoids saying what they mean.`,
    ];

    res.json({
      explanation: responses[Math.floor(Math.random() * responses.length)],
      context: `Scene from ${animeTitle || 'anime'} around ${timestamp ? `${Math.floor(timestamp / 60)}:${Math.floor(timestamp % 60).toString().padStart(2, '0')}` : 'this point'}`,
      relatedTerms: question.split(' ').filter(w => w.length > 3).slice(0, 3),
    });
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

    if (aiService.isAvailable()) {
      const prompt = `Generate 5 creative, fun room names for a watch party of "${animeTitle}". Return ONLY valid JSON array: ["name1", "name2", "name3", "name4", "name5"]`;

      const result = await aiService.generate(prompt, { temperature: 0.9, maxTokens: 200 });
      try {
        const parsed = JSON.parse(result);
        return res.json({ suggestions: Array.isArray(parsed) ? parsed.slice(0, 5) : parsed.suggestions?.slice(0, 5) || [] });
      } catch {}
    }

    const templates = [
      `${animeTitle} Watch Party`,
      `${animeTitle} Night`,
      `${animeTitle} Squad`,
      `${animeTitle} Marathon`,
      `${animeTitle} Club`,
      `${animeTitle} Fans Unite`,
      `${animeTitle} Hour`,
      `${animeTitle} Adventure`,
      `${animeTitle} Showdown`,
      `${animeTitle} Chronicles`,
      `${animeTitle} Vibes`,
      `${animeTitle} and Chill`,
      `${animeTitle} Watchalong`,
      `${animeTitle} Reactor`,
      `The ${animeTitle} Experience`,
    ];

    const suggestions = templates.sort(() => Math.random() - 0.5).slice(0, 5);
    res.json({ suggestions });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request', details: error.errors });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/chat-assistant', async (req: Request, res: Response) => {
  try {
    const userId = requireAuth(req, res);
    if (!userId) return;

    const { message, roomContext } = chatAssistantSchema.parse(req.body);

    let prompt = `You are SyncBot, a helpful anime watch-party assistant in a SyncSaga room. Keep responses concise (under 200 chars) and friendly. User says: "${message}"`;

    if (roomContext?.animeTitle) {
      prompt += `\nCurrently watching: ${roomContext.animeTitle}${roomContext.episode ? ` Episode ${roomContext.episode}` : ''}`;
    }
    if (roomContext?.participants?.length) {
      prompt += `\nParticipants: ${roomContext.participants.join(', ')}`;
    }

    if (!aiService.isAvailable()) {
      const fallbacks = [
        "That's a great take! Anyone else got thoughts?",
        "I'm watching too — this part is amazing!",
        "Hold up, let me catch up to that scene!",
        "Classic moment. Never gets old.",
        "The animation in this episode is incredible!",
        "Did you catch that detail? So good!",
      ];
      return res.json({ reply: fallbacks[Math.floor(Math.random() * fallbacks.length)] });
    }

    const result = await aiService.generate(prompt, { temperature: 0.7, maxTokens: 200 });
    res.json({ reply: result });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request', details: error.errors });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
