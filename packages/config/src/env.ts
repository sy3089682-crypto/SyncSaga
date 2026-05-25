import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),

  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),

  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  NEXT_PUBLIC_LIVEKIT_URL: z.string().optional(),

  NEXT_PUBLIC_API_URL: z.string().default('http://localhost:4000'),
  NEXT_PUBLIC_SOCKET_URL: z.string().default('http://localhost:4000'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  EXTENSION_WS_PORT: z.coerce.number().default(4001),
  EXTENSION_WS_URL: z.string().default('ws://localhost:4000/ws'),

  DISCORD_BOT_TOKEN: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  SYNCSAGA_API_URL: z.string().default('http://localhost:4000'),
  SYNCSAGA_API_TOKEN: z.string().optional(),

  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('claude-3-haiku-20240307'),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  SENTRY_DSN: z.string().optional(),
  POSTHOG_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (_env) return _env;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.errors
      .filter(e => e.message.includes('Required'))
      .map(e => e.path.join('.'));
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}\n` +
        `Full errors:\n${result.error.errors.map(e => `  ${e.path.join('.')}: ${e.message}`).join('\n')}`
      );
    }
    console.warn('Environment validation warnings:', result.error.errors.map(e => e.path.join('.')).join(', '));
    _env = result.data as Env;
    return _env;
  }
  _env = result.data;
  return _env;
}

export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development';
}
