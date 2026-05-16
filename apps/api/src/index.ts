import dotenv from 'dotenv';
dotenv.config();

import { createServer } from './server';
import { logger } from './lib/logger';

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  try {
    const { httpServer } = await createServer();
    
    httpServer.listen(PORT, () => {
      logger.info(`🚀 SyncSaga API server running on port ${PORT}`);
      logger.info(`📡 Socket.IO gateway ready`);
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
