import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Analytics } from './analytics';

describe('Analytics', () => {
  let analytics: Analytics;

  beforeEach(() => {
    analytics = new Analytics();
    vi.restoreAllMocks();
  });

  it('should initialize with user ID', () => {
    analytics.init('user-1');
    expect(analytics.isInitialized()).toBe(false);
  });

  it('should capture events without throwing', () => {
    expect(() => analytics.capture('test_event', { foo: 'bar' })).not.toThrow();
  });

  it('should identify users without throwing', () => {
    expect(() => analytics.identify('user-1', { username: 'test' })).not.toThrow();
  });

  it('should pageview without throwing', () => {
    expect(() => analytics.pageview('/test')).not.toThrow();
  });

  it('should track room join', () => {
    expect(() => analytics.trackRoomJoin('room-1', 'public', 5)).not.toThrow();
  });

  it('should track sync failure', () => {
    expect(() => analytics.trackSyncFailure('room-1', 500)).not.toThrow();
  });

  it('should track reconnection', () => {
    expect(() => analytics.trackReconnect('room-1', 2)).not.toThrow();
  });

  it('should track achievement unlocked', () => {
    expect(() => analytics.trackAchievementUnlocked('first_room', 'First Room')).not.toThrow();
  });

  it('should track extension event', () => {
    expect(() => analytics.trackExtensionEvent('video_detected', { hasVideo: true })).not.toThrow();
  });
});
