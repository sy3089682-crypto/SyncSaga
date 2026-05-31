import dotenv from 'dotenv';
dotenv.config();

import { createServer } from './server';
import { logger } from './lib/logger';
import { getEnv } from '@syncsaga/config';

async function bootstrap() {
  try {
    const env = getEnv();
    logger.info({ env: env.NODE_ENV }, 'Starting SyncSaga API server');

    const { httpServer } = await createServer();

    httpServer.listen(env.PORT, () => {
      logger.info(`SyncSaga API server running on port ${env.PORT}`);
      logger.info(`WebSocket gateway ready`);
    });

    const shutdown = (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', (error) => {
      logger.error(error, 'Uncaught exception');
    });
    process.on('unhandledRejection', (reason) => {
      logger.error({ reason }, 'Unhandled rejection');
    });
  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();
