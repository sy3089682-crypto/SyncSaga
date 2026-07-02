import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth';
import { ServerToClientEvents, ClientToServerEvents, Message, User } from '@syncsaga/shared';
import { redisService } from '../../services/redis.service';
import { logger } from '../../lib/logger';
import { validate, chatMessageSchema, chatReactionSchema, chatTypingSchema } from '../../middleware/validators';

function sanitizeContent(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\/g, '&#x2F;')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/data:/gi, '')
    .slice(0, 2000);
}

function isValidGifUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const allowedHosts = ['tenor.com', 'giphy.com', 'media.tenor.com', 'media.giphy.com', 'i.giphy.com'];
    return allowedHosts.some(h => u.hostname.includes(h));
  } catch {
    return false;
  }
}

export function chatHandler(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) {
  socket.on('chat:message', async (data) => {
    try {
      const validation = validate(chatMessageSchema, data);
      if (!validation.success) return socket.emit('error', { code: 'VALIDATION_ERROR', message: validation.error });
      const { roomId, content, type } = validation.data;
      if (!socket.userId) return;
      // ⚡ Bolt: O(1) direct lookup instead of O(N) array fetch to reduce memory & Redis overhead on frequent chat events
      const userSocketId = await redisService.getUserSocketId(roomId, socket.userId);
      if (!userSocketId) return socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Not in room' });
      const allowed = await redisService.checkRateLimit('chat:' + socket.userId, 30, 60);
      if (!allowed) return socket.emit('error:rate_limit', { event: 'chat:message', retryAfter: 60 });
      const sanitized = sanitizeContent(content);
      if (!sanitized.trim()) return;
      if (type === 'gif' && !isValidGifUrl(sanitized)) return socket.emit('error', { code: 'INVALID_GIF', message: 'Only Tenor/Giphy URLs are allowed' });
      const message: Message & { sender: User } = {
        id: Date.now() + '-' + socket.userId + '-' + Math.random().toString(36).slice(2, 8),
        room_id: roomId,
        sender_id: socket.userId,
        recipient_id: null,
        content: sanitized,
        type: (type as Message['type']) || 'text',
        reactions: {},
        created_at: new Date().toISOString(),
        sender: socket.user as User,
      };
      io.to(roomId).emit('chat:message', message);
      logger.debug('Chat message from ' + socket.userId + ' in ' + roomId);
    } catch (error) {
      logger.error('Chat handler error:', error as Error);
    }
  });

  socket.on('chat:typing', async (data) => {
    try {
      const validation = validate(chatTypingSchema, data);
      if (!validation.success) return;
      const { roomId, isTyping } = validation.data;
      if (!socket.userId) return;
      socket.to(roomId).emit('chat:typing', { userId: socket.userId, isTyping });
    } catch (error) {
      logger.error('Chat typing error:', error as Error);
    }
  });

  socket.on('chat:reaction', async (data) => {
    try {
      const validation = validate(chatReactionSchema, data);
      if (!validation.success) return socket.emit('error', { code: 'VALIDATION_ERROR', message: validation.error });
      if (!socket.userId) return;
      const { messageId, emoji } = validation.data;
      const reactionMsg: Message & { sender: User } = {
        id: messageId,
        sender_id: socket.userId,
        content: emoji,
        type: 'reaction',
        reactions: {},
        room_id: null,
        recipient_id: null,
        created_at: new Date().toISOString(),
        sender: socket.user as User,
      };
      io.to(data.roomId || '').emit('chat:reaction', reactionMsg);
    } catch (error) {
      logger.error('Chat reaction error:', error as Error);
    }
  });
}