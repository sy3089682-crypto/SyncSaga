import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';

export type AuditAction =
  | 'user.register'
  | 'user.login'
  | 'user.logout'
  | 'room.create'
  | 'room.join'
  | 'room.leave'
  | 'room.delete'
  | 'room.kick'
  | 'room.ban'
  | 'sync.takeover'
  | 'sync.lock'
  | 'clip.create'
  | 'clip.delete'
  | 'friend.request'
  | 'friend.accept'
  | 'moderation.report'
  | 'moderation.ban'
  | 'moderation.unban'
  | 'admin.action';

export class AuditService {
  async log(action: AuditAction, userId: string, metadata?: Record<string, unknown>) {
    try {
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action,
        metadata: metadata || {},
        ip_address: null,
        user_agent: null,
      });

      logger.info({ action, userId, metadata }, 'Audit log');
    } catch (error) {
      logger.error({ action, userId, error }, 'Failed to write audit log');
    }
  }

  async getRecent(userId: string, limit = 50): Promise<any[]> {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  }
}

export const auditService = new AuditService();
