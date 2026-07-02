import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Validators Tests
 *
 * Tests all Zod validation schemas used across socket handlers
 * and HTTP routes.
 */

import {
  roomJoinSchema,
  roomLeaveSchema,
  syncEventSchema,
  chatMessageSchema,
  chatReactionSchema,
  chatTypingSchema,
  presenceUpdateSchema,
  setEpisodeSchema,
  syncLockSchema,
  skipVoteSchema,
  kickBanSchema,
  validate,
} from '../middleware/validators';

describe('Room Validators', () => {
  it('should validate room join input', () => {
    const valid = roomJoinSchema.safeParse({ roomId: 'room-123', password: 'secret' });
    expect(valid.success).toBe(true);
  });

  it('should validate room join without password', () => {
    const valid = roomJoinSchema.safeParse({ roomId: 'room-123' });
    expect(valid.success).toBe(true);
  });

  it('should reject empty roomId', () => {
    const invalid = roomJoinSchema.safeParse({ roomId: '' });
    expect(invalid.success).toBe(false);
  });

  it('should reject roomId over 100 chars', () => {
    const invalid = roomJoinSchema.safeParse({ roomId: 'x'.repeat(101) });
    expect(invalid.success).toBe(false);
  });

  it('should validate room leave input', () => {
    const valid = roomLeaveSchema.safeParse({ roomId: 'room-123' });
    expect(valid.success).toBe(true);
  });
});

describe('Sync Event Validators', () => {
  it('should validate play event', () => {
    const valid = syncEventSchema.safeParse({
      room_id: 'room-1',
      user_id: 'user-1',
      type: 'play',
      timestamp: 100.5,
    });
    expect(valid.success).toBe(true);
  });

  it('should validate seek event', () => {
    const valid = syncEventSchema.safeParse({
      room_id: 'room-1',
      user_id: 'user-1',
      type: 'seek',
      timestamp: 200,
    });
    expect(valid.success).toBe(true);
  });

  it('should validate speed event with playback_speed', () => {
    const valid = syncEventSchema.safeParse({
      room_id: 'room-1',
      user_id: 'user-1',
      type: 'speed',
      timestamp: 100,
      playback_speed: 1.5,
    });
    expect(valid.success).toBe(true);
  });

  it('should reject invalid event type', () => {
    const invalid = syncEventSchema.safeParse({
      room_id: 'room-1',
      user_id: 'user-1',
      type: 'invalid',
      timestamp: 100,
    });
    expect(invalid.success).toBe(false);
  });

  it('should reject negative timestamp', () => {
    const invalid = syncEventSchema.safeParse({
      room_id: 'room-1',
      user_id: 'user-1',
      type: 'play',
      timestamp: -1,
    });
    expect(invalid.success).toBe(false);
  });

  it('should reject playback_speed over 16', () => {
    const invalid = syncEventSchema.safeParse({
      room_id: 'room-1',
      user_id: 'user-1',
      type: 'speed',
      timestamp: 100,
      playback_speed: 20,
    });
    expect(invalid.success).toBe(false);
  });
});

describe('Chat Validators', () => {
  it('should validate chat message', () => {
    const valid = chatMessageSchema.safeParse({
      roomId: 'room-1',
      content: 'Hello world',
    });
    expect(valid.success).toBe(true);
  });

  it('should validate chat message with type', () => {
    const valid = chatMessageSchema.safeParse({
      roomId: 'room-1',
      content: 'Hello',
      type: 'text',
    });
    expect(valid.success).toBe(true);
  });

  it('should reject empty content', () => {
    const invalid = chatMessageSchema.safeParse({
      roomId: 'room-1',
      content: '',
    });
    expect(invalid.success).toBe(false);
  });

  it('should reject content over 2000 chars', () => {
    const invalid = chatMessageSchema.safeParse({
      roomId: 'room-1',
      content: 'x'.repeat(2001),
    });
    expect(invalid.success).toBe(false);
  });

  it('should validate chat reaction', () => {
    const valid = chatReactionSchema.safeParse({
      messageId: 'msg-1',
      emoji: '👍',
    });
    expect(valid.success).toBe(true);
  });

  it('should validate typing indicator', () => {
    const valid = chatTypingSchema.safeParse({
      roomId: 'room-1',
      isTyping: true,
    });
    expect(valid.success).toBe(true);
  });
});

describe('Presence Validators', () => {
  it('should validate presence update', () => {
    const valid = presenceUpdateSchema.safeParse({
      user_id: 'user-1',
      status: 'online',
      current_room_id: null,
      activity: null,
    });
    expect(valid.success).toBe(true);
  });

  it('should reject invalid status', () => {
    const invalid = presenceUpdateSchema.safeParse({
      user_id: 'user-1',
      status: 'busy',
      current_room_id: null,
      activity: null,
    });
    expect(invalid.success).toBe(false);
  });
});

describe('Episode and Sync Lock Validators', () => {
  it('should validate set episode', () => {
    const valid = setEpisodeSchema.safeParse({
      roomId: 'room-1',
      mediaId: 123,
      episode: 5,
    });
    expect(valid.success).toBe(true);
  });

  it('should reject episode 0', () => {
    const invalid = setEpisodeSchema.safeParse({
      roomId: 'room-1',
      mediaId: 123,
      episode: 0,
    });
    expect(invalid.success).toBe(false);
  });

  it('should validate sync lock', () => {
    const valid = syncLockSchema.safeParse({ enabled: true });
    expect(valid.success).toBe(true);
  });

  it('should reject non-boolean sync lock', () => {
    const invalid = syncLockSchema.safeParse({ enabled: 'yes' });
    expect(invalid.success).toBe(false);
  });
});

describe('Skip Vote and Kick/Ban Validators', () => {
  it('should validate skip vote', () => {
    const valid = skipVoteSchema.safeParse({
      roomId: 'room-1',
      vote: true,
    });
    expect(valid.success).toBe(true);
  });

  it('should validate kick/ban', () => {
    const valid = kickBanSchema.safeParse({
      roomId: 'room-1',
      userId: 'user-1',
    });
    expect(valid.success).toBe(true);
  });
});

describe('Validate Helper Function', () => {
  it('should return success with data', () => {
    const result = validate(roomJoinSchema, { roomId: 'room-1' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.roomId).toBe('room-1');
    }
  });

  it('should return failure with error message', () => {
    const result = validate(roomJoinSchema, { roomId: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeTruthy();
    }
  });
});
