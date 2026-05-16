import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth';
import { redisService } from '../../services/redis.service';
import { supabase } from '../../lib/supabase';
import { ServerToClientEvents, ClientToServerEvents } from '@syncsaga/shared';
import { logger } from '../../lib/logger';

const chatRateLimit = new Map<string, number[]>();

function checkChatRateLimit(userId: string): boolean {
  const now = Date.now();
  const window = 10000;
  const maxMessages = 10;

  const history = chatRateLimit.get(userId) || [];
  const recent = history.filter(t => now - t < window);
  
  if (recent.length >= maxMessages) return false;

  recent.push(now);
  chatRateLimit.set(userId, recent);
  return true;
}

export function chatHandler(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) {
  socket.on('chat:message', async ({ roomId, content, type = 'text' }) => {
    try {
      if (!socket.userId) return;

      if (!checkChatRateLimit(socket.userId)) {
        return socket.emit('error', { code: 'RATE_LIMITED', message: 'Sending messages too fast' });
      }

      if (!content || content.trim().length === 0 || content.length > 2000) {
        return socket.emit('error', { code: 'INVALID_MESSAGE', message: 'Invalid message content' });
      }

      const { data: message, error } = await supabase
        .from('messages')
        .insert({
          room_id: roomId,
          sender_id: socket.userId,
          content: content.trim(),
          type,
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to save message:', error);
        return socket.emit('error', { code: 'SAVE_FAILED', message: 'Failed to send message' });
      }

      io.to(roomId).emit('chat:message', {
        ...message,
        sender: socket.user,
        reactions: {},
      } as any);

      logger.debug(`Chat message from ${socket.userId} in ${roomId}`);
    } catch (error) {
      logger.error('Chat message error:', error);
    }
  });

  socket.on('chat:typing', async ({ roomId, isTyping }) => {
    try {
      if (!socket.userId) return;
      socket.to(roomId).emit('chat:typing', { userId: socket.userId, isTyping });
    } catch (error) {
      logger.error('Chat typing error:', error);
    }
  });

  socket.on('chat:reaction', async ({ messageId, emoji }) => {
    try {
      if (!socket.userId) return;

      await supabase
        .from('message_reactions')
        .upsert({
          message_id: messageId,
          user_id: socket.userId,
          emoji,
        }, { onConflict: 'message_id, user_id, emoji' });

      const { data: reactions } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId);

      if (reactions) {
        io.to(socket.userId).emit('chat:message', {
          id: messageId,
          reactions: reactions.reduce((acc: Record<string, string[]>, r: any) => {
            if (!acc[r.emoji]) acc[r.emoji] = [];
            acc[r.emoji].push(r.user_id);
            return acc;
          }, {}),
        } as any);
      }
    } catch (error) {
      logger.error('Chat reaction error:', error);
    }
  });
}
