import { Server } from 'socket.io';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import { redisService } from '../../services/redis.service';
import { AuthenticatedSocket } from '../middleware/auth';
import { formatZodError, reactionAddSchema } from '../schemas';

export function reactionHandler(io: Server, socket: AuthenticatedSocket) {
  socket.on('reaction:add', async (payload) => {
    try {
      const parsed = reactionAddSchema.safeParse(payload);
      if (!parsed.success) {
        return socket.emit('error', { code: 'VALIDATION_ERROR', details: formatZodError(parsed.error) });
      }

      if (!socket.userId) return socket.emit('error', { code: 'UNAUTHORIZED', message: 'Authentication required' });

      const { roomId, timestampSec, type, content } = parsed.data;
      const roomUsers = await redisService.getRoomUsers(roomId);
      if (!roomUsers.includes(socket.userId)) {
        return socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Join the room before reacting' });
      }

      const { data: reaction, error } = await supabase
        .from('timeline_reactions')
        .insert({ room_id: roomId, user_id: socket.userId, timestamp_sec: timestampSec, type, content })
        .select('*, profiles:user_id(username, avatar_url)')
        .single();

      if (error) throw error;

      if (reaction) {
        io.to(roomId).emit('reaction:new', reaction);
        await supabase.from('activity_feed').insert({
          user_id: socket.userId,
          type: 'reaction',
          data: { roomId, timestampSec, reactionType: type },
        });
      }
    } catch (error) {
      logger.error(error, 'Reaction add error:');
      socket.emit('error', { code: 'REACTION_FAILED', message: 'Unable to add reaction' });
    }
  });
}
