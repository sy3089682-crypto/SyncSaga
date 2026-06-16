import { getAiRouter } from '../../../services/ai.service';
import { aiCache } from '../cache/ai-cache';
import { providerHealth } from '../router/provider-health';
import { logger } from '../../logger';
import { MODERATION_PROMPT } from '../prompts';

export interface ModerationResult {
  isToxic: boolean;
  confidence: number;
  categories: string[];
  explanation?: string;
}

const PROFANITY_WORDS = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap', 'dick',
  'bastard', 'piss', 'slut', 'whore', 'douche', 'jackass',
  'motherfucker',
];

const profanityPattern = new RegExp(`\\b(${PROFANITY_WORDS.join('|')})\\b`, 'gi');

function detectSpam(content: string): boolean {
  const spamPatterns = [
    /(https?:\/\/[^\s]+){3,}/,
    /([!?.]){5,}/,
    /([A-Z]){5,}/,
    /(.)\1{10,}/,
    /\b(buy|cheap|free|click|subscribe|follow|like|share)\b.*\b(now|today|limited|offer)\b/i,
  ];
  return spamPatterns.some(p => p.test(content));
}

function detectPersonalInfo(content: string): boolean {
  const patterns = [
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
    /\b\d{16}\b/,
    /\b\d{3}-\d{2}-\d{4}\b/,
  ];
  return patterns.some(p => p.test(content));
}

export async function checkMessage(content: string): Promise<ModerationResult> {
  const categories: string[] = [];

  if (profanityPattern.test(content)) {
    categories.push('profanity');
  }

  if (detectSpam(content)) {
    categories.push('spam');
  }

  if (detectPersonalInfo(content)) {
    categories.push('personal_info');
  }

  const isToxicLocal = categories.length > 0;

  try {
    const router = getAiRouter();
    if (router.isAvailable()) {
      const prompt = `${MODERATION_PROMPT}\n\nMessage to analyze: "${content}"`;
      const cacheKey = `mod:${aiCache.dedupKey('mod', content)}`;

      const { result } = await router.generate(prompt, {
        system: 'You are a content moderation AI. Respond only with JSON.',
        temperature: 0.1,
        maxTokens: 300,
        cacheKey,
        cacheTtl: 3600,
        priority: 'speed',
      });

      try {
        const parsed = JSON.parse(result);
        return {
          isToxic: parsed.isToxic || isToxicLocal,
          confidence: parsed.confidence || 0.5,
          categories: [...new Set([...categories, ...(parsed.categories || [])])],
          explanation: parsed.explanation,
        };
      } catch {
        logger.debug({ result }, 'Failed to parse moderation AI response as JSON');
      }
    }
  } catch (error) {
    logger.error({ error }, 'AI moderation failed, using local fallback');
  }

  return {
    isToxic: isToxicLocal,
    confidence: isToxicLocal ? 0.85 : 0.05,
    categories,
  };
}

export function sanitizeContent(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/data:/gi, '')
    .slice(0, 2000);
}

export { providerHealth };
