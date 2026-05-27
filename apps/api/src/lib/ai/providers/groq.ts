import { logger } from '../../logger';
import { metrics } from '../../../services/metrics.service';

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';

export interface GroqConfig {
  apiKey: string;
  model?: string;
}

interface GroqResponse {
  id: string;
  choices: { delta?: { content?: string }; message?: { content?: string } }[];
}

export function createGroqProvider(config: GroqConfig) {
  const model = config.model || 'llama-3.1-8b-instant';

  async function request(messages: { role: string; content: string }[], opts: { maxTokens?: number; temperature?: number; stream?: boolean } = {}) {
    const response = await fetch(GROQ_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: opts.maxTokens || 1024,
        temperature: opts.temperature ?? 0.7,
        stream: opts.stream ?? false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq ${response.status}: ${errText}`);
    }

    return response;
  }

  return {
    name: 'groq' as const,

    model,

    async generate(prompt: string, system?: string, opts: { maxTokens?: number; temperature?: number } = {}) {
      const start = Date.now();
      const messages = [
        ...(system ? [{ role: 'system' as const, content: system }] : []),
        { role: 'user' as const, content: prompt },
      ];

      const response = await request(messages, opts);
      const data = await response.json() as GroqResponse;
      const duration = Date.now() - start;

      metrics.observeAiLatency('groq', duration);
      logger.debug({ provider: 'groq', duration, model }, 'AI generation completed');

      return data.choices?.[0]?.message?.content || '';
    },

    async generateStream(prompt: string, onChunk: (chunk: string) => void, system?: string, opts: { maxTokens?: number; temperature?: number } = {}) {
      const start = Date.now();
      const messages = [
        ...(system ? [{ role: 'system' as const, content: system }] : []),
        { role: 'user' as const, content: prompt },
      ];

      const response = await request(messages, { ...opts, stream: true });

      if (!response.body) {
        const fallback = await this.generate(prompt, system, opts);
        onChunk(fallback);
        return fallback;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter(l => l.startsWith('data: ') && l !== 'data: [DONE]');

        for (const line of lines) {
          try {
            const json = JSON.parse(line.slice(6)) as GroqResponse;
            const content = json.choices?.[0]?.delta?.content || '';
            if (content) {
              full += content;
              onChunk(content);
            }
          } catch {}
        }
      }

      const duration = Date.now() - start;
      metrics.observeAiLatency('groq', duration);
      logger.debug({ provider: 'groq', duration, model, chars: full.length }, 'AI stream completed');

      return full;
    },
  };
}

export type GroqProvider = ReturnType<typeof createGroqProvider>;
