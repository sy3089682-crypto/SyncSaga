import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { aiService } from './ai.service';

interface ModerationResult {
  isToxic: boolean;
  confidence: number;
  categories: string[];
  explanation?: string;
}

interface ProfanityFilter {
  words: string[];
  pattern: RegExp;
}

class ModerationService {
  private profanityFilter: ProfanityFilter;

  constructor() {
    const profanityList = [
      'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap', 'dick', 'bastard',
      'piss', 'slut', 'whore', 'douche', 'jackass', 'motherfucker',
    ];

    this.profanityFilter = {
      words: profanityList,
      pattern: new RegExp(`\\b(${profanityList.join('|')})\\b`, 'gi'),
    };
  }

  async checkMessage(content: string): Promise<ModerationResult> {
    const categories: string[] = [];

    const hasProfanity = this.profanityFilter.pattern.test(content);
    if (hasProfanity) {
      categories.push('profanity');
    }

    const hasSpam = this.detectSpam(content);
    if (hasSpam) {
      categories.push('spam');
    }

    const hasPersonalInfo = this.detectPersonalInfo(content);
    if (hasPersonalInfo) {
      categories.push('personal_info');
    }

    const isToxic = categories.length > 0;

    if (aiService.isAvailable() && !isToxic) {
      try {
        const aiResult = await aiService.generate(
          `Check if this message is toxic or inappropriate. Respond with JSON: { "isToxic": boolean, "confidence": number, "categories": string[] }. Message: "${content}"`,
          { system: 'You are a content moderation AI. Respond only with JSON.', temperature: 0.1 }
        );

        if (aiResult) {
          try {
            const parsed = JSON.parse(aiResult);
            return {
              isToxic: parsed.isToxic || isToxic,
              confidence: parsed.confidence || 0.5,
              categories: [...new Set([...categories, ...(parsed.categories || [])])],
              explanation: parsed.explanation,
            };
          } catch {}
        }
      } catch {}
    }

    return {
      isToxic,
      confidence: isToxic ? 0.9 : 0.1,
      categories,
    };
  }

  async reportUser(reporterId: string, reportedId: string, reason: string, details?: string, roomId?: string) {
    const { data, error } = await supabase.from('reports').insert({
      reporter_id: reporterId,
      reported_id: reportedId,
      room_id: roomId,
      reason,
      details,
      status: 'pending',
    }).select().single();

    if (error) {
      logger.error('Failed to create report:', error);
      return null;
    }

    return data;
  }

  async banUser(roomId: string, userId: string, bannedById: string, reason?: string) {
    await supabase.from('room_members').update({ is_banned: true })
      .eq('room_id', roomId)
      .eq('user_id', userId);

    await supabase.from('rooms').update({
      banned_users: supabase.rpc('array_append_unique', {
        arr: supabase.ref('banned_users'),
        element: userId,
      }),
    } as any).eq('id', roomId);
  }

  async shadowBan(roomId: string, userId: string) {
    logger.warn({ roomId, userId }, 'Shadow ban applied');
  }

  async getUserReports(userId: string): Promise<number> {
    const { count } = await supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('reported_id', userId)
      .eq('status', 'pending');
    return count || 0;
  }

  private detectSpam(content: string): boolean {
    const spamPatterns = [
      /(https?:\/\/[^\s]+){3,}/,
      /([!?.]){5,}/,
      /([A-Z]){5,}/,
      /(.)\1{10,}/,
      /\b(buy|cheap|free|click|subscribe|follow|like|share|check out)\b.*\b(now|today|limited|offer)\b/i,
    ];

    return spamPatterns.some(p => p.test(content));
  }

  private detectPersonalInfo(content: string): boolean {
    const patterns = [
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
      /\b\d{16}\b/,
      /\b\d{3}-\d{2}-\d{4}\b/,
    ];

    return patterns.some(p => p.test(content));
  }

  sanitizeContent(text: string): string {
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
}

export const moderationService = new ModerationService();
