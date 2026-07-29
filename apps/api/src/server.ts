import express from 'express';
import { createServer as createHttpServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { randomUUID } from 'crypto';
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
import { docsRouter } from './routes/docs';
import { initializeSocketHandlers } from './socket';
import { redisService } from './services/redis.service';
import { wsBridge } from './services/wsBridge';
import { setNotificationSocket } from './services/notification.service';
import { supabase } from './lib/supabase';
import { logger } from './lib/logger';
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
    logger,
    autoLogging: { ignore: (req) => req.url === '/health/live' || req.url === '/health/ready' || req.url === '/metrics' },
  }));

  // Request ID middleware — generates unique ID for each request for tracing
  app.use((req, _res, next) => {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    req.headers['x-request-id'] = requestId;
    _res.setHeader('X-Request-Id', requestId);
    next();
  });

  // Rate limiting and CSRF
  app.use(rateLimitMiddleware(100, 60));
  app.use(csrfProtection);

  // HTTP metrics
  app.use((req, _res, next) => {
    const start = Date.now();
    _res.on('finish', () => {
      metrics.incrementHttp(req.method, req.url, _res.statusCode);
      metrics.observeHttpDuration(req.method, req.url, Date.now() - start);
    });
    next();
  });

  // Liveness probe — process is running
  app.get('/health/live', (_req, res) => {
    res.status(200).json({
      status: 'alive',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness probe — dependencies are ready
  app.get('/health/ready', async (_req, res) => {
    let dbPing = false;
    let redisPing = false;
    try {
      const { data } = await supabase.from('rooms').select('id').limit(1);
      dbPing = !!data || true;
    } catch { /* db not ready */ }
    try {
      if (redisService.getClient()) {
        await redisService.getClient().ping();
        redisPing = true;
      }
    } catch { /* redis not ready */ }
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

  // Legacy health endpoint (backward compatibility)
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

  // API v1 routes
  const v1Router = express.Router();
  v1Router.use('/auth', authRouter);
  v1Router.use('/rooms', roomRouter);
  v1Router.use('/reactions', reactionsRouter);
  v1Router.use('/clips', clipsRouter);
  v1Router.use('/activity', activityRouter);
  v1Router.use('/embed', embedRouter);
  v1Router.use('/ai', aiRouter);
  v1Router.use('/features', featuresRouter);
  v1Router.use('/payments', paymentsRouter);
  v1Router.use('/docs', docsRouter);

  app.use('/api/v1', v1Router);

  // Backward-compatible unversioned routes (deprecated — will be removed in v2)
  app.use('/api/auth', authRouter);
  app.use('/api/rooms', roomRouter);
  app.use('/api/reactions', reactionsRouter);
  app.use('/api/clips', clipsRouter);
  app.use('/api/activity', activityRouter);
  app.use('/api/embed', embedRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/features', featuresRouter);
  app.use('/api/payments', paymentsRouter);

  // Metrics endpoint
  app.use('/metrics', metricsRouter);

  // Sentry error handler (before custom error handler)
  app.use(sentryErrorHandler());

  // Centralized error handler (must be last)
  app.use(errorHandler);

  // Socket.IO server
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
    perMessageDeflate: { threshold: 1024 },
  });

  await redisService.connect();
  initializeSocketHandlers(io);
  wsBridge.initialize(io);
  setNotificationSocket(io);
  setQueueSocket(io);

  // Socket-level reaction handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    metrics.setConnectedSockets(io.engine.clientsCount);
    socket.on('reaction:add', async (data) => {
      try {
        if (!socket.userId) return;
        const { roomId, timestampSec, type, content } = data;
        if (!roomId || timestampSec === undefined || !type) return;

        const { data: reaction } = await supabase
          .from('timeline_reactions')
          .insert({
            room_id: roomId,
            user_id: socket.userId,
            timestamp_sec: timestampSec,
            type,
            content,
          })
          .select('*, profiles:user_id(username, avatar_url)')
          .single();

        if (reaction) {
          socket.to(roomId).emit('reaction:new', reaction);
          await supabase.from('activity_feed').insert({
            user_id: socket.userId,
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
