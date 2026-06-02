import express from 'express';
import { createServer as createHttpServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { getEnv } from '@syncsaga/config';

import { authRouter } from './routes/auth.routes';
import { roomRouter } from './routes/room.routes';
import reactionsRouter from './routes/reactions';
import clipsRouter from './routes/clips';
import activityRouter from './routes/activity';
import embedRouter from './routes/embed';
import aiRouter from './routes/ai';
import featuresRouter from './routes/features';
import metricsRouter from './routes/metrics';
import paymentsRouter from './routes/payments';
import { initializeSocketHandlers } from './socket';
import { redisService } from './services/redis.service';
import { wsBridge } from './services/wsBridge';
import { setNotificationSocket } from './services/notification.service';
import { supabase } from './lib/supabase';
import { logger } from './lib/logger';
import { AuthenticatedSocket } from './socket/middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { rateLimitMiddleware, csrfProtection } from './middleware/security';
import { metrics } from './services/metrics.service';

export async function createServer() {
  const env = getEnv();
  const app = express();
  const httpServer = createHttpServer(app);

  metrics.init();

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

  app.use(compression({ level: 6, threshold: 256 }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.set('trust proxy', 1);
  app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' || req.url === '/metrics' } }));

  app.use(rateLimitMiddleware(100, 60));

  app.use(csrfProtection);

  app.use((req, _res, next) => {
    const start = Date.now();
    _res.on('finish', () => {
      metrics.incrementHttp(req.method, req.path, _res.statusCode);
      metrics.observeHttpDuration(req.method, req.path, Date.now() - start);
    });
    next();
  });

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

    const healthy = dbPing && redisPing;
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
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
  app.use('/api/features', featuresRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/metrics', metricsRouter);

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
    perMessageDeflate: {
      threshold: 1024,
    },
  });

  try {
    await redisService.connect();
  } catch (err) {
    logger.warn({ err }, 'Redis connection failed, running without Redis');
  }
  initializeSocketHandlers(io);
  wsBridge.initialize(io);
  setNotificationSocket(io);

  io.on('connection', (socket) => {
    metrics.setConnectedSockets(io.engine.clientsCount);

    socket.on('reaction:add', async (data) => {
      const { roomId, timestampSec, type, content } = data;
      if (!roomId || timestampSec === undefined || !type) return;

      const authSocket = socket as AuthenticatedSocket;
      if (!authSocket.userId) return;
      const userId = authSocket.userId;

      const { data: reaction } = await supabase
        .from('timeline_reactions')
        .insert({ room_id: roomId, user_id: userId, timestamp_sec: timestampSec, type, content })
        .select('*, profiles:user_id(username, avatar_url)')
        .single();

      if (reaction) {
        socket.to(roomId).emit('reaction:new', reaction);
        await supabase.from('activity_feed').insert({
          user_id: userId, type: 'reaction',
          data: { roomId, timestampSec, reactionType: type },
        });
      }
    });

    socket.on('disconnect', () => {
      metrics.setConnectedSockets(io.engine.clientsCount);
    });
  });

  return { app, httpServer, io };
}
