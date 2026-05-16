import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth';
import { redisService } from '../../services/redis.service';
import { supabase } from '../../lib/supabase';
import { ServerToClientEvents, ClientToServerEvents, Message } from '@syncsaga/shared';
import { logger } from '../../lib/logger';

// Rate limiting for chat
const chatLimiter = new Map<string, number[]>();

function checkChatRateLimit(userId: string): boolean {
  const now = Date.now();
  const window = 10000; // 10 seconds
  const maxMessages = 10;

  const history = chatLimiter.get(userId) || [];
  const recent = history.filter(t => now - t < window);
  
  if (recent.length >= maxMessages) {
    return false;
  }

  recent.push(now);
  chatLimiter.set(userId, recent);
  return true;
}

export function chatHandler(
  io: Server<ClientToServerEvents, ClientToServerEvents>,
  socket: AuthenticatedSocket
) {
  socket.on('chat:message', async ({ roomId, content, type = 'text' }: { roomId: string; content: string; type?: Message['type'] }) => {
    try {
      if (!socket.userId) return;

      // Rate limit check
      if (!checkChatRateLimit(socket.userId)) {
        return socket.emit('error', { code: 'RATE_LIMITED', message: 'Sending messages too fast' });
      }

      // Validate content
      if (!content || content.trim().length === 0 || content.length > 2000) {
        return socket.emit('error', { code: 'INVALID_MESSAGE', message: 'Invalid message content' });
      }

      // Save to database
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

      // Broadcast to room
      const enrichedMessage = {
        ...message,
        sender: socket.user,
        reactions: {},
      };

      io.to(roomId).emit('chat:message', enrichedMessage as any);

      logger.debug(`Chat message from ${socket.userId} in ${roomId}`);
    } catch (error) {
      logger.error('Chat message error:', error);
    }
  });

  socket.on('chat:typing', async ({ roomId, isTyping }: { roomId: string; isTyping: boolean }) => {
    try {
      if (!socket.userId) return;
      socket.to(roomId).emit('chat:typing', { userId: socket.userId, isTyping });
    } catch (error) {
      logger.error('Chat typing error:', error);
    }
  });

  socket.on('chat:reaction', async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
    try {
      if (!socket.userId) return;

      const { error } = await supabase
        .from('message_reactions')
        .upsert({
          message_id: messageId,
          user_id: socket.userId,
          emoji,
        }, { onConflict: 'message_id, user_id, emoji' });

      if (error) {
        logger.error('Failed to save reaction:', error);
        return;
      }

      // Fetch updated reactions
      const { data: reactions } = await supabase
        .from('message_reactions')
        .select('*')
        .eq('message_id', messageId);

      // Broadcast reaction update
      // Note: In a full implementation, you'd emit a specific reaction event
    } catch (error) {
      logger.error('Chat reaction error:', error);
    }
  });
}
