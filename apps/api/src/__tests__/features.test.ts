import { describe, it, expect, beforeEach } from 'vitest';

describe('FeatureService', () => {
  let featureService: any;

  beforeEach(async () => {
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
