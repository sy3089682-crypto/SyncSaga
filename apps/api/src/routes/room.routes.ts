import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { logger } from '../lib/logger';
import bcrypt from 'bcrypt';

const router = Router();

/**
 * Room Routes
 *
 * All routes require authentication via Supabase JWT.
 * RLS policies enforce data access at the database level.
 * This service layer handles business logic and validation.
 */

/**
 * GET /api/rooms
 * List public rooms with member counts.
 * Paginated, sorted by most recently created.
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const { data: rooms, error } = await supabaseAdmin
      .from('rooms')
      .select(`
        id,
        name,
        description,
        banner_url,
        is_private,
        max_users,
        host_id,
        anime_title,
        episode_number,
        playback_state,
        current_timestamp,
        duration,
        created_at,
        profiles!rooms_host_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to list rooms:', error);
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch rooms' } });
    }

    // Get member counts for each room
    const roomIds = (rooms || []).map((r: any) => r.id);
    let memberCounts: Record<string, number> = {};

    if (roomIds.length > 0) {
      const { data: counts } = await supabaseAdmin
        .from('room_members')
        .select('room_id')
        .in('room_id', roomIds)
        .eq('is_banned', false)
        .is('left_at', null);

      if (counts) {
        memberCounts = counts.reduce((acc: Record<string, number>, row: any) => {
          acc[row.room_id] = (acc[row.room_id] || 0) + 1;
          return acc;
        }, {});
      }
    }

    const result = (rooms || []).map((room: any) => {
      const { profiles, ...rest } = room;
      return {
        ...rest,
        member_count: memberCounts[room.id] || 0,
        host: profiles,
      };
    });

    return res.json({ rooms: result });
  } catch (error) {
    logger.error('List rooms error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

/**
 * GET /api/rooms/:id
 * Get a single room with members.
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Invalid room ID' } });
    }

    const { data: room, error } = await supabaseAdmin
      .from('rooms')
      .select(`
        *,
        profiles!rooms_host_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('id', id)
      .single();

    if (error || !room) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Room not found' } });
    }

    // Get active members
    const { data: members } = await supabaseAdmin
      .from('room_members')
      .select(`
        id,
        user_id,
        role,
        joined_at,
        profiles!room_members_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          status
        )
      `)
      .eq('room_id', id)
      .eq('is_banned', false)
      .is('left_at', null);

    return res.json({
      room: {
        ...room,
        host: room.profiles,
        members: (members || []).map((m: any) => ({
          ...m,
          user: m.profiles,
        })),
      },
    });
  } catch (error) {
    logger.error('Get room error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

/**
 * POST /api/rooms
 * Create a new room. The authenticated user becomes the host.
 */
const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean().optional().default(false),
  password: z.string().min(4).max(100).optional(),
  maxUsers: z.number().int().min(2).max(100).optional().default(10),
  mediaId: z.number().int().positive().optional(),
  animeTitle: z.string().max(200).optional(),
  episodeNumber: z.number().int().positive().optional(),
  currentEpisode: z.string().max(200).optional(),
});

router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = createRoomSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        },
      });
    }

    const data = validation.data;

    // Check user's room limit based on subscription
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('plan')
      .eq('user_id', req.userId!)
      .single();

    const plan = subscription?.plan || 'free';
    const maxRooms = plan === 'free' ? 3 : plan === 'premium' ? 20 : 100;

    const { count } = await supabaseAdmin
      .from('rooms')
      .select('id', { count: 'exact', head: true })
      .eq('host_id', req.userId!);

    if ((count || 0) >= maxRooms) {
      return res.status(403).json({
        error: {
          code: 'LIMIT_REACHED',
          message: `You have reached the maximum number of rooms (${maxRooms}) for the ${plan} plan`,
        },
      });
    }

    // Hash password if provided
    let passwordHash: string | null = null;
    if (data.password) {
      passwordHash = await bcrypt.hash(data.password, 10);
    }

    // Create room
    const { data: room, error: roomError } = await supabaseAdmin
      .from('rooms')
      .insert({
        name: data.name,
        description: data.description || null,
        is_private: data.isPrivate,
        password_hash: passwordHash,
        max_users: data.maxUsers,
        host_id: req.userId!,
        media_id: data.mediaId || null,
        anime_title: data.animeTitle || null,
        episode_number: data.episodeNumber || null,
        current_episode: data.currentEpisode || null,
      })
      .select('*')
      .single();

    if (roomError || !room) {
      logger.error('Failed to create room:', roomError);
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create room' } });
    }

    // Add host as a room member with 'host' role
    const { error: memberError } = await supabaseAdmin
      .from('room_members')
      .insert({
        room_id: room.id,
        user_id: req.userId!,
        role: 'host',
      });

    if (memberError) {
      logger.error('Failed to add host as room member:', memberError);
      // Clean up the room since member creation failed
      await supabaseAdmin.from('rooms').delete().eq('id', room.id);
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create room' } });
    }

    // Log activity
    await supabaseAdmin.from('activity_feed').insert({
      user_id: req.userId!,
      type: 'room_created',
      data: { room_id: room.id, room_name: room.name },
    });

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.userId!,
      action: 'room_created',
      metadata: { room_id: room.id, room_name: room.name, is_private: room.is_private },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'] || null,
    });

    return res.status(201).json({ room });
  } catch (error) {
    logger.error('Create room error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

/**
 * PATCH /api/rooms/:id
 * Update a room. Only the host or co-hosts can update.
 */
const updateRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean().optional(),
  maxUsers: z.number().int().min(2).max(100).optional(),
  animeTitle: z.string().max(200).optional(),
  episodeNumber: z.number().int().positive().optional(),
  currentEpisode: z.string().max(200).optional(),
  syncLocked: z.boolean().optional(),
});

router.patch('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = updateRoomSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        },
      });
    }

    // Check ownership
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('host_id, co_hosts')
      .eq('id', req.params.id)
      .single();

    if (!room) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Room not found' } });
    }

    const isHost = room.host_id === req.userId;
    const isCoHost = Array.isArray(room.co_hosts) && req.userId && room.co_hosts.includes(req.userId);

    if (!isHost && !isCoHost) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the host or co-hosts can update the room' } });
    }

    const data = validation.data;
    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isPrivate !== undefined) updateData.is_private = data.isPrivate;
    if (data.maxUsers !== undefined) updateData.max_users = data.maxUsers;
    if (data.animeTitle !== undefined) updateData.anime_title = data.animeTitle;
    if (data.episodeNumber !== undefined) updateData.episode_number = data.episodeNumber;
    if (data.currentEpisode !== undefined) updateData.current_episode = data.currentEpisode;
    if (data.syncLocked !== undefined) updateData.sync_locked = data.syncLocked;

    const { data: updated, error } = await supabaseAdmin
      .from('rooms')
      .update(updateData)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error || !updated) {
      logger.error('Failed to update room:', error);
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update room' } });
    }

    return res.json({ room: updated });
  } catch (error) {
    logger.error('Update room error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

/**
 * DELETE /api/rooms/:id
 * Delete a room. Only the host can delete.
 */
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('host_id, name')
      .eq('id', req.params.id)
      .single();

    if (!room) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Room not found' } });
    }

    if (room.host_id !== req.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the host can delete the room' } });
    }

    const { error } = await supabaseAdmin
      .from('rooms')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      logger.error('Failed to delete room:', error);
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete room' } });
    }

    // Audit log
    await supabaseAdmin.from('audit_logs').insert({
      user_id: req.userId!,
      action: 'room_deleted',
      metadata: { room_id: req.params.id, room_name: room.name },
      ip_address: req.ip,
      user_agent: req.headers['user-agent'] || null,
    });

    return res.status(204).send();
  } catch (error) {
    logger.error('Delete room error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

/**
 * POST /api/rooms/:id/join
 * Join a room. Creates a room_members entry.
 */
router.post('/:id/join', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    // Check room exists and is accessible
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('id', id)
      .single();

    if (!room) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Room not found' } });
    }

    // Check if banned
    const { data: existingMember } = await supabaseAdmin
      .from('room_members')
      .select('is_banned, left_at')
      .eq('room_id', id)
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingMember?.is_banned) {
      return res.status(403).json({ error: { code: 'BANNED', message: 'You are banned from this room' } });
    }

    // Check password for private rooms
    if (room.is_private && room.password_hash) {
      if (!password) {
        return res.status(401).json({ error: { code: 'PASSWORD_REQUIRED', message: 'This room requires a password' } });
      }
      const valid = await bcrypt.compare(password, room.password_hash);
      if (!valid) {
        return res.status(401).json({ error: { code: 'WRONG_PASSWORD', message: 'Incorrect password' } });
      }
    }

    // Check capacity
    const { count } = await supabaseAdmin
      .from('room_members')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', id)
      .eq('is_banned', false)
      .is('left_at', null);

    if ((count || 0) >= room.max_users) {
      return res.status(403).json({ error: { code: 'ROOM_FULL', message: 'Room is at maximum capacity' } });
    }

    // Rejoin or create new membership
    if (existingMember?.left_at) {
      // Rejoin — update existing record
      const { error: rejoinError } = await supabaseAdmin
        .from('room_members')
        .update({ left_at: null, joined_at: new Date().toISOString() })
        .eq('room_id', id)
        .eq('user_id', req.userId!)
        .eq('left_at', existingMember.left_at);

      if (rejoinError) {
        logger.error('Failed to rejoin room:', rejoinError);
        return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to join room' } });
      }
    } else {
      // New join
      const { error: joinError } = await supabaseAdmin
        .from('room_members')
        .insert({
          room_id: id,
          user_id: req.userId!,
          role: 'member',
        });

      if (joinError) {
        if (joinError.code === '23505') {
          // Already a member — that's fine
          return res.json({ room, already_member: true });
        }
        logger.error('Failed to join room:', joinError);
        return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to join room' } });
      }
    }

    // Log activity
    await supabaseAdmin.from('activity_feed').insert({
      user_id: req.userId!,
      type: 'room_joined',
      data: { room_id: id, room_name: room.name },
    });

    return res.json({ room });
  } catch (error) {
    logger.error('Join room error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

/**
 * POST /api/rooms/:id/leave
 * Leave a room. Host cannot leave (must delete or transfer).
 */
router.post('/:id/leave', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('host_id')
      .eq('id', req.params.id)
      .single();

    if (!room) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Room not found' } });
    }

    if (room.host_id === req.userId) {
      return res.status(400).json({ error: { code: 'HOST_CANNOT_LEAVE', message: 'Host cannot leave. Transfer ownership or delete the room.' } });
    }

    const { error } = await supabaseAdmin
      .from('room_members')
      .update({ left_at: new Date().toISOString() })
      .eq('room_id', req.params.id)
      .eq('user_id', req.userId!)
      .is('left_at', null);

    if (error) {
      logger.error('Failed to leave room:', error);
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to leave room' } });
    }

    return res.status(204).send();
  } catch (error) {
    logger.error('Leave room error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export const roomRouter = router;
