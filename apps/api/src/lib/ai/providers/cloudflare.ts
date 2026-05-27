import { logger } from '../../logger';
import { metrics } from '../../../services/metrics.service';

export interface CloudflareConfig {
  accountId: string;
  apiToken: string;
  model?: string;
}

interface EmbeddingResponse {
  result?: { data?: number[][] };
  success: boolean;
  errors?: string[];
}

interface TextGenerationResponse {
  result?: { response?: string };
  success: boolean;
  errors?: string[];
}

export function createCloudflareProvider(config: CloudflareConfig) {
  const textModel = config.model || '@cf/meta/llama-3.1-8b-instruct';
  const embedModel = '@cf/baai/bge-small-en-v1.5';

  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/ai/run`;

  async function run<T>(model: string, input: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${baseUrl}/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Cloudflare ${response.status}: ${errText}`);
    }

    return response.json() as Promise<T>;
  }

  return {
    name: 'cloudflare' as const,

    async generate(prompt: string, system?: string, opts: { maxTokens?: number; temperature?: number } = {}) {
      const start = Date.now();
      const messages = [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: prompt },
      ];

      const data = await run<TextGenerationResponse>(textModel, {
        messages,
        max_tokens: opts.maxTokens || 1024,
        temperature: opts.temperature ?? 0.7,
        stream: false,
      });

      const duration = Date.now() - start;
      metrics.observeAiLatency('cloudflare', duration);
      logger.debug({ provider: 'cloudflare', duration, model: textModel }, 'AI generation completed');

      if (!data.success) {
        logger.error({ errors: data.errors }, 'Cloudflare generation failed');
        return '';
      }

      return data.result?.response || '';
    },

    async generateStream(_prompt: string, _onChunk: (chunk: string) => void, _system?: string, _opts?: { maxTokens?: number; temperature?: number }) {
      const result = await this.generate(_prompt, _system, _opts);
      if (result) _onChunk(result);
      return result;
    },

    async embed(texts: string[]): Promise<number[][]> {
      const start = Date.now();
      const data = await run<EmbeddingResponse>(embedModel, { text: texts });

      const duration = Date.now() - start;
      metrics.observeAiLatency('cloudflare-embed', duration);
      logger.debug({ provider: 'cloudflare', duration, model: embedModel, count: texts.length }, 'Embeddings generated');

      if (!data.success || !data.result?.data) {
        logger.error({ errors: data.errors }, 'Embedding failed');
        return texts.map(() => []);
      }

      return data.result.data || texts.map(() => []);
    },
  };
}

export type CloudflareProvider = ReturnType<typeof createCloudflareProvider>;
