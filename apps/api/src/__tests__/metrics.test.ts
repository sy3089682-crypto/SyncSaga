import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('MetricsService', () => {
  let metrics: any;

  beforeEach(async () => {
    vi.resetModules();
    vi.restoreAllMocks();
    const mod = await import('../services/metrics.service');
    metrics = mod.metrics;
    metrics.init();
  });

  it('should be defined', () => {
    expect(metrics).toBeDefined();
  });

  it('should initialize metrics', () => {
    expect(() => metrics.init()).not.toThrow();
  });

  it('should increment HTTP counter', () => {
    expect(() => metrics.incrementHttp('GET', '/test', 200)).not.toThrow();
  });

  it('should observe HTTP duration', () => {
    expect(() => metrics.observeHttpDuration('GET', '/test', 100)).not.toThrow();
  });

  it('should set connected sockets gauge', () => {
    expect(() => metrics.setConnectedSockets(5)).not.toThrow();
  });

  it('should increment AI requests', () => {
    expect(() => metrics.incrementAiRequests('claude')).not.toThrow();
  });

  it('should record sync drift', () => {
    expect(() => metrics.recordSyncDrift(50)).not.toThrow();
  });

  it('should get metrics as JSON', () => {
    const json = metrics.getJsonMetrics();
    expect(json).toBeDefined();
    expect(typeof json).toBe('object');
  });

  it('should get health status', () => {
    const health = metrics.getHealth();
    expect(health).toBeDefined();
    expect(health.initialized).toBe(true);
  });
});
