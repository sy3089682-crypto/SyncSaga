import { Socket } from 'socket.io';
import { verifyToken } from '../../lib/jwt';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { User } from '@syncsaga/types';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  user: Partial<User>;
}

export async function socketAuthMiddleware(socket: AuthenticatedSocket, next: (err?: Error) => void) {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token || typeof token !== 'string') {
      return next(new Error('Authentication required'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error('Invalid token'));
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    socket.userId = decoded.userId;
    socket.user = profile || { id: decoded.userId, username: 'User' };
    
    next();
  } catch (error) {
    logger.error(error, 'Socket auth error:');
    next(new Error('Authentication failed'));
  }
}

export async function validateSocketAction(socket: AuthenticatedSocket, roomId: string, action: string): Promise<boolean> {
  // Validate if the user is in the room and has permissions for the action
  const { data: member } = await supabase
    .from('room_members')
    .select('role')
    .eq('room_id', roomId)
    .eq('user_id', socket.userId)
    .single();

  if (!member) return false;
  
  if (action.startsWith('sync:')) {
    // Only hosts or co-hosts can send sync events
    return member.role === 'host' || member.role === 'co_host';
  }
  
  if (action === 'room:ban' || action === 'room:kick') {
    return member.role === 'host' || member.role === 'co_host' || member.role === 'moderator';
  }

  return true; // Basic actions like chat messages
}
