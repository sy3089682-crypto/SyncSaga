"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnv = getEnv;
exports.isProduction = isProduction;
exports.isDevelopment = isDevelopment;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().default(4000),
    REDIS_URL: zod_1.z.string().url().default('redis://localhost:6379'),
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:3000'),
    SUPABASE_URL: zod_1.z.string().url(),
    SUPABASE_SERVICE_KEY: zod_1.z.string().min(1),
    SUPABASE_ANON_KEY: zod_1.z.string().min(1).optional(),
    NEXT_PUBLIC_SUPABASE_URL: zod_1.z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: zod_1.z.string().optional(),
    LIVEKIT_API_KEY: zod_1.z.string().optional(),
    LIVEKIT_API_SECRET: zod_1.z.string().optional(),
    NEXT_PUBLIC_LIVEKIT_URL: zod_1.z.string().optional(),
    NEXT_PUBLIC_API_URL: zod_1.z.string().default('http://localhost:4000'),
    NEXT_PUBLIC_SOCKET_URL: zod_1.z.string().default('http://localhost:4000'),
    LOG_LEVEL: zod_1.z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    EXTENSION_WS_URL: zod_1.z.string().default('ws://localhost:4000/ws'),
    AI_API_KEY: zod_1.z.string().optional(),
    AI_GROQ_API_KEY: zod_1.z.string().optional(),
    AI_GEMINI_API_KEY: zod_1.z.string().optional(),
    CLOUDFLARE_ACCOUNT_ID: zod_1.z.string().optional(),
    CLOUDFLARE_API_TOKEN: zod_1.z.string().optional(),
    STRIPE_SECRET_KEY: zod_1.z.string().optional(),
    STRIPE_WEBHOOK_SECRET: zod_1.z.string().optional(),
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: zod_1.z.string().optional(),
    SENTRY_DSN: zod_1.z.string().optional(),
    POSTHOG_API_KEY: zod_1.z.string().optional(),
});
let _env = null;
function getEnv() {
    if (_env)
        return _env;
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        const missing = result.error.errors
            .filter(e => e.message.includes('Required'))
            .map(e => e.path.join('.'));
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}\n` +
                `Full errors:\n${result.error.errors.map(e => `  ${e.path.join('.')}: ${e.message}`).join('\n')}`);
        }
        console.warn('Environment validation warnings:', result.error.errors.map(e => e.path.join('.')).join(', '));
        _env = (result.data || process.env);
        return _env;
    }
    _env = result.data;
    return _env;
}
function isProduction() { return getEnv().NODE_ENV === 'production'; }
function isDevelopment() { return getEnv().NODE_ENV === 'development'; }
//# sourceMappingURL=env.js.map