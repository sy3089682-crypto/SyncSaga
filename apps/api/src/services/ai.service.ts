import { createAiRouter, AiRouter } from '../lib/ai/router/ai-router';
import { aiCache } from '../lib/ai/cache/ai-cache';
import { getEnv } from '@syncsaga/config';
import { logger } from '../lib/logger';

let routerInstance: AiRouter | null = null;

export function getAiRouter(): AiRouter {
  if (routerInstance) return routerInstance;

  const env = getEnv();
  routerInstance = createAiRouter({
    groqApiKey: env.AI_GROQ_API_KEY || env.AI_API_KEY,
    geminiApiKey: env.AI_GEMINI_API_KEY,
    cloudflareAccountId: env.CLOUDFLARE_ACCOUNT_ID,
    cloudflareApiToken: env.CLOUDFLARE_API_TOKEN,
  });

  logger.info({
    groq: !!routerInstance.hasProvider('groq'),
    gemini: !!routerInstance.hasProvider('gemini'),
    cloudflare: !!routerInstance.hasProvider('cloudflare'),
    available: routerInstance.isAvailable(),
  }, 'AI router initialized');

  return routerInstance;
}

export function resetAiRouter(): void {
  routerInstance = null;
}

export { aiCache };
