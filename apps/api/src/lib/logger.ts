import pino from 'pino';
import { getEnv } from '@syncsaga/config';

function createLogger() {
  let env;
  try {
    env = getEnv();
  } catch {
    env = { NODE_ENV: 'development', LOG_LEVEL: 'debug' };
  }
  const isDev = env.NODE_ENV !== 'production';

  return pino({
    level: (env as any).LOG_LEVEL || (isDev ? 'debug' : 'info'),
    transport: isDev
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
      : undefined,
    redact: {
      paths: ['password', 'token', 'secret', 'authorization', 'cookie', 'key'],
      censor: '[REDACTED]',
    },
    serializers: {
      req: (req: any) => ({
        method: req.method,
        url: req.url,
        statusCode: req.statusCode,
        responseTime: req.responseTime,
      }),
      err: pino.stdSerializers.err,
    },
  });
}

export const logger = createLogger();
