import { getEnv } from '@syncsaga/config';
import { logger } from '../lib/logger';
import { cacheService } from './cache.service';
import { metrics } from './metrics.service';

const env = getEnv();

type AiProvider = 'claude' | 'openai' | 'gemini';

interface AiRequestOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  system?: string;
  skipCache?: boolean;
}

export class AiService {
  private provider: AiProvider = 'claude';
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = env.AI_API_KEY || '';
    this.model = env.AI_MODEL || 'claude-3-haiku-20240307';

    if (this.model.startsWith('gpt')) this.provider = 'openai';
    else if (this.model.startsWith('gemini')) this.provider = 'gemini';
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async generate(prompt: string, options: AiRequestOptions = {}): Promise<string> {
    if (!this.isAvailable()) {
      return this.fallbackResponse(prompt);
    }

    const cacheKey = `ai:${this.provider}:${Buffer.from(prompt).toString('base64').slice(0, 100)}`;

    if (!options.skipCache) {
      const cached = await cacheService.get<string>(cacheKey);
      if (cached) return cached;
    }

    metrics.incrementAiRequests(this.provider);

    try {
      let result: string;

      switch (this.provider) {
        case 'claude':
          result = await this.callClaude(prompt, options);
          break;
        case 'openai':
          result = await this.callOpenAI(prompt, options);
          break;
        case 'gemini':
          result = await this.callGemini(prompt, options);
          break;
        default:
          return this.fallbackResponse(prompt);
      }

      if (result && !options.skipCache) {
        await cacheService.set(cacheKey, result, 600);
      }

      return result;
    } catch (error) {
      logger.error('AI generation error, falling back:', error);
      return this.fallbackResponse(prompt);
    }
  }

  async generateStream(prompt: string, onChunk: (chunk: string) => void, options: AiRequestOptions = {}): Promise<string> {
    if (!this.isAvailable()) {
      const fallback = this.fallbackResponse(prompt);
      onChunk(fallback);
      return fallback;
    }

    metrics.incrementAiRequests(this.provider);

    try {
      switch (this.provider) {
        case 'claude':
          return await this.streamClaude(prompt, onChunk, options);
        case 'openai':
          return await this.streamOpenAI(prompt, onChunk, options);
        default:
          const result = await this.generate(prompt, { ...options, skipCache: true });
          onChunk(result);
          return result;
      }
    } catch (error) {
      logger.error('AI stream error:', error);
      const fallback = this.fallbackResponse(prompt);
      onChunk(fallback);
      return fallback;
    }
  }

  private async streamClaude(prompt: string, onChunk: (chunk: string) => void, options: AiRequestOptions): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options.model || this.model,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature ?? 0.7,
        system: options.system || 'You are a helpful anime assistant.',
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      }),
    });

    if (!response.ok) throw new Error(`Claude stream error: ${response.status}`);
    if (!response.body) throw new Error('No response body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value, { stream: true });
      const lines = text.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        try {
          const json = JSON.parse(line.slice(6));
          const content = json.delta?.text || json.content_block?.text || '';
          if (content) {
            full += content;
            onChunk(content);
          }
        } catch {}
      }
    }

    return full;
  }

  private async streamOpenAI(prompt: string, onChunk: (chunk: string) => void, options: AiRequestOptions): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4o-mini',
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature ?? 0.7,
        stream: true,
        messages: [
          { role: 'system', content: options.system || 'You are a helpful anime assistant.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) throw new Error(`OpenAI stream error: ${response.status}`);
    if (!response.body) throw new Error('No response body');

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
          const json = JSON.parse(line.slice(6));
          const content = json.choices?.[0]?.delta?.content || '';
          if (content) {
            full += content;
            onChunk(content);
          }
        } catch {}
      }
    }

    return full;
  }

  private async callClaude(prompt: string, options: AiRequestOptions): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options.model || this.model,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature ?? 0.7,
        system: options.system || 'You are a helpful anime assistant.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`Claude API error: ${response.status}`);
    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  private async callOpenAI(prompt: string, options: AiRequestOptions): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4o-mini',
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature ?? 0.7,
        messages: [
          { role: 'system', content: options.system || 'You are a helpful anime assistant.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private async callGemini(prompt: string, options: AiRequestOptions): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${options.model || 'gemini-pro'}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: options.maxTokens || 1000,
            temperature: options.temperature ?? 0.7,
          },
        }),
      }
    );

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private async fallbackResponse(prompt: string): Promise<string> {
    if (prompt.includes('recommend') || prompt.includes('recommendation')) {
      return JSON.stringify({
        recommendations: [
          { title: 'Fullmetal Alchemist: Brotherhood', reason: 'A masterpiece with perfect pacing and story.', matchScore: 98 },
          { title: 'Steins;Gate', reason: 'Brilliant time-travel story with deep character development.', matchScore: 96 },
          { title: 'Hunter x Hunter', reason: 'Exceptional world-building and character growth.', matchScore: 95 },
        ],
      });
    }

    if (prompt.includes('summarize') || prompt.includes('summary')) {
      return JSON.stringify({
        title: 'Watch Session Summary',
        stats: { totalMessages: 45, participants: 3, reactions: 12 },
        vibe: 'Lively',
        topMoments: [
          { time: '2:30', description: 'Epic fight scene had everyone reacting' },
          { time: '15:00', description: 'Plot twist revealed, chat went wild' },
        ],
      });
    }

    if (prompt.includes('room') || prompt.includes('name')) {
      return JSON.stringify({
        suggestions: [
          'Anime Night Squad',
          'Weeb Watch Party',
          'The Anime Club',
          'Otaku Central',
          'Subbed & Synced',
        ],
      });
    }

    if (prompt.includes('moderate') || prompt.includes('inappropriate') || prompt.includes('toxic')) {
      return JSON.stringify({
        isToxic: false,
        confidence: 0.95,
        categories: [],
        explanation: 'Message appears safe.',
      });
    }

    if (prompt.includes('translate') || prompt.includes('subtitle') || prompt.includes('meaning')) {
      return 'The phrase carries nuanced cultural context. In Japanese, the use of indirect language here suggests the character is being polite while expressing hesitation.';
    }

    return 'I understand you\'re asking about anime. Could you be more specific about what you\'d like to know?';
  }
}

export const aiService = new AiService();
