import express from 'express';
import { createServer as createHttpServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';

import { authRouter } from './routes/auth.routes';
import { roomRouter } from './routes/room.routes';
import reactionsRouter from './routes/reactions';
import clipsRouter from './routes/clips';
import activityRouter from './routes/activity';
import embedRouter from './routes/embed';
import { initializeSocketHandlers } from './socket';
import { redisService } from './services/redis.service';
import { wsBridge } from './services/wsBridge';
import { supabase } from './lib/supabase';
import { logger } from './lib/logger';
import { createRateLimiters } from './middleware/rate-limiter';

export async function createServer() {
  const app = express();
  const httpServer = createHttpServer(app);

  // Initialize rate limiters
  const rateLimiters = createRateLimiters(redisService.client);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  }));

  app.use(express.json({ limit: '1mb' }));

  // Health check - no rate limiting
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Apply rate limiting to API routes
  app.use('/api/auth', rateLimiters.auth.middleware(), authRouter);
  app.use('/api/rooms', rateLimiters.rooms.middleware(), roomRouter);
  app.use('/api/reactions', rateLimiters.chat.middleware(), reactionsRouter);
  app.use('/api/clips', rateLimiters.upload.middleware(), clipsRouter);
  app.use('/api/activity', rateLimiters.api.middleware(), activityRouter);
  app.use('/api/embed', rateLimiters.api.middleware(), embedRouter);
  app.use('/api', rateLimiters.api.middleware(), embedRouter); // /api/api-keys, /api/embed/room/:id, /api/embed/widget/:id
  app.use('/api/ai', rateLimiters.ai.middleware());

  // AI matching endpoint
  app.post('/api/ai/match-episode', async (req, res) => {
    const { fingerprints, duration, sourceUrl } = req.body;
    if (!fingerprints || !duration) {
      return res.status(400).json({ error: 'Missing fingerprints or duration' });
    }
    
    try {
      // Forward to Python backend for actual matching
      const response = await fetch(`${process.env.AI_BACKEND_URL || 'http://localhost:8000'}/api/ai/match-episode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprints, duration, sourceUrl })
      });
      
      const result = await response.json();
      res.json(result);
    } catch (error) {
      logger.error('AI matching failed:', error);
      res.status(503).json({
        matched: false,
        error: 'AI service temporarily unavailable'
      });
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 30000,
    maxHttpBufferSize: 1e6,
  });

  await redisService.connect();

  // Initialize sync event handlers for timeline reactions
  initializeSocketHandlers(io);

  // Handle timeline reaction events via socket
  io.on('connection', (socket) => {
    socket.on('reaction:add', async (data) => {
      const { roomId, timestampSec, type, content } = data;
      if (!roomId || timestampSec === undefined || !type) return;
      
      const { data: reaction } = await supabase
        .from('timeline_reactions')
        .insert({ room_id: roomId, user_id: (socket as any).userId, timestamp_sec: timestampSec, type, content })
        .select('*, profiles:user_id(username, avatar_url)').single();

      if (reaction) {
        socket.to(roomId).emit('reaction:new', reaction);

        await supabase.from('activity_feed').insert({
          user_id: (socket as any).userId, type: 'reaction',
          data: { roomId, timestampSec, reactionType: type },
        });
      }
    });
  });

  wsBridge.initialize(httpServer, '/ws');

  return { app, httpServer, io };
}
