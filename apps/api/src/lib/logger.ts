import pino from 'pino';
import { getEnv } from '@syncsaga/config';

const env = getEnv();
const isDev = env.NODE_ENV !== 'production';

export const logger = pino({
  level: env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
    : undefined,
  redact: {
    paths: ['password', 'token', 'secret', 'authorization', 'cookie', 'key'],
    censor: '[REDACTED]',
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      statusCode: req.statusCode,
      responseTime: req.responseTime,
    }),
    err: pino.stdSerializers.err,
  },
});
