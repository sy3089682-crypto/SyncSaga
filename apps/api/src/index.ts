import dotenv from 'dotenv';
dotenv.config();

import { createServer } from './server';
import { logger } from './lib/logger';

const PORT = Number.parseInt(process.env.PORT || '4000', 10);

async function bootstrap() {
  const { httpServer } = await createServer();

  httpServer.listen(PORT, () => {
    logger.info({ port: PORT }, 'SyncSaga API listening');
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start SyncSaga API');
  process.exit(1);
});
