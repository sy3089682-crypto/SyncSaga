import { createGroqProvider, GroqProvider } from '../providers/groq';
import { createGeminiProvider, GeminiProvider } from '../providers/gemini';
import { createCloudflareProvider, CloudflareProvider } from '../providers/cloudflare';
import { providerHealth, ProviderName } from './provider-health';
import { aiCache } from '../cache/ai-cache';
import { logger } from '../../logger';

export type AiPriority = 'speed' | 'quality' | 'embedding';

export interface AiRouterConfig {
  groqApiKey?: string;
  geminiApiKey?: string;
  cloudflareAccountId?: string;
  cloudflareApiToken?: string;
}

interface ProviderSet {
  groq?: GroqProvider;
  gemini?: GeminiProvider;
  cloudflare?: CloudflareProvider;
}

export function createAiRouter(config: AiRouterConfig) {
  const providers: ProviderSet = {};

  if (config.groqApiKey) {
    providers.groq = createGroqProvider({ apiKey: config.groqApiKey });
  }
  if (config.geminiApiKey) {
    providers.gemini = createGeminiProvider({ apiKey: config.geminiApiKey });
  }
  if (config.cloudflareAccountId && config.cloudflareApiToken) {
    providers.cloudflare = createCloudflareProvider({
      accountId: config.cloudflareAccountId,
      apiToken: config.cloudflareApiToken,
    });
  }

  const priorityChain: Record<AiPriority, ProviderName[]> = {
    speed: ['groq', 'cloudflare', 'gemini'],
    quality: ['gemini', 'groq', 'cloudflare'],
    embedding: ['cloudflare'],
  };

  function getAvailableProviders(priority: AiPriority): ProviderName[] {
    return priorityChain[priority].filter(p => {
      if (p === 'groq' && !providers.groq) return false;
      if (p === 'gemini' && !providers.gemini) return false;
      if (p === 'cloudflare' && !providers.cloudflare) return false;
      return providerHealth.isAvailable(p);
    });
  }

  async function tryProvider<T>(
    name: ProviderName,
    fn: () => Promise<T>,
  ): Promise<{ result: T; provider: ProviderName } | null> {
    const start = Date.now();
    try {
      const quotaOk = await aiCache.checkQuota(name, name === 'gemini' ? 60 : 30);
      if (!quotaOk) {
        logger.warn({ provider: name }, 'Provider quota exhausted');
        providerHealth.recordFailure(name, 'quota_exhausted');
        return null;
      }

      const result = await fn();
      providerHealth.recordSuccess(name, Date.now() - start);
      return { result, provider: name };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      providerHealth.recordFailure(name, errMsg);
      logger.error({ provider: name, error: errMsg }, 'Provider request failed');
      return null;
    }
  }

  return {
    isAvailable(): boolean {
      return !!providers.groq || !!providers.gemini || !!providers.cloudflare;
    },

    hasProvider(name: ProviderName): boolean {
      return !!providers[name];
    },

    getHealth() {
      return providerHealth.getStats();
    },

    async generate(
      prompt: string,
      opts: {
        system?: string;
        maxTokens?: number;
        temperature?: number;
        priority?: AiPriority;
        cacheKey?: string;
        cacheTtl?: number;
      } = {},
    ): Promise<{ result: string; provider: ProviderName }> {
      const priority = opts.priority || 'speed';
      const available = getAvailableProviders(priority);

      if (available.length === 0) {
        throw new Error('No AI providers available');
      }

      if (opts.cacheKey) {
        const cached = await aiCache.get(opts.cacheKey);
        if (cached) {
          return { result: cached, provider: 'cache' as ProviderName };
        }
      }

      for (const providerName of available) {
        const provider = providers[providerName];
        if (!provider) continue;

        const attempt = await tryProvider(providerName, () =>
          provider.generate(prompt, opts.system, {
            maxTokens: opts.maxTokens,
            temperature: opts.temperature,
          })
        );

        if (attempt) {
          if (opts.cacheKey) {
            await aiCache.set(opts.cacheKey, attempt.result, opts.cacheTtl);
          }
          return { result: attempt.result, provider: attempt.provider };
        }
      }

      throw new Error('All AI providers failed');
    },

    async generateStream(
      prompt: string,
      onChunk: (chunk: string) => void,
      opts: {
        system?: string;
        maxTokens?: number;
        temperature?: number;
        priority?: AiPriority;
      } = {},
    ): Promise<string> {
      const priority = opts.priority || 'speed';
      const available = getAvailableProviders(priority);

      if (available.length === 0) {
        throw new Error('No AI providers available');
      }

      for (const providerName of available) {
        const provider = providers[providerName];
        if (!provider) continue;

        const attempt = await tryProvider(providerName, () =>
          provider.generateStream(prompt, onChunk, opts.system, {
            maxTokens: opts.maxTokens,
            temperature: opts.temperature,
          })
        );

        if (attempt) {
          return attempt.result;
        }
      }

      throw new Error('All AI providers failed');
    },

    async embed(texts: string[]): Promise<number[][]> {
      if (!providers.cloudflare) {
        throw new Error('Cloudflare provider required for embeddings');
      }
      const attempt = await tryProvider('cloudflare', () =>
        providers.cloudflare!.embed(texts)
      );
      if (attempt) return attempt.result;
      throw new Error('Embedding failed on all providers');
    },
  };
}

export type AiRouter = ReturnType<typeof createAiRouter>;
