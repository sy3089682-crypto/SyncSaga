import express from 'express';
import { createServer as createHttpServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { getEnv } from '@syncsaga/config';

import { authRouter } from './routes/auth.routes';
import { roomRouter } from './routes/room.routes';
import reactionsRouter from './routes/reactions';
import clipsRouter from './routes/clips';
import activityRouter from './routes/activity';
import embedRouter from './routes/embed';
import aiRouter from './routes/ai';
import { initializeSocketHandlers } from './socket';
import { redisService } from './services/redis.service';
import { wsBridge } from './services/wsBridge';
import { supabase } from './lib/supabase';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimitMiddleware } from './middleware/security';

export async function createServer() {
  const env = getEnv();
  const app = express();
  const httpServer = createHttpServer(app);

  app.use(helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'wss:', 'https:'],
        fontSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'blob:'],
        frameSrc: ["'self'"],
      },
    } : false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.use(cors({
    origin: env.CORS_ORIGIN.split(',').map(s => s.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  }));

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

  app.use(rateLimitMiddleware(100, 60));

  app.get('/health', async (_req, res) => {
    let dbPing = false;
    let redisPing = false;

    try {
      const { data } = await supabase.from('rooms').select('id').limit(1);
      dbPing = true;
    } catch {}

    try {
      if (redisService.getClient()) {
        await redisService.getClient().ping();
        redisPing = true;
      }
    } catch {}

    res.json({
      status: 'ok',
      uptime: process.uptime(),
      dbPing,
      redisPing,
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/rooms', roomRouter);
  app.use('/api/reactions', reactionsRouter);
  app.use('/api/clips', clipsRouter);
  app.use('/api/activity', activityRouter);
  app.use('/api/embed', embedRouter);
  app.use('/api/ai', aiRouter);

  app.use(errorHandler);

  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN.split(',').map(s => s.trim()),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 30000,
    maxHttpBufferSize: 1e6,
  });

  await redisService.connect();
  initializeSocketHandlers(io);

  io.on('connection', (socket) => {
    socket.on('reaction:add', async (data) => {
      const { roomId, timestampSec, type, content } = data;
      if (!roomId || timestampSec === undefined || !type) return;

      const { data: reaction } = await supabase
        .from('timeline_reactions')
        .insert({ room_id: roomId, user_id: (socket as any).userId, timestamp_sec: timestampSec, type, content })
        .select('*, profiles:user_id(username, avatar_url)')
        .single();

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
