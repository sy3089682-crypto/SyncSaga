import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { z } from 'zod';
import { logger } from '../lib/logger';

const router = Router();

// Apply auth middleware to all routes in this router
router.use(authMiddleware);

// GET /api/friends - List user's friends
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const { data: friendships, error } = await supabaseAdmin
      .from('friendships')
      .select(`
        id,
        status,
        created_at,
        requester:profiles!friendships_requester_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          status
        ),
        addressee:profiles!friendships_addressee_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          status
        )
      `)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error) {
      logger.error('Failed to fetch friends:', error);
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch friends' } });
    }

    const friends = (friendships || []).map((f: any) => {
      const friend = f.requester_id === userId ? f.addressee : f.requester;
      return {
        ...friend,
        friendship_id: f.id,
        friendship_created_at: f.created_at,
      };
    });

    return res.json({ friends });
  } catch (error) {
    logger.error('List friends error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// GET /api/friends/requests - List pending friend requests
router.get('/requests', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const { data: requests, error } = await supabaseAdmin
      .from('friendships')
      .select(`
        id,
        status,
        created_at,
        requester:profiles!friendships_requester_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          status
        ),
        addressee:profiles!friendships_addressee_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          status
        )
      `)
      .eq('addressee_id', userId)
      .eq('status', 'pending');

    if (error) {
      logger.error('Failed to fetch friend requests:', error);
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch friend requests' } });
    }

    const formatted = (requests || []).map((r: any) => ({
      ...r,
      sender: r.requester,
    }));

    return res.json({ requests: formatted });
  } catch (error) {
    logger.error('List friend requests error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// POST /api/friends/request - Send a friend request
const sendFriendRequestSchema = z.object({
  friendId: z.string().uuid(),
});

router.post('/request', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = sendFriendRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        },
      });
    }

    const userId = req.userId!;
    const { friendId } = validation.data;

    if (friendId === userId) {
      return res.status(400).json({ error: { code: 'INVALID_INPUT', message: 'Cannot send friend request to yourself' } });
    }

    // Check if friendship already exists
    const { data: existing } = await supabaseAdmin
      .from('friendships')
      .select('id, status')
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`)
      .single();

    if (existing) {
      if (existing.status === 'pending') {
        return res.status(409).json({ error: { code: 'ALREADY_PENDING', message: 'Friend request already pending' } });
      }
      if (existing.status === 'accepted') {
        return res.status(409).json({ error: { code: 'ALREADY_FRIENDS', message: 'Already friends' } });
      }
      if (existing.status === 'blocked') {
        return res.status(403).json({ error: { code: 'BLOCKED', message: 'Cannot send friend request' } });
      }
    }

    // Create friend request
    const { data: friendship, error } = await supabaseAdmin
      .from('friendships')
      .insert({
        requester_id: userId,
        addressee_id: friendId,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) {
      logger.error('Failed to create friend request:', error);
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to send friend request' } });
    }

    // Log activity
    await supabaseAdmin.from('activity_feed').insert({
      user_id: userId,
      type: 'friend_request_sent',
      data: { friend_id: friendId, friendship_id: friendship.id },
    });

    return res.status(201).json({ friendship });
  } catch (error) {
    logger.error('Send friend request error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// POST /api/friends/accept - Accept a friend request
const acceptFriendRequestSchema = z.object({
  requestId: z.string().uuid(),
});

router.post('/accept', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = acceptFriendRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        },
      });
    }

    const userId = req.userId!;
    const { requestId } = validation.data;

    // Verify request exists and is for this user
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('friendships')
      .select('*')
      .eq('id', requestId)
      .eq('addressee_id', userId)
      .eq('status', 'pending')
      .single();

    if (fetchError || !request) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Friend request not found' } });
    }

    // Accept the request
    const { error: updateError } = await supabaseAdmin
      .from('friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (updateError) {
      logger.error('Failed to accept friend request:', updateError);
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to accept friend request' } });
    }

    // Log activity
    await supabaseAdmin.from('activity_feed').insert({
      user_id: userId,
      type: 'friend_request_accepted',
      data: { friend_id: request.requester_id, friendship_id: requestId },
    });

    return res.json({ success: true });
  } catch (error) {
    logger.error('Accept friend request error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// POST /api/friends/reject - Reject a friend request
const rejectFriendRequestSchema = z.object({
  requestId: z.string().uuid(),
});

router.post('/reject', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const validation = rejectFriendRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        },
      });
    }

    const userId = req.userId!;
    const { requestId } = validation.data;

    // Verify request exists and is for this user
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('friendships')
      .select('*')
      .eq('id', requestId)
      .eq('addressee_id', userId)
      .eq('status', 'pending')
      .single();

    if (fetchError || !request) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Friend request not found' } });
    }

    // Reject the request (delete it)
    const { error: deleteError } = await supabaseAdmin
      .from('friendships')
      .delete()
      .eq('id', requestId);

    if (deleteError) {
      logger.error('Failed to reject friend request:', deleteError);
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to reject friend request' } });
    }

    return res.json({ success: true });
  } catch (error) {
    logger.error('Reject friend request error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// DELETE /api/friends/:friendId - Remove a friend
router.delete('/:friendId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { friendId } = req.params;

    // Find the friendship
    const { data: friendship, error: fetchError } = await supabaseAdmin
      .from('friendships')
      .select('*')
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`)
      .eq('status', 'accepted')
      .single();

    if (fetchError || !friendship) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Friendship not found' } });
    }

    // Delete the friendship
    const { error: deleteError } = await supabaseAdmin
      .from('friendships')
      .delete()
      .eq('id', friendship.id);

    if (deleteError) {
      logger.error('Failed to remove friend:', deleteError);
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to remove friend' } });
    }

    return res.json({ success: true });
  } catch (error) {
    logger.error('Remove friend error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

// GET /api/users/search?q= - Search users by username
router.get('/users/search', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.json({ users: [] });
    }

    // Search profiles by username or display_name
    const { data: users, error } = await supabaseAdmin
      .from('profiles')
      .select('id, username, display_name, avatar_url, status')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .neq('id', userId)
      .limit(20);

    if (error) {
      logger.error('User search error:', error);
      return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to search users' } });
    }

    // Exclude existing friends and pending requests
    const { data: friendships } = await supabaseAdmin
      .from('friendships')
      .select('requester_id, addressee_id, status')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    const friendIds = new Set<string>();
    (friendships || []).forEach((f: any) => {
      friendIds.add(f.requester_id);
      friendIds.add(f.addressee_id);
    });

    const filtered = (users || []).filter((u: any) => !friendIds.has(u.id));

    return res.json({ users: filtered });
  } catch (error) {
    logger.error('User search error:', error);
    return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
});

export default router;
