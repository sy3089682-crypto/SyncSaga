import { z, ZodSchema } from 'zod';

export const roomJoinSchema = z.object({
  roomId: z.string().min(1).max(100),
  password: z.string().optional(),
});

export const roomLeaveSchema = z.object({
  roomId: z.string().min(1).max(100),
});

export const syncEventSchema = z.object({
  room_id: z.string(),
  user_id: z.string(),
  type: z.enum(['play', 'pause', 'seek', 'speed', 'episode', 'fullscreen', 'buffering', 'ready']),
  timestamp: z.number().min(0),
  playback_speed: z.number().min(0).max(16).optional(),
  episode: z.string().optional(),
  server_time: z.number().optional(),
  clock: z.number().optional(),
});

export const chatMessageSchema = z.object({
  roomId: z.string().min(1),
  content: z.string().min(1).max(2000),
  type: z.enum(['text', 'gif', 'reaction', 'system']).optional(),
});

export const chatReactionSchema = z.object({
  messageId: z.string().min(1),
  emoji: z.string().min(1).max(100),
});

export const chatTypingSchema = z.object({
  roomId: z.string().min(1),
  isTyping: z.boolean(),
});

export const presenceUpdateSchema = z.object({
  user_id: z.string(),
  status: z.enum(['online', 'offline', 'away', 'watching']),
  current_room_id: z.string().nullable(),
  activity: z.string().nullable(),
});

export const voiceJoinSchema = z.object({
  roomId: z.string().min(1),
});

export const voiceLeaveSchema = z.object({
  roomId: z.string().min(1),
});

export const reactionAddSchema = z.object({
  roomId: z.string().min(1),
  timestampSec: z.number().min(0),
  type: z.string().min(1).max(50),
  content: z.string().optional(),
});

export const setEpisodeSchema = z.object({
  roomId: z.string().min(1),
  mediaId: z.number().min(1),
  episode: z.number().min(1),
});

export const syncLockSchema = z.object({
  enabled: z.boolean(),
});

export const skipVoteSchema = z.object({
  roomId: z.string().min(1),
  vote: z.boolean(),
});

export const kickBanSchema = z.object({
  roomId: z.string().min(1),
  userId: z.string().min(1),
});

export function validate<T>(schema: ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ') };
}
