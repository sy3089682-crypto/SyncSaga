'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export type ChatFormatType = 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'link' | 'quote' | 'spoiler';

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  formattedContent?: string;
  timestamp: number;
  isEdited: boolean;
  isDeleted: boolean;
  deletedContent?: string;
  attachments?: {
    type: 'image' | 'gif' | 'video' | 'file';
    url: string;
    name: string;
  }[];
  reactions?: {
    emoji: string;
    count: number;
    reactedBy: string[];
  }[];
  isPinned: boolean;
  isSpoiler: boolean;
}

export interface UseChatFeaturesOptions {
  roomId?: string;
  userId?: string;
  username?: string;
  maxHistory?: number;
  onMessageSend?: (message: ChatMessage) => void;
  onMessageReceive?: (message: ChatMessage) => void;
}

export function useChatFeatures(options: UseChatFeaturesOptions = {}) {
  const { roomId, userId = '', username = 'User', maxHistory = 200, onMessageSend, onMessageReceive } = options;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, number>>(new Map());
  const [editedMessage, setEditedMessage] = useState<string | null>(null);
  const [pendingAttachements, setPendingAttachments] = useState<ChatMessage['attachments']>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<any>(null);
  const messageQueueRef = useRef<ChatMessage[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Format text with markdown-like syntax
  const formatText = useCallback((content: string): string => {
    let formatted = content;
    
    // Bold: **text** or __text__
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/__(.+?)__/g, '<strong>$1</strong>');
    
    // Italic: *text* or _text_
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');
    
    // Underline: __text__ (but not already bold)
    // This is tricky, simplified version
    formatted = formatted.replace(/_{2}([^_]+)_{2}/g, '<u>$1</u>');
    
    // Strikethrough: ~~text~~
    formatted = formatted.replace(/~~(.+?)~~/g, '<del>$1</del>');
    
    // Inline code: `text`
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="chat-code">$1</code>');
    
    // Code block: ```language\ncode\n```
    formatted = formatted.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="chat-code-block">$2</pre>');
    
    // Link: [text](url)
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>');
    
    // Quote: > text
    formatted = formatted.replace(/^&gt;\s*(.+)$/gm, '<blockquote class="chat-quote">$1</blockquote>');
    
    // Spoiler: ||text||
    formatted = formatted.replace(/\|\|(.+?)\|\|/g, '<span class="chat-spoiler">$1</span>');
    
    // Mention: @username
    formatted = formatted.replace(/@(\w+)/g, '<span class="chat-mention">@$1</span>');
    
    // Hashtag: #tag
    formatted = formatted.replace(/#(\w+)/g, '<span class="chat-hashtag">#$1</span>');
    
    // Newlines
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  }, []);

  // Send message
  const sendMessage = useCallback(async (content: string, options?: { attachments?: ChatMessage['attachments']; replyTo?: string }): Promise<ChatMessage | null> => {
    if (!userId || !content.trim()) {
      setError('User ID and content required');
      return null;
    }

    if (content.length > 2000) {
      setError('Message too long (max 2000 characters)');
      return null;
    }

    setIsSending(true);
    setError(null);

    try {
      const message: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId,
        username,
        content: content.trim(),
        formattedContent: formatText(content.trim()),
        timestamp: Date.now(),
        isEdited: false,
        isDeleted: false,
        attachments: options?.attachments,
        reactions: [],
        isPinned: false,
        isSpoiler: content.includes('||'),
      };

      // Add to local state optimistically
      setMessages(prev => [message, ...prev].slice(0, maxHistory));
      onMessageSend?.(message);

      // Queue for sending
      messageQueueRef.current.push(message);

      // In real implementation, send via socket
      // socketRef.current?.emit('chat:message', { roomId, message });

      return message;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      return null;
    } finally {
      setIsSending(false);
    }
  }, [userId, username, formatText, maxHistory, onMessageSend]);

  // Edit message
  const editMessage = useCallback(async (messageId: string, newContent: string): Promise<boolean> => {
    if (!userId) return false;

    const message = messages.find(m => m.id === messageId);
    if (!message || message.userId !== userId) {
      setError('Cannot edit this message');
      return false;
    }

    if (newContent.length > 2000) {
      setError('Message too long');
      return false;
    }

    try {
      const editedMessage: ChatMessage = {
        ...message,
        content: newContent.trim(),
        formattedContent: formatText(newContent.trim()),
        isEdited: true,
        timestamp: Date.now(),
      };

      setMessages(prev => prev.map(m => m.id === messageId ? editedMessage : m));
      setEditedMessage(newContent);

      // In real implementation, send via socket
      // socketRef.current?.emit('chat:edit', { roomId, messageId, content: newContent });

      return true;
    } catch (err) {
      setError('Failed to edit message');
      return false;
    }
  }, [messages, userId, formatText]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    if (!userId) return false;

    const message = messages.find(m => m.id === messageId);
    if (!message || message.userId !== userId) {
      setError('Cannot delete this message');
      return false;
    }

    try {
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, isDeleted: true, deletedContent: m.content, content: '', formattedContent: '' }
          : m
      ));

      // In real implementation, send via socket
      // socketRef.current?.emit('chat:delete', { roomId, messageId });

      return true;
    } catch (err) {
      setError('Failed to delete message');
      return false;
    }
  }, [messages, userId]);

  // Pin message (host only)
  const pinMessage = useCallback(async (messageId: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      setMessages(prev => {
        const message = prev.find(m => m.id === messageId);
        if (!message) return prev;
        
        const others = prev.filter(m => m.id !== messageId);
        const pinned = { ...message, isPinned: true };
        const unpinned = others.filter(m => m.isPinned);
        
        return [pinned, ...unpinned, ...others];
      });

      // socketRef.current?.emit('chat:pin', { roomId, messageId });

      return true;
    } catch (err) {
      setError('Failed to pin message');
      return false;
    }
  }, [userId]);

  // Unpin message
  const unpinMessage = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, isPinned: false } : m
      ));

      // socketRef.current?.emit('chat:unpin', { roomId, messageId });

      return true;
    } catch (err) {
      setError('Failed to unpin message');
      return false;
    }
  }, []);

  // Add reaction to message
  const addReaction = useCallback(async (messageId: string, emoji: string): Promise<boolean> => {
    try {
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId) return m;
        
        const existingReaction = m.reactions?.find(r => r.emoji === emoji);
        if (existingReaction) {
          return {
            ...m,
            reactions: m.reactions?.map(r => 
              r.emoji === emoji 
                ? { ...r, count: r.count + 1, reactedBy: [...r.reactedBy, userId] }
                : r
            ),
          };
        }
        
        return {
          ...m,
          reactions: [
            ...(m.reactions || []),
            { emoji, count: 1, reactedBy: [userId] },
          ],
        };
      }));

      // socketRef.current?.emit('chat:reaction', { roomId, messageId, emoji });

      return true;
    } catch (err) {
      setError('Failed to add reaction');
      return false;
    }
  }, [messages, userId]);

  // Remove reaction
  const removeReaction = useCallback(async (messageId: string, emoji: string): Promise<boolean> => {
    try {
      setMessages(prev => prev.map(m => {
        if (m.id !== messageId || !m.reactions) return m;
        
        const reaction = m.reactions.find(r => r.emoji === emoji);
        if (!reaction) return m;
        
        if (reaction.count <= 1) {
          return {
            ...m,
            reactions: m.reactions.filter(r => r.emoji !== emoji),
          };
        }
        
        return {
          ...m,
          reactions: m.reactions.map(r => 
            r.emoji === emoji 
              ? { ...r, count: r.count - 1, reactedBy: r.reactedBy.filter(id => id !== userId) }
              : r
          ),
        };
      }));

      // socketRef.current?.emit('chat:reaction:remove', { roomId, messageId, emoji });

      return true;
    } catch (err) {
      setError('Failed to remove reaction');
      return false;
    }
  }, [messages, userId]);

  // Mark as spoiler
  const markAsSpoiler = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, isSpoiler: true } : m
      ));

      // socketRef.current?.emit('chat:spoiler', { roomId, messageId });

      return true;
    } catch (err) {
      setError('Failed to mark as spoiler');
      return false;
    }
  }, []);

  // Send typing indicator
  const sendTyping = useCallback((isTyping: boolean) => {
    if (!socketRef.current) return;
    
    // socketRef.current.emit('chat:typing', { roomId, isTyping });
  }, [roomId]);

  // Start typing (auto-send typing indicator)
  const startTyping = useCallback(() => {
    sendTyping(true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 3000);
  }, [sendTyping]);

  // Stop typing
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    sendTyping(false);
  }, [sendTyping]);

  // Get messages for a time range
  const getMessagesInRange = useCallback((startTime: number, endTime: number): ChatMessage[] => {
    return messages.filter(m => 
      !m.isDeleted && m.timestamp >= startTime && m.timestamp <= endTime
    );
  }, [messages]);

  // Get recent messages
  const getRecentMessages = useCallback((limit: number = 10): ChatMessage[] => {
    return messages.filter(m => !m.isDeleted).slice(0, limit);
  }, [messages]);

  // Get messages by user
  const getMessagesByUser = useCallback((userIdToFilter: string): ChatMessage[] => {
    return messages.filter(m => !m.isDeleted && m.userId === userIdToFilter);
  }, [messages]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setTypingUsers(new Map());
    setEditedMessage(null);
    setPendingAttachments([]);
  }, []);

  // Insert formatted text at cursor
  const insertFormat = useCallback((format: ChatFormatType, text: string = '') => {
    // This would integrate with textarea to insert at cursor
    // For now, just return the formatted string
    switch (format) {
      case 'bold':
        return `**${text}**`;
      case 'italic':
        return `*${text}*`;
      case 'underline':
        return `<u>${text}</u>`;
      case 'strike':
        return `~~${text}~~`;
      case 'code':
        return `\`${text}\``;
      case 'link':
        return `[${text}](url)`;
      case 'quote':
        return `> ${text}`;
      case 'spoiler':
        return `||${text}||`;
      default:
        return text;
    }
  }, []);

  // Get formatting help
  const getFormattingHelp = useCallback((): Record<ChatFormatType, { shortcut: string; description: string }> => {
    return {
      bold: { shortcut: '**text**', description: 'Bold text' },
      italic: { shortcut: '*text*', description: 'Italic text' },
      underline: { shortcut: '__text__', description: 'Underlined text' },
      strike: { shortcut: '~~text~~', description: 'Strikethrough' },
      code: { shortcut: '`text`', description: 'Inline code' },
      link: { shortcut: '[text](url)', description: 'Hyperlink' },
      quote: { shortcut: '> text', description: 'Quote' },
      spoiler: { shortcut: '||text||', description: 'Spoiler' },
    };
  }, []);

  // Toggle chat (would integrate with UI)
  const toggleChat = useCallback(() => {
    // This would toggle chat visibility
  }, []);

  // Keyboard shortcut for chat
  const toggleChatShortcut = useCallback(() => {
    // Usually 'Tab' or 'C'
  }, []);

  return {
    messages,
    typingUsers,
    editedMessage,
    pendingAttachements,
    isSending,
    error,
    sendMessage,
    editMessage,
    deleteMessage,
    pinMessage,
    unpinMessage,
    addReaction,
    removeReaction,
    markAsSpoiler,
    sendTyping,
    startTyping,
    stopTyping,
    getMessagesInRange,
    getRecentMessages,
    getMessagesByUser,
    clearMessages,
    insertFormat,
    getFormattingHelp,
    toggleChat,
    toggleChatShortcut,
  };
}
