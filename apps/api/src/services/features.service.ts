import { getEnv, Env } from '@syncsaga/config';
import { redisService } from './redis.service';

export type FeatureFlag =
  | 'ai_recommendations'
  | 'ai_moderation'
  | 'ai_recaps'
  | 'ai_room_names'
  | 'ai_search'
  | 'ai_summaries'
  | 'ai_chat_assistant'
  | 'ai_embeddings'
  | 'extension_diagnostics'
  | 'voice_chat'
  | 'clips'
  | 'streaks'
  | 'achievements'
  | 'analytics'
  | 'embed'
  | 'soundboard'
  | 'taste_graph';

type FlagConfig = {
  key: FeatureFlag;
  description: string;
  defaultEnabled: boolean;
  requiresSubscription?: 'premium' | 'pro';
  requiresEnv?: string;
};

const FLAGS: FlagConfig[] = [
  { key: 'ai_recommendations', description: 'AI-powered anime recommendations', defaultEnabled: true, requiresSubscription: 'premium' },
  { key: 'ai_moderation', description: 'AI content moderation', defaultEnabled: true },
  { key: 'ai_recaps', description: 'AI watch party recaps', defaultEnabled: true },
  { key: 'ai_room_names', description: 'AI room name generation', defaultEnabled: true },
  { key: 'ai_search', description: 'AI-powered search', defaultEnabled: true },
  { key: 'ai_summaries', description: 'AI session summaries', defaultEnabled: true },
  { key: 'ai_chat_assistant', description: 'AI chat assistant (SyncBot)', defaultEnabled: true },
  { key: 'ai_embeddings', description: 'AI vector embeddings', defaultEnabled: true, requiresEnv: 'CLOUDFLARE_ACCOUNT_ID' },
  { key: 'extension_diagnostics', description: 'Extension diagnostic tools', defaultEnabled: true },
  { key: 'voice_chat', description: 'Voice chat via LiveKit', defaultEnabled: true, requiresEnv: 'LIVEKIT_API_KEY' },
  { key: 'clips', description: 'Clip creation and sharing', defaultEnabled: true },
  { key: 'streaks', description: 'Watch streaks system', defaultEnabled: true },
  { key: 'achievements', description: 'Achievement system', defaultEnabled: true },
  { key: 'analytics', description: 'Usage analytics', defaultEnabled: true, requiresEnv: 'POSTHOG_API_KEY' },
  { key: 'embed', description: 'Embedded rooms for external sites', defaultEnabled: true },
  { key: 'soundboard', description: 'Soundboard effects', defaultEnabled: true },
  { key: 'taste_graph', description: 'Taste matching graph', defaultEnabled: true },
];

const OVERRIDE_PREFIX = 'feature:override:';

class FeatureService {
  async loadOverrides(): Promise<Map<FeatureFlag, boolean>> {
    const map = new Map<FeatureFlag, boolean>();
    try {
      const keys = await redisService.getClient().keys(`${OVERRIDE_PREFIX}*`);
      if (keys.length > 0) {
        const values = await redisService.getClient().mget(keys);
        for (let i = 0; i < keys.length; i++) {
          const flag = keys[i].replace(OVERRIDE_PREFIX, '') as FeatureFlag;
          if (values[i] !== null) {
            map.set(flag, values[i] === 'true');
          }
        }
      }
    } catch {}
    return map;
  }

  async setOverride(flag: FeatureFlag, enabled: boolean) {
    try {
      await redisService.getClient().set(`${OVERRIDE_PREFIX}${flag}`, enabled ? 'true' : 'false', { EX: 86400 * 7 });
    } catch {}
  }

  async clearOverride(flag: FeatureFlag) {
    try {
      await redisService.getClient().del(`${OVERRIDE_PREFIX}${flag}`);
    } catch {}
  }

  async isEnabled(flag: FeatureFlag): Promise<boolean> {
    try {
      const overrideVal = await redisService.getClient().get(`${OVERRIDE_PREFIX}${flag}`);
      if (overrideVal !== null) return overrideVal === 'true';
    } catch {}

    const config = FLAGS.find(f => f.key === flag);
    if (!config) return false;
    if (!config.defaultEnabled) return false;

    if (config.requiresEnv) {
      const env = getEnv();
      if (!(env as unknown as Record<string, string | undefined>)[config.requiresEnv]) return false;
    }

    return true;
  }

  async getFeatureList(): Promise<(FlagConfig & { enabled: boolean })[]> {
    const results = await Promise.all(
      FLAGS.map(async f => ({ ...f, enabled: await this.isEnabled(f.key) }))
    );
    return results;
  }

  async getEnabledFeatures(): Promise<FeatureFlag[]> {
    const results = await Promise.all(
      FLAGS.map(async f => ({ key: f.key, enabled: await this.isEnabled(f.key) }))
    );
    return results.filter(f => f.enabled).map(f => f.key);
  }

  async isAvailableForPlan(flag: FeatureFlag, plan: 'free' | 'premium' | 'pro'): Promise<boolean> {
    const isFlagEnabled = await this.isEnabled(flag);
    if (!isFlagEnabled) return false;

    const config = FLAGS.find(f => f.key === flag);
    if (!config) return false;

    if (config.requiresSubscription === 'pro') {
      return plan === 'pro';
    }
    if (config.requiresSubscription === 'premium') {
      return plan === 'premium' || plan === 'pro';
    }

    return true;
  }
}

export const featureService = new FeatureService();
