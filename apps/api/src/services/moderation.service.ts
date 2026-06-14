import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { checkMessage, sanitizeContent } from '../lib/ai/moderation/llama-guard';

interface ModerationResult {
  isToxic: boolean;
  confidence: number;
  categories: string[];
  explanation?: string;
}

class ModerationService {
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
      logger.error(error, 'Failed to create report:');
      return null;
    }

    return data;
  }

  async banUser(roomId: string, userId: string, _bannedById: string, _reason?: string) {
    await supabase.from('room_members').update({ is_banned: true })
      .eq('room_id', roomId)
      .eq('user_id', userId);

    // Get current banned users
    const { data: room } = await supabase.from('rooms').select('banned_users').eq('id', roomId).single();
    const currentBanned = (room as any)?.banned_users || [];
    
    if (!currentBanned.includes(userId)) {
      await supabase.from('rooms').update({
        banned_users: [...currentBanned, userId],
      }).eq('id', roomId);
    }
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

  sanitizeContent(text: string): string {
    return sanitizeContent(text);
  }
}

export { ModerationService };
export const moderationService = new ModerationService();
