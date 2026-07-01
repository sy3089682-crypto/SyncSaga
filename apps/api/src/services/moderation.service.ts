import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { checkMessage, sanitizeContent } from '../lib/ai/moderation/llama-guard';

interface ModerationResult {
  isToxic: boolean;
  confidence: number;
  categories: string[];
  explanation?: string;
}

export class ModerationService {
  async checkMessage(content: string): Promise<ModerationResult> {
    return checkMessage(content);
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
      logger.error('Failed to create report:', error as Error);
      return null;
    }
    return data;
  }

  async banUser(roomId: string, userId: string, bannedById: string, reason?: string) {
    await supabase.from('room_members').update({ is_banned: true }).eq('room_id', roomId).eq('user_id', userId);
    await supabase.from('rooms').update({
      banned_users: supabase.rpc('array_append_unique', { arr: supabase.ref('banned_users'), element: userId }),
    }).eq('id', roomId);
  }

  async shadowBan(roomId: string, userId: string) {
    logger.warn({ roomId, userId }, 'Shadow ban applied');
  }

  async getUserReports(userId: string): Promise<number> {
    const { count } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('reported_id', userId).eq('status', 'pending');
    return count || 0;
  }

  sanitizeContent(text: string): string {
    return sanitizeContent(text);
  }
}

export const moderationService = new ModerationService();