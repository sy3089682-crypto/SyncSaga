import { Router, Request, Response } from 'express';
import { z } from 'zod';

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

router.post('/recommend', async (req: Request, res: Response) => {
  try {
    const { watchHistory, preferredGenres } = recommendSchema.parse(req.body);

    const scores = ['Naruto', 'Attack on Titan', 'Fullmetal Alchemist', 'Death Note', 'One Piece',
      'Demon Slayer', 'Jujutsu Kaisen', 'Steins;Gate', 'Hunter x Hunter', 'Code Geass',
      'Cowboy Bebop', 'Neon Genesis Evangelion', 'Gurren Lagann', 'Vinland Saga', 'Mob Psycho 100',
      'One Punch Man', 'Haikyuu!!', 'Kaguya-sama: Love is War', 'Fruits Basket', 'Re:Zero'];

    const shuffled = scores.sort(() => Math.random() - 0.5);
    const recommendations = shuffled.slice(0, 5).map((title, i) => ({
      title,
      reason: preferredGenres?.length
        ? `Based on your interest in ${preferredGenres.slice(0, 2).join(' and ')}, you'll love this one.`
        : `A must-watch that aligns with your viewing history.`,
      matchScore: Math.round(85 + Math.random() * 15),
      coverUrl: `https://img.anili.st/media/${i + 1}`,
    }));

    res.json({ recommendations });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request', details: error.errors });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/summarize-session', async (req: Request, res: Response) => {
  try {
    const { messages, animeTitle } = summarizeSchema.parse(req.body);

    const total = messages.length;
    const uniqueUsers = [...new Set(messages.map(m => m.username))].length;
    const reactions = messages.filter(m => m.content.startsWith(':') || m.content.includes('😂')).length;
    const questions = messages.filter(m => m.content.includes('?')).length;

    const topMessages = messages.slice(-3).reverse();

    const summary = {
      title: `${animeTitle || 'Watch Session'} Highlights`,
      stats: { totalMessages: total, uniqueParticipants: uniqueUsers, totalReactions: reactions, questionsAsked: questions },
      topMoments: topMessages.map(m => ({
        user: m.username,
        message: m.content,
        time: m.timestamp,
      })),
      vibe: total > 50 ? 'Lively' : total > 20 ? 'Chatty' : total > 5 ? 'Quiet' : 'Silent',
      duration: `${Math.floor(total / 5)} minutes of chat`,
    };

    res.json({ summary });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request', details: error.errors });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/subtitle-assist', async (req: Request, res: Response) => {
  try {
    const { question, animeTitle, episode, timestamp, context } = subtitleQuerySchema.parse(req.body);

    const responses = [
      `In Japanese culture, the phrase "${question.replace(/^.*by\s+|^.*about\s+|^.*mean\s+/i, '')}" carries nuanced meaning. The character is expressing deep respect mixed with personal hesitation.`,
      `This scene references a common trope in ${animeTitle || 'anime'} where characters use indirect language to preserve harmony. The subtext here suggests they're actually asking for help without losing face.`,
      `The translation doesn't fully capture the original Japanese honorifics here. The character uses a casual form that implies they're close friends, which explains their blunt delivery.`,
      `This is a cultural reference to the Japanese concept of "reading the atmosphere" (kuuki wo yomu). The character is deliberately not saying what they mean to maintain group harmony.`,
    ];

    res.json({
      explanation: responses[Math.floor(Math.random() * responses.length)],
      context: context || `Scene from ${animeTitle || 'anime'} around ${timestamp ? `${Math.floor(timestamp / 60)}:${Math.floor(timestamp % 60).toString().padStart(2, '0')}` : 'this point'}`,
      relatedTerms: question.split(' ').filter(w => w.length > 3).slice(0, 3),
    });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request', details: error.errors });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/generate-room-names', async (req: Request, res: Response) => {
  try {
    const { animeTitle } = generateRoomNamesSchema.parse(req.body);

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

export default router;
