import { getEnv } from '@syncsaga/config';

export type FeatureFlag =
  | 'ai_recommendations'
  | 'ai_moderation'
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
  { key: 'ai_moderation', description: 'AI content moderation', defaultEnabled: true, requiresEnv: 'AI_API_KEY' },
  { key: 'extension_diagnostics', description: 'Extension diagnostic tools', defaultEnabled: true },
  { key: 'voice_chat', description: 'Voice chat via LiveKit', defaultEnabled: true, requiresEnv: 'LIVEKIT_API_KEY' },
  { key: 'clips', description: 'Clip creation and sharing', defaultEnabled: true, requiresSubscription: 'premium' },
  { key: 'streaks', description: 'Watch streaks system', defaultEnabled: true },
  { key: 'achievements', description: 'Achievement system', defaultEnabled: true },
  { key: 'analytics', description: 'Usage analytics', defaultEnabled: true, requiresEnv: 'POSTHOG_API_KEY' },
  { key: 'embed', description: 'Embedded rooms for external sites', defaultEnabled: true },
  { key: 'soundboard', description: 'Soundboard effects', defaultEnabled: true },
  { key: 'taste_graph', description: 'Taste matching graph', defaultEnabled: true },
];

class FeatureService {
  private overrides: Map<FeatureFlag, boolean> = new Map();

  setOverride(flag: FeatureFlag, enabled: boolean) {
    this.overrides.set(flag, enabled);
  }

  clearOverride(flag: FeatureFlag) {
    this.overrides.delete(flag);
  }

  isEnabled(flag: FeatureFlag): boolean {
    const override = this.overrides.get(flag);
    if (override !== undefined) return override;

    const config = FLAGS.find(f => f.key === flag);
    if (!config) return false;

    if (!config.defaultEnabled) return false;

    if (config.requiresEnv) {
      const env = getEnv() as any;
      if (!env[config.requiresEnv]) return false;
    }

    return true;
  }

  getFeatureList(): (FlagConfig & { enabled: boolean })[] {
    return FLAGS.map(f => ({ ...f, enabled: this.isEnabled(f.key) }));
  }

  getEnabledFeatures(): FeatureFlag[] {
    return FLAGS.filter(f => this.isEnabled(f.key)).map(f => f.key);
  }

  isAvailableForPlan(flag: FeatureFlag, plan: string): boolean {
    const config = FLAGS.find(f => f.key === flag);
    if (!config || !config.requiresSubscription) return true;
    if (plan === 'pro') return true;
    if (plan === 'premium' && config.requiresSubscription === 'premium') return true;
    return false;
  }
}

export const featureService = new FeatureService();
