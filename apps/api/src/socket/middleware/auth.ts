import { Server } from 'socket.io';
import { Socket } from 'socket.io';
import { verifySupabaseToken, getUserProfile } from '../../lib/supabase';
import { logger } from '../../lib/logger';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  user: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

/**
 * Socket.IO authentication middleware.
 *
 * Verifies the Supabase JWT from the socket handshake and
 * attaches the user profile to the socket instance.
 *
 * The client must provide the token in the handshake auth:
 *   new Socket({ auth: { token: session.access_token } })
 *
 * Or as a query parameter (for raw WebSocket connections):
 *   wss://api.syncsaga.app/socket?token=...
 */
export async function socketAuthMiddleware(
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication required'));
    }

    const userId = await verifySupabaseToken(token);

    if (!userId) {
      return next(new Error('Invalid or expired token'));
    }

    const profile = await getUserProfile(userId);

    if (!profile) {
      return next(new Error('User profile not found'));
    }

    socket.userId = userId;
    socket.user = {
      id: profile.id,
      username: profile.username,
      display_name: profile.display_name,
      avatar_url: profile.avatar_url,
    };

    next();
  } catch (error) {
    logger.error('Socket auth error:', error);
    next(new Error('Authentication failed'));
  }
}
