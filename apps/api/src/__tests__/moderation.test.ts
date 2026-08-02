import { describe, it, expect } from 'vitest';
import { ModerationService } from '../services/moderation.service';

const moderation = new ModerationService();

describe('ModerationService', () => {
  describe('toxicity detection', () => {
    it('should detect profanity', async () => {
      const result = await moderation.checkMessage('what the fuck is this');
      expect(result.isToxic).toBe(true);
      expect(result.categories).toContain('profanity');
    });

    it('should pass clean messages', async () => {
      const result = await moderation.checkMessage('This is a nice anime episode!');
      expect(result.isToxic).toBe(false);
    });

    it('should return confidence and categories', async () => {
      const result = await moderation.checkMessage('what the fuck is this');
      expect(typeof result.confidence).toBe('number');
      expect(Array.isArray(result.categories)).toBe(true);
    });
  });

  describe('spam detection', () => {
    it('should detect excessive caps', async () => {
      const result = await moderation.checkMessage('HELLO HELLO HELLO HELLO');
      expect(result.categories).toContain('spam');
    });

    it('should detect repeated characters', async () => {
      const result = await moderation.checkMessage('looooooooooool this is so funnyyyyyyyyy');
      expect(result.categories).toContain('spam');
    });

    it('should pass normal messages', async () => {
      const result = await moderation.checkMessage('Hello everyone!');
      expect(result.categories).not.toContain('spam');
    });
  });

  describe('PII detection', () => {
    it('should detect emails', async () => {
      const result = await moderation.checkMessage('contact me at test@example.com');
      expect(result.categories).toContain('personal_info');
    });

    it('should detect phone numbers', async () => {
      const result = await moderation.checkMessage('Call me at 555-123-4567');
      expect(result.categories).toContain('personal_info');
    });

    it('should pass safe messages', async () => {
      const result = await moderation.checkMessage('Nice episode today!');
      expect(result.categories).not.toContain('personal_info');
    });
  });

  describe('overall safety', () => {
    it('should mark unsafe message accordingly', async () => {
      const result = await moderation.checkMessage('fuck you contact me at spam@test.com');
      expect(result.isToxic).toBe(true);
      expect(result.categories).toContain('profanity');
      expect(result.categories).toContain('personal_info');
    });

    it('should mark safe message', async () => {
      const result = await moderation.checkMessage('Great anime episode!');
      expect(result.isToxic).toBe(false);
    });
  });

  describe('XSS sanitization', () => {
    it('should sanitize script tags', () => {
      expect(moderation.sanitizeContent('<script>alert("xss")</script>')).not.toContain('<script>');
    });

    it('should sanitize event handlers', () => {
      expect(moderation.sanitizeContent('<img onerror="alert(1)" src=x>')).not.toContain('onerror');
    });

    it('should preserve safe HTML', () => {
      const safe = 'Hello, how are you? :)';
      expect(moderation.sanitizeContent(safe)).toBe(safe);
    });
  });
});

describe('ModerationService - Ban/Report', () => {
  it('should create report user function', () => {
    expect(typeof moderation.reportUser).toBe('function');
  });

  it('should create ban user function', () => {
    expect(typeof moderation.banUser).toBe('function');
  });

  it('should create shadow ban function', () => {
    expect(typeof moderation.shadowBan).toBe('function');
  });

  it('should create get reports function', () => {
    expect(typeof moderation.getUserReports).toBe('function');
  });
});
