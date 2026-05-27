import { logger } from '../../logger';
import { metrics } from '../../../services/metrics.service';

const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface GeminiConfig {
  apiKey: string;
  model?: string;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  promptFeedback?: { blockReason?: string };
}

export function createGeminiProvider(config: GeminiConfig) {
  const model = config.model || 'gemini-2.0-flash-lite';

  async function request(contents: { role: string; parts: { text: string }[] }[], opts: { maxTokens?: number; temperature?: number } = {}) {
    const url = `${GEMINI_API}/${model}:generateContent?key=${config.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: opts.maxTokens || 2048,
          temperature: opts.temperature ?? 0.7,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini ${response.status}: ${errText}`);
    }

    return response.json() as Promise<GeminiResponse>;
  }

  return {
    name: 'gemini' as const,

    model,

    async generate(prompt: string, system?: string, opts: { maxTokens?: number; temperature?: number } = {}) {
      const start = Date.now();
      const contents = [
        ...(system ? [{ role: 'user' as const, parts: [{ text: system }] }] : []),
        { role: 'user' as const, parts: [{ text: prompt }] },
      ];

      const data = await request(contents, opts);
      const duration = Date.now() - start;

      metrics.observeAiLatency('gemini', duration);
      logger.debug({ provider: 'gemini', duration, model }, 'AI generation completed');

      if (data.promptFeedback?.blockReason) {
        logger.warn({ reason: data.promptFeedback.blockReason }, 'Gemini blocked response');
        return '';
      }

      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    },

    async generateStream(_prompt: string, _onChunk: (chunk: string) => void, _system?: string, _opts?: { maxTokens?: number; temperature?: number }) {
      const result = await this.generate(_prompt, _system, _opts);
      if (result) _onChunk(result);
      return result;
    },
  };
}

export type GeminiProvider = ReturnType<typeof createGeminiProvider>;
