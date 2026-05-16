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

export async function createServer() {
  const app = express();
  const httpServer = createHttpServer(app);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  }));

  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // REST API routes
  app.use('/api/auth', authRouter);
  app.use('/api/rooms', roomRouter);
  app.use('/api/reactions', reactionsRouter);
  app.use('/api/clips', clipsRouter);
  app.use('/api/activity', activityRouter);
  app.use('/api/embed', embedRouter);
  app.use('/api', embedRouter); // /api/api-keys, /api/embed/room/:id, /api/embed/widget/:id

  // AI matching endpoint (stub — you'll implement the model inference)
  app.post('/api/ai/match-episode', async (req, res) => {
    const { fingerprints, duration, sourceUrl } = req.body;
    if (!fingerprints || !duration) {
      return res.status(400).json({ error: 'Missing fingerprints or duration' });
    }
    // TODO: Implement actual fingerprint matching against episode_fingerprints table
    // For now, return a stub response
    res.json({
      matched: false,
      message: 'AI matching engine not yet deployed. Use the browser extension for now.',
      hint: 'Train the fingerprint model using docs/AI-ARCHITECTURE.md',
    });
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
