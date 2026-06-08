import dotenv from 'dotenv';
dotenv.config();

import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

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
