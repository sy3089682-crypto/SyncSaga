import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, string>();

vi.mock('../services/redis.service', () => ({
  redisService: {
    getClient: () => ({
      get: vi.fn(async (k: string) => store.get(k) ?? null),
      set: vi.fn(async (k: string, v: string) => { store.set(k, v); return 'OK'; }),
      setEx: vi.fn(async (k: string, _s: number, v: string) => { store.set(k, v); return 'OK'; }),
      del: vi.fn(async (k: string) => { store.delete(k); return 1; }),
      keys: vi.fn(async () => Array.from(store.keys())),
      scan: vi.fn(async () => ({ cursor: 0, keys: Array.from(store.keys()) })),
      ping: vi.fn(async () => 'PONG'),
      eval: vi.fn(async () => 'OK'),
    }),
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
    checkRateLimit: vi.fn(async () => true),
  },
}));

describe('FeatureService', () => {
  let featureService: any;

  beforeEach(async () => {
    store.clear();
    const mod = await import('../services/features.service');
    featureService = mod.featureService;
  });

  it('should list all features', async () => {
    const features = await featureService.getFeatureList();
    expect(Array.isArray(features)).toBe(true);
    expect(features.length).toBeGreaterThan(0);
  });

  it('should check individual features', async () => {
    const enabled = await featureService.isEnabled('extension_diagnostics');
    expect(typeof enabled).toBe('boolean');
  });

  it('should get enabled features', async () => {
    const enabled = await featureService.getEnabledFeatures();
    expect(Array.isArray(enabled)).toBe(true);
  });

  it('should set and clear overrides', async () => {
    await featureService.setOverride('extension_diagnostics', false);
    const disabled = await featureService.isEnabled('extension_diagnostics');
    expect(disabled).toBe(false);

    await featureService.clearOverride('extension_diagnostics');
  });

  it('should check plan availability', async () => {
    const freeAvailable = await featureService.isAvailableForPlan('ai_recommendations', 'free');
    expect(freeAvailable).toBe(false);

    const premiumAvailable = await featureService.isAvailableForPlan('ai_recommendations', 'premium');
    expect(premiumAvailable).toBe(true);

    const proAvailable = await featureService.isAvailableForPlan('ai_recommendations', 'pro');
    expect(proAvailable).toBe(true);
  });
});
