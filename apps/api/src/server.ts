import express from 'express';
import { createServer as createHttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
import { getEnv } from '@syncsaga/config';

import { authRouter } from './routes/auth.routes';
import { roomRouter } from './routes/room.routes';
import roomVideoRouter from './routes/room-video.routes';
import reactionsRouter from './routes/reactions';
import clipsRouter from './routes/clips';
import activityRouter from './routes/activity';
import embedRouter from './routes/embed';
import aiRouter from './routes/ai';
import featuresRouter from './routes/features';
import metricsRouter from './routes/metrics';
import paymentsRouter from './routes/payments';
import friendsRouter from './routes/friends';
import usersRouter from './routes/users';
import profileRouter from './routes/profile';
import { docsRouter } from './routes/docs';
import watchProgressRouter from './routes/watch-progress.routes';
import { initializeSocketHandlers } from './socket';
import { redisService } from './services/redis.service';
import { wsBridge } from './services/wsBridge';
import { setNotificationSocket } from './services/notification.service';
import { supabase } from './lib/supabase';
import { logger, pinoLogger } from './lib/logger';
import { AuthenticatedSocket } from './socket/middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { rateLimitMiddleware, csrfProtection } from './middleware/security';
import { queueService, setQueueSocket } from './services/queue.service';
import { metrics } from './services/metrics.service';
import { initSentry, sentryErrorHandler } from './lib/sentry';

export async function createServer() {
  const env = getEnv();
  const app = express();
  const httpServer = createHttpServer(app);
  initSentry();
  metrics.init();

  // Security headers
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
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-Id'],
  }));

  app.use(compression({ level: 6, threshold: 256 }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.set('trust proxy', 1);
  app.use(pinoHttp({
    logger: pinoLogger,
    autoLogging: { ignore: (req) => req.url === '/health/live' || req.url === '/health/ready' || req.url === '/metrics' },
  }));

  app.use((req, _res, next) => {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    req.headers['x-request-id'] = requestId;
    _res.setHeader('X-Request-Id', requestId);
    next();
  });

  app.get('/health/live', (_req, res) => {
    res.status(200).json({ status: 'alive', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString(), environment: env.NODE_ENV });
  });

  app.use(rateLimitMiddleware(100, 60));
  app.use(csrfProtection);

  app.use((req, _res, next) => {
    const start = Date.now();
    _res.on('finish', () => {
      metrics.incrementHttp(req.method, req.url, _res.statusCode);
      metrics.observeHttpDuration(req.method, req.url, Date.now() - start);
    });
    next();
  });

  async function pingRedis(): Promise<boolean> {
    const client = redisService.getClient();
    if (!client || !client.isOpen) return false;
    try {
      await Promise.race([client.ping(), new Promise((_, rej) => setTimeout(() => rej(new Error('redis ping timeout')), 2000))]);
      return true;
    } catch {
      return false;
    }
  }

  async function pingDatabase(): Promise<boolean> {
    try {
      await Promise.race([
        supabase.from('rooms').select('id').limit(1),
        new Promise((_, rej) => setTimeout(() => rej(new Error('db ping timeout')), 3000)),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  app.get('/health/ready', async (_req, res) => {
    const dbPing = await pingDatabase();
    const redisPing = await pingRedis();
    const ready = dbPing && redisPing;
    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'degraded',
      checks: { database: dbPing, redis: redisPing },
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  });

  const v1Router = express.Router();
  v1Router.use('/auth', authRouter);
  v1Router.use('/rooms', roomRouter);
  v1Router.use('/rooms', roomVideoRouter);
  v1Router.use('/reactions', reactionsRouter);
  v1Router.use('/clips', clipsRouter);
  v1Router.use('/activity', activityRouter);
  v1Router.use('/embed', embedRouter);
  v1Router.use('/ai', aiRouter);
  v1Router.use('/features', featuresRouter);
  v1Router.use('/payments', paymentsRouter);
  v1Router.use('/friends', friendsRouter);
  v1Router.use('/users', usersRouter);
  v1Router.use('/profile', profileRouter);
  v1Router.use('/docs', docsRouter);
  v1Router.use('/watch-progress', watchProgressRouter);

  app.use('/api/v1', v1Router);

  app.use('/api/auth', authRouter);
  app.use('/api/rooms', roomRouter);
  app.use('/api/rooms', roomVideoRouter);
  app.use('/api/reactions', reactionsRouter);
  app.use('/api/clips', clipsRouter);
  app.use('/api/activity', activityRouter);
  app.use('/api/embed', embedRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/features', featuresRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/friends', friendsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/profile', profileRouter);

  app.use('/metrics', metricsRouter);
  app.use(sentryErrorHandler());
  app.use(errorHandler);

  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN.split(',').map(s => s.trim()), credentials: true },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 30000,
    maxHttpBufferSize: 1e6,
    perMessageDeflate: { threshold: 1024 },
  });

  await Promise.race([
    redisService.connect(),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]).catch((err: Error) => {
    logger.warn({ err }, 'Redis connect failed at boot — continuing without Redis');
  });
  initializeSocketHandlers(io);
  wsBridge.initialize(io);
  setNotificationSocket(io);
  setQueueSocket(io);

  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    metrics.setConnectedSockets(io.engine.clientsCount);
    socket.on('reaction:add', async (data) => {
      try {
        if (!authSocket.userId) return;
        const { roomId, timestampSec, type, content } = data;
        if (!roomId || timestampSec === undefined || !type) return;

        const { data: reaction } = await supabase
          .from('timeline_reactions')
          .insert({ room_id: roomId, user_id: authSocket.userId, timestamp_sec: timestampSec, type, content })
          .select('*, profiles:user_id(username, avatar_url)')
          .single();

        if (reaction) {
          socket.to(roomId).emit('reaction:new', reaction);
          await supabase.from('activity_feed').insert({
            user_id: authSocket.userId,
            type: 'reaction',
            data: { roomId, timestampSec, reactionType: type },
          });
        }
      } catch (error) {
        logger.error({ err: error }, 'Reaction add error');
      }
    });

    socket.on('disconnect', () => {
      metrics.setConnectedSockets(io.engine.clientsCount);
    });
  });

  return { app, httpServer, io };
}
