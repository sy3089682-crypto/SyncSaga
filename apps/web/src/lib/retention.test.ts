import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RetentionEngine, ACHIEVEMENTS } from './retention';

describe('RetentionEngine', () => {
  let engine: RetentionEngine;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    engine = new RetentionEngine();
  });

  describe('XP system', () => {
    it('should start at level 1 with 0 XP', () => {
      const state = engine.getState();
      expect(state.level).toBe(1);
      expect(state.xp).toBe(0);
    });

    it('should calculate level from XP', () => {
      expect(engine.calculateLevel(0)).toBe(1);
      expect(engine.calculateLevel(999)).toBe(1);
      expect(engine.calculateLevel(1000)).toBe(2);
      expect(engine.calculateLevel(5000)).toBe(6);
    });

    it('should add XP and level up', () => {
      const result = engine.addXP(1500);
      expect(result.xp).toBe(1500);
      expect(result.level).toBe(2);
      expect(result.leveledUp).toBe(true);
    });

    it('should calculate progress to next level', () => {
      const progress = engine.getLevelProgress();
      expect(progress.current).toBe(0);
      expect(progress.next).toBe(1000);
      expect(progress.percentage).toBe(0);
    });

    it('should track XP across level ups', () => {
      engine.addXP(2500);
      const progress = engine.getLevelProgress();
      expect(progress.current).toBe(500);
      expect(progress.next).toBe(1000);
      expect(progress.percentage).toBe(50);
    });
  });

  describe('streak system', () => {
    it('should start with no streak', () => {
      const state = engine.getState();
      expect(state.streak).toBe(0);
    });

    it('should mark daily activity', () => {
      const result = engine.markDailyActivity();
      expect(result.streakAwarded).toBe(false);
    });
  });

  describe('watch minutes tracking', () => {
    it('should track watch minutes', () => {
      engine.trackWatchMinutes(30);
      expect(engine.getState().totalWatchMinutes).toBe(30);
    });

    it('should accumulate watch minutes', () => {
      engine.trackWatchMinutes(30);
      engine.trackWatchMinutes(45);
      expect(engine.getState().totalWatchMinutes).toBe(75);
    });
  });

  describe('achievement system', () => {
    it('should have 16 achievements defined', () => {
      expect(ACHIEVEMENTS.length).toBe(16);
    });

    it('should have all required achievement fields', () => {
      for (const achievement of ACHIEVEMENTS) {
        expect(achievement.id).toBeTruthy();
        expect(achievement.title).toBeTruthy();
        expect(achievement.description).toBeTruthy();
        expect(achievement.icon).toBeTruthy();
        expect(achievement.category).toBeTruthy();
        expect(achievement.requirement).toBeGreaterThan(0);
        expect(achievement.xpReward).toBeGreaterThan(0);
      }
    });

    it('should have valid categories', () => {
      const validCategories = ['watching', 'social', 'engagement', 'milestones'];
      for (const achievement of ACHIEVEMENTS) {
        expect(validCategories).toContain(achievement.category);
      }
    });
  });

  describe('state persistence', () => {
    it('should persist state to localStorage', () => {
      engine.addXP(500);
      engine.trackWatchMinutes(60);

      const newEngine = new RetentionEngine();
      const state = newEngine.getState();
      expect(state.xp).toBe(500);
      expect(state.totalWatchMinutes).toBe(60);
    });
  });
});
