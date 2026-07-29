import dotenv from 'dotenv';
dotenv.config();

import { createServer } from './server';
import { logger } from './lib/logger';
import { getEnv } from '@syncsaga/config';
import { redisService } from './services/redis.service';
import { queueService } from './services/queue.service';
import type { Server as SocketIOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';

async function bootstrap() {
  try {
    const env = getEnv();
    logger.info({ env: env.NODE_ENV }, 'Starting SyncSaga API server');

    const { httpServer, io } = await createServer();

    httpServer.listen(env.PORT, () => {
      logger.info(`SyncSaga API server running on port ${env.PORT}`);
      logger.info(`WebSocket gateway ready`);
    });

    let isShuttingDown = false;

    const shutdown = async (signal: string) => {
      if (isShuttingDown) {
        logger.warn('Shutdown already in progress — forcing exit');
        process.exit(1);
      }
      isShuttingDown = true;

      logger.info(`Received ${signal}. Shutting down gracefully...`);

      // Force exit after timeout (safety net — must be registered BEFORE process.exit)
      const forceTimer = setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);

      try {
        // 1. Stop accepting new connections
        await new Promise<void>((resolve) => {
          httpServer.close(() => {
            logger.info('HTTP server closed');
            resolve();
          });
        });

        // 2. Close Socket.IO — notify clients to reconnect
        await closeSocketServer(io);
        logger.info('Socket.IO server closed');

        // 3. Disconnect from Redis
        await redisService.disconnect();
        logger.info('Redis disconnected');

        // 4. Shut down BullMQ workers and queues
        await queueService.shutdown();
        logger.info('BullMQ queues shut down');

        clearTimeout(forceTimer);
        // Brief delay so logs flush, then exit cleanly
        setTimeout(() => process.exit(0), 100);
      } catch (err) {
        logger.error({ err }, 'Error during graceful shutdown');
        clearTimeout(forceTimer);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', (error) => {
      logger.error({ err: error }, 'Uncaught exception');
      shutdown('uncaughtException');
    });
    process.on('unhandledRejection', (reason) => {
      logger.error({ reason }, 'Unhandled rejection');
      shutdown('unhandledRejection');
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

async function closeSocketServer(io: SocketIOServer): Promise<void> {
  return new Promise((resolve) => {
    io.close(() => resolve());
    setTimeout(() => resolve(), 5000);
  });
}

bootstrap();
