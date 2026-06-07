import { z } from 'zod';

const roomId = z.string().min(1).max(128);
const userId = z.string().min(1).max(128);

export const syncEventSchema = z.object({
  room_id: roomId,
  user_id: userId.optional(),
  type: z.enum(['play', 'pause', 'seek', 'speed', 'episode', 'fullscreen', 'buffering', 'ready']),
  timestamp: z.number().finite().min(0).max(24 * 60 * 60),
  playback_speed: z.number().finite().min(0.25).max(4).optional(),
  episode: z.string().trim().min(1).max(120).optional(),
  server_time: z.number().finite().optional(),
});

export const setEpisodeSchema = z.object({
  roomId,
  mediaId: z.number().int().positive().max(10_000_000).optional(),
  episode: z.number().int().positive().max(10_000),
});

export const syncLockSchema = z.object({
  roomId,
  enabled: z.boolean(),
});

export const roomIdPayloadSchema = z.object({ roomId });

export const reactionAddSchema = z.object({
  roomId,
  timestampSec: z.number().finite().min(0).max(24 * 60 * 60),
  type: z.enum(['emoji', 'text', 'sticker']).or(z.string().trim().min(1).max(32)),
  content: z.string().trim().max(280).optional(),
});

export function formatZodError(error: z.ZodError) {
  return error.errors.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
}
