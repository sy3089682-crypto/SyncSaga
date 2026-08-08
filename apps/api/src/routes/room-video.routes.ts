import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../lib/logger';

const router = Router();

const BUCKET = 'room-videos';
const SIGNED_URL_SECONDS = 4 * 60 * 60;

async function getHostRoom(roomId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('rooms')
    .select('id, host_id, video_path, video_name, video_size, video_mime_type')
    .eq('id', roomId)
    .single();

  if (error || !data) return null;
  if (data.host_id !== userId) return null;
  return data;
}

/**
 * PATCH /api/rooms/:id/video
 * Attach a previously uploaded private Storage object to a room.
 * Only the room host may attach a video.
 */
router.patch('/:id/video', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const room = await getHostRoom(req.params.id, req.userId!);
    if (!room) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the room host can manage its video' } });
    }

    const { path, name, size, mimeType } = req.body || {};
    if (!path || typeof path !== 'string' || !path.startsWith(`${req.userId}/${req.params.id}/`)) {
      return res.status(400).json({ error: { code: 'INVALID_VIDEO_PATH', message: 'Invalid room video path' } });
    }

    if (typeof name !== 'string' || name.length > 255) {
      return res.status(400).json({ error: { code: 'INVALID_VIDEO_NAME', message: 'Invalid video name' } });
    }

    const { data: object, error: objectError } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(`${req.userId}/${req.params.id}`, { search: path.split('/').pop() || undefined, limit: 10 });

    if (objectError || !object?.some((entry) => entry.name === path.split('/').pop())) {
      return res.status(400).json({ error: { code: 'VIDEO_NOT_FOUND', message: 'Uploaded video was not found' } });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('rooms')
      .update({
        video_path: path,
        video_name: name,
        video_size: Number.isFinite(size) ? Number(size) : null,
        video_mime_type: typeof mimeType === 'string' ? mimeType : null,
      })
      .eq('id', req.params.id)
      .select('id, video_path, video_name, video_size, video_mime_type')
      .single();

    if (error || !updated) {
      logger.error({ err: error }, 'Failed to attach room video');
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to attach room video' } });
    }

    return res.json({ video: updated });
  } catch (error) {
    logger.error({ err: error }, 'Attach room video error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

/**
 * GET /api/rooms/:id/video
 * Return a short-lived signed URL to an active room video.
 * Any authenticated room member can watch; only the host can replace it.
 */
router.get('/:id/video', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('id, video_path')
      .eq('id', req.params.id)
      .single();

    if (!room?.video_path) {
      return res.status(404).json({ error: { code: 'NO_VIDEO', message: 'This room has no hosted video' } });
    }

    const { data: member } = await supabaseAdmin
      .from('room_members')
      .select('user_id')
      .eq('room_id', req.params.id)
      .eq('user_id', req.userId!)
      .eq('is_banned', false)
      .is('left_at', null)
      .maybeSingle();

    if (!member) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Join the room to watch its hosted video' } });
    }

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(room.video_path, SIGNED_URL_SECONDS);

    if (error || !data?.signedUrl) {
      logger.error({ err: error }, 'Failed to create room video signed URL');
      return res.status(500).json({ error: { code: 'VIDEO_URL_ERROR', message: 'Failed to prepare video playback' } });
    }

    return res.json({ url: data.signedUrl, expiresIn: SIGNED_URL_SECONDS });
  } catch (error) {
    logger.error({ err: error }, 'Get room video URL error');
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
