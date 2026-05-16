import express from 'express';
import { createServer as createHttpServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';

import { authRouter } from './routes/auth.routes';
import { roomRouter } from './routes/room.routes';
import { initializeSocketHandlers } from './socket';
import { redisService } from './services/redis.service';
import { logger } from './lib/logger';

export async function createServer() {
  const app = express();
  const httpServer = createHttpServer(app);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Allow websocket connections
  }));
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }));

  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes
  app.use('/api/auth', authRouter);
  app.use('/api/rooms', roomRouter);

  // Socket.IO setup
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Initialize Redis
  await redisService.connect();

  // Initialize socket handlers
  initializeSocketHandlers(io);

  return { app, httpServer, io };
}
