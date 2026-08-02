import pino from 'pino';
import { getEnv } from '@syncsaga/config';

const env = getEnv();
const isDev = env.NODE_ENV !== 'production';

type LogFn = (...args: any[]) => void;

export interface AppLogger {
  trace: LogFn;
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  fatal: LogFn;
  child: (bindings: Record<string, unknown>, options?: Record<string, unknown>) => AppLogger;
  level: string;
}

// pino's strict literal overloads reject common `logger.error('msg', err)` calls;
// the loose interface keeps runtime behavior identical while compiling cleanly.
export const pinoLogger = pino({
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

// Loose interface for ergonomic calls; runtime object is the pino instance above.
export const logger = pinoLogger as unknown as AppLogger;
