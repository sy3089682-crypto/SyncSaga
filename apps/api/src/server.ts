import express from 'express';
import { createServer as createHttpServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';

import { authRouter } from './routes/auth.routes';
import { roomRouter } from './routes/room.routes';
import { initializeSocketHandlers } from './socket';
import { redisService } from './services/redis.service';
import { wsBridge } from './services/wsBridge';
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

  app.use('/api/auth', authRouter);
  app.use('/api/rooms', roomRouter);

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

  initializeSocketHandlers(io);

  wsBridge.initialize(httpServer, '/ws');

  return { app, httpServer, io };
}
