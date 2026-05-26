import { describe, it, expect } from 'vitest';
import { ModerationService } from '../services/moderation.service';

const moderation = new ModerationService();

describe('ModerationService', () => {
  describe('profanity detection', () => {
    it('should detect profanity', () => {
      const result = moderation.checkMessage('what the fuck is this');
      expect(result.hasProfanity).toBe(true);
    });

    it('should pass clean messages', () => {
      const result = moderation.checkMessage('This is a nice anime episode!');
      expect(result.hasProfanity).toBe(false);
    });

    it('should detect masked profanity', () => {
      const result = moderation.checkMessage('you are a b1tch');
      expect(result.hasProfanity).toBe(true);
    });
  });

  describe('spam detection', () => {
    it('should detect excessive caps', () => {
      const result = moderation.checkMessage('HELLO HELLO HELLO HELLO');
      expect(result.isSpam).toBe(true);
    });

    it('should detect repeated characters', () => {
      const result = moderation.checkMessage('looooooooooool this is so funnyyyyyyyyy');
      expect(result.isSpam).toBe(true);
    });

    it('should pass normal messages', () => {
      const result = moderation.checkMessage('Hello everyone!');
      expect(result.isSpam).toBe(false);
    });
  });

  describe('PII detection', () => {
    it('should detect emails', () => {
      const result = moderation.checkMessage('contact me at test@example.com');
      expect(result.hasPII).toBe(true);
    });

    it('should detect phone numbers', () => {
      const result = moderation.checkMessage('Call me at 555-123-4567');
      expect(result.hasPII).toBe(true);
    });

    it('should pass safe messages', () => {
      const result = moderation.checkMessage('Nice episode today!');
      expect(result.hasPII).toBe(false);
    });
  });

  describe('overall safety', () => {
    it('should mark unsafe message accordingly', () => {
      const result = moderation.checkMessage('fuck you contact me at spam@test.com');
      expect(result.isSafe).toBe(false);
      expect(result.hasProfanity).toBe(true);
      expect(result.hasPII).toBe(true);
    });

    it('should mark safe message', () => {
      const result = moderation.checkMessage('Great anime episode!');
      expect(result.isSafe).toBe(true);
    });
  });

  describe('XSS sanitization', () => {
    it('should sanitize script tags', () => {
      expect(moderation.sanitize('<script>alert("xss")</script>')).not.toContain('<script>');
    });

    it('should sanitize event handlers', () => {
      expect(moderation.sanitize('<img onerror="alert(1)" src=x>')).not.toContain('onerror');
    });

    it('should preserve safe HTML', () => {
      const safe = 'Hello, how are you? :)';
      expect(moderation.sanitize(safe)).toBe(safe);
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
