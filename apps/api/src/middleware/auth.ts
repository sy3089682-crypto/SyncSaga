import { Request, Response, NextFunction } from 'express';
import { verifySupabaseToken, getUserProfile } from '../lib/supabase';
import { logger } from '../lib/logger';

/**
 * Express middleware that verifies the Supabase JWT from the
 * Authorization header and attaches the user to the request.
 *
 * Usage:
 *   router.get('/rooms', authMiddleware, roomController.getRooms);
 *
 * For optional auth (public endpoints that benefit from knowing the user):
 *   router.get('/rooms', optionalAuth, roomController.getRooms);
 */

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

/**
 * Required auth — returns 401 if no valid token.
 */
export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const token = authHeader.slice(7);
  const userId = await verifySupabaseToken(token);

  if (!userId) {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });
    return;
  }

  const profile = await getUserProfile(userId);

  if (!profile) {
    res.status(403).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'User profile not found' } });
    return;
  }

  req.userId = userId;
  req.user = {
    id: profile.id,
    username: profile.username,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url,
  };

  next();
}

/**
 * Optional auth — attaches user if token is valid, but does not
 * reject the request if no token is present.
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.slice(7);
  const userId = await verifySupabaseToken(token);

  if (userId) {
    const profile = await getUserProfile(userId);
    if (profile) {
      req.userId = userId;
      req.user = {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      };
    }
  }

  next();
}

/**
 * Role-based authorization middleware.
 * Checks if the authenticated user has the required role in a room.
 *
 * Usage:
 *   router.delete('/rooms/:id', authMiddleware, requireRoomRole('host'), roomController.deleteRoom);
 */
export function requireRoomRole(roles: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId || !req.params.id) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
      return;
    }

    // Use the admin client imported at top level — no require()
    const { supabaseAdmin } = await import('../lib/supabase');
    const { data: room } = await supabaseAdmin
      .from('rooms')
      .select('host_id, co_hosts')
      .eq('id', req.params.id)
      .single();

    if (!room) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Room not found' } });
      return;
    }

    const isHost = room.host_id === req.userId;
    const isCoHost = Array.isArray(room.co_hosts) && req.userId && room.co_hosts.includes(req.userId);

    if (roles.includes('host') && isHost) {
      next();
      return;
    }

    if (roles.includes('co_host') && (isHost || isCoHost)) {
      next();
      return;
    }

    const { data: member } = await supabaseAdmin
      .from('room_members')
      .select('role, is_banned')
      .eq('room_id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (!member || member.is_banned) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not a room member' } });
      return;
    }

    if (roles.includes(member.role)) {
      next();
      return;
    }

    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
  };
}
