import { describe, it, expect } from 'vitest';
import { validate, syncEventSchema, chatMessageSchema } from '../middleware/validators';

describe('Validators', () => {
  describe('syncEventSchema', () => {
    it('should validate a valid sync event', () => {
      const result = validate(syncEventSchema, {
        room_id: 'room-1',
        user_id: 'user-1',
        type: 'play',
        timestamp: 120.5,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid sync event types', () => {
      const result = validate(syncEventSchema, {
        room_id: 'room-1',
        user_id: 'user-1',
        type: 'invalid',
        timestamp: 120.5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('chatMessageSchema', () => {
    it('should validate a valid chat message', () => {
      const result = validate(chatMessageSchema, {
        roomId: 'room-1',
        content: 'Hello!',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const result = validate(chatMessageSchema, {
        roomId: 'room-1',
        content: '',
      });
      expect(result.success).toBe(false);
    });
  });
});
