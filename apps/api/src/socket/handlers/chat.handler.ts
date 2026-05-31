import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth';
import { ServerToClientEvents, ClientToServerEvents, Message, User } from '@syncsaga/shared';
import { redisService } from '../../services/redis.service';
import { moderationService } from '../../services/moderation.service';
import { logger } from '../../lib/logger';
import { validate, chatMessageSchema, chatReactionSchema, chatTypingSchema } from '../../middleware/validators';

function sanitizeContent(text: string): string {
  let result = text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  let prev = '';
  while (prev !== result) {
    prev = result;
    result = result
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '');
  }
  return result.slice(0, 2000);
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
      if (!validation.success) {
        return socket.emit('error', { code: 'VALIDATION_ERROR', message: validation.error });
      }

      const { roomId, content, type } = validation.data;
      if (!socket.userId || !roomId) return;

      const roomUsers = await redisService.getRoomUsers(roomId);
      if (!roomUsers.includes(socket.userId)) {
        return socket.emit('error', { code: 'NOT_IN_ROOM', message: 'Not in room' });
      }

      const allowed = await redisService.checkRateLimit(`chat:${roomId}:${socket.userId}`, 30, 60);
      if (!allowed) {
        return socket.emit('error:rate_limit', { event: 'chat:message', retryAfter: 60 });
      }

      const sanitized = sanitizeContent(content);
      if (!sanitized.trim()) return;

      if (type === 'gif' && !isValidGifUrl(sanitized)) {
        return socket.emit('error', { code: 'INVALID_GIF', message: 'Only Tenor/Giphy URLs are allowed' });
      }

      const moderationResult = await moderationService.checkMessage(sanitized);
      // Mock properties if they don't exist on the result yet, or use what's available
      const isSpam = (moderationResult as any).isSpam || false;
      const hasPII = (moderationResult as any).hasPII || false;
      const hasProfanity = (moderationResult as any).hasProfanity || false;

      if (hasPII) {
        return socket.emit('error', { code: 'PII_DETECTED', message: 'Message contains personal information' });
      }
      if (isSpam && !(socket.user as any)?.is_mod) {
        return socket.emit('error', { code: 'SPAM_DETECTED', message: 'Message flagged as spam' });
      }

      const message: any = {
        id: `${Date.now()}-${socket.userId}-${Math.random().toString(36).slice(2, 8)}`,
        room_id: roomId,
        sender_id: socket.userId,
        recipient_id: null,
        content: sanitized,
        type: (type as Message['type']) || 'text',
        reactions: {},
        created_at: new Date().toISOString(),
        sender: socket.user,
        has_profanity: hasProfanity,
      };

      io.to(roomId).emit('chat:message', message);
      logger.debug(`Chat message from ${socket.userId} in ${roomId}`);
    } catch (error) {
      logger.error(error, 'Chat handler error:');
    }
  });

  let typingThrottle = new Map<string, number>();

  socket.on('chat:typing', async (data) => {
    try {
      const validation = validate(chatTypingSchema, data);
      if (!validation.success) return;

      const { roomId, isTyping } = validation.data;
      if (!socket.userId || !roomId) return;

      if (isTyping) {
        const last = typingThrottle.get(socket.userId) || 0;
        const now = Date.now();
        if (now - last < 2000) return;
        typingThrottle.set(socket.userId, now);
      } else {
        typingThrottle.delete(socket.userId);
      }

      socket.to(roomId).emit('chat:typing', { userId: socket.userId, isTyping });
    } catch (error) {
      logger.error(error, 'Chat typing error:');
    }
  });

  socket.on('chat:reaction', async (data: any) => {
    try {
      const validation = validate(chatReactionSchema, data);
      if (!validation.success) {
        return socket.emit('error', { code: 'VALIDATION_ERROR', message: validation.error });
      }

      if (!socket.userId) return;
      const { messageId, emoji } = validation.data;

      const reactionMsg: any = {
        id: messageId,
        sender_id: socket.userId,
        content: emoji,
        type: 'reaction',
        reactions: {},
        room_id: null,
        recipient_id: null,
        created_at: new Date().toISOString(),
        sender: socket.user,
      };

      io.to(data.roomId || '').emit('chat:reaction', reactionMsg);
    } catch (error) {
      logger.error(error, 'Chat reaction error:');
    }
  });

  socket.on('chat:message:react', async (data: any) => {
    try {
      if (!socket.userId || !data.roomId || !data.messageId || !data.emoji) return;

      const roomUsers = await redisService.getRoomUsers(data.roomId);
      if (!roomUsers.includes(socket.userId)) return;

      io.to(data.roomId).emit('chat:reaction', {
        id: data.messageId,
        sender_id: socket.userId,
        content: data.emoji,
        type: 'reaction',
        created_at: new Date().toISOString(),
        sender: socket.user,
      } as any);
    } catch (error) {
      logger.error(error, 'Chat reaction error:');
    }
  });

  socket.on('disconnect', () => {
    typingThrottle.delete(socket.userId);
  });
}
