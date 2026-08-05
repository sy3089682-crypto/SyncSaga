'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { getSocket } from '@/lib/socket';

export type ReactionType = 
  | 'laugh' | 'cry' | 'shock' | 'fire' | 'heart' | 'gg' 
  | 'angry' | 'sad' | 'wow' | 'clap' | 'love' | 'evil';

export interface ReactionConfig {
  type: ReactionType;
  emoji: string;
  color: string;
  sound?: string;
}

export interface ReactionEvent {
  id: string;
  userId: string;
  username: string;
  type: ReactionType;
  timestamp: number;
  roomId: string;
  episodeTimestamp?: number;
  isFullscreen: boolean;
  position?: { x: number; y: number };
}

// Pre-configured reaction types
export const REACTION_CONFIGS: Record<ReactionType, ReactionConfig> = {
  laugh: { type: 'laugh', emoji: '😂', color: '#FFD700', sound: 'laugh' },
  cry: { type: 'cry', emoji: '😭', color: '#4A90D9', sound: 'cry' },
  shock: { type: 'shock', emoji: '😱', color: '#FF6B6B', sound: 'shock' },
  fire: { type: 'fire', emoji: '🔥', color: '#FF4500', sound: 'fire' },
  heart: { type: 'heart', emoji: '❤️', color: '#FF1493', sound: 'heart' },
  gg: { type: 'gg', emoji: '👍', color: '#90EE90', sound: 'gg' },
  angry: { type: 'angry', emoji: '😡', color: '#DC143C', sound: 'angry' },
  sad: { type: 'sad', emoji: '😢', color: '#6A5ACD', sound: 'sad' },
  wow: { type: 'wow', emoji: '😮', color: '#00CED1', sound: 'wow' },
  clap: { type: 'clap', emoji: '👏', color: '#FFA500', sound: 'clap' },
  love: { type: 'love', emoji: '🥰', color: '#FF69B4', sound: 'love' },
  evil: { type: 'evil', emoji: '👿', color: '#8B0000', sound: 'evil' },
};

export interface UseReactionsOptions {
  roomId: string;
  userId?: string;
  username?: string;
}

export interface UseReactionsReturn {
  reactions: ReactionEvent[];
  recentReactions: ReactionEvent[];
  isLoading: boolean;
  error: string | null;
  
  // Send reactions
  sendReaction: (type: ReactionType, options?: { timestamp?: number; fullscreen?: boolean }) => Promise<void>;
  sendTextReaction: (text: string, timestamp?: number) => Promise<void>;
  
  // Manage reactions
  removeReaction: (reactionId: string) => void;
  clearReactions: () => void;
  
  // Get reactions at timestamp
  getReactionsAt: (timestamp: number, windowMs?: number) => ReactionEvent[];
  getRecentReactions: () => ReactionEvent[];
  
  // Fullscreen reaction
  triggerFullscreenReaction: (type: ReactionType) => void;
  isFullscreenReactionActive: boolean;
  dismissFullscreenReaction: () => void;
}

export function useReactions(options: UseReactionsOptions): UseReactionsReturn {
  const { roomId, userId = '', username = 'User' } = options;
  
  const [reactions, setReactions] = useState<ReactionEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Fullscreen reaction state
  const [fullscreenReaction, setFullscreenReaction] = useState<ReactionEvent | null>(null);
  
  // Socket ref
  const socketRef = useRef<any>(null);
  const reactionsEndRef = useRef<HTMLDivElement>(null);
  
  // Throttle rapid reactions
  const lastReactionTimeRef = useRef<number>(0);
  const REACTION_THROTTLE_MS = 200;

  // Initialize socket
  useEffect(() => {
    const initSocket = async () => {
      try {
        const socket = await getSocket();
        socketRef.current = socket;
        
        // Listen for new reactions
        socket.on(`reaction:new:${roomId}`, (reaction: ReactionEvent) => {
          setReactions(prev => {
            // Limit stored reactions to prevent memory issues
            const updated = [...prev, reaction];
            if (updated.length > 500) {
              return updated.slice(-500);
            }
            return updated;
          });
        });
        
        // Listen for reaction removals
        socket.on(`reaction:remove:${roomId}`, ({ reactionId }: { reactionId: string }) => {
          setReactions(prev => prev.filter(r => r.id !== reactionId));
        });
        
        // Listen for fullscreen reactions
        socket.on(`reaction:fullscreen:${roomId}`, (reaction: ReactionEvent) => {
          setFullscreenReaction(reaction);
          // Auto-dismiss after 3 seconds
          setTimeout(() => setFullscreenReaction(null), 3000);
        });
        
      } catch (err) {
        console.error('Failed to initialize reactions socket:', err);
        setError('Failed to connect to reactions');
      }
    };
    
    initSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off(`reaction:new:${roomId}`);
        socketRef.current.off(`reaction:remove:${roomId}`);
        socketRef.current.off(`reaction:fullscreen:${roomId}`);
      }
    };
  }, [roomId]);

  // Send emoji reaction
  const sendReaction = useCallback(async (
    type: ReactionType,
    options?: { timestamp?: number; fullscreen?: boolean }
  ) => {
    // Throttle rapid reactions
    const now = Date.now();
    if (now - lastReactionTimeRef.current < REACTION_THROTTLE_MS) {
      return;
    }
    lastReactionTimeRef.current = now;

    if (!socketRef.current) {
      setError('Not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const reaction: ReactionEvent = {
        id: `reaction_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId,
        username,
        type,
        timestamp: now,
        roomId,
        episodeTimestamp: options?.timestamp,
        isFullscreen: options?.fullscreen || false,
      };

      // Emit to server
      socketRef.current.emit('reaction:add', {
        roomId,
        type,
        timestamp: options?.timestamp,
        fullscreen: options?.fullscreen || false,
      });

      // Optimistically add to local state
      setReactions(prev => {
        const updated = [...prev, reaction];
        if (updated.length > 500) return updated.slice(-500);
        return updated;
      });

      // If fullscreen, show it
      if (options?.fullscreen) {
        setFullscreenReaction(reaction);
        setTimeout(() => setFullscreenReaction(null), 3000);
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reaction';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, userId, username]);

  // Send text reaction
  const sendTextReaction = useCallback(async (text: string, timestamp?: number) => {
    if (!text.trim() || !socketRef.current) return;

    try {
      socketRef.current.emit('reaction:text', {
        roomId,
        text: text.trim(),
        timestamp,
      });
    } catch (err) {
      console.error('Failed to send text reaction:', err);
    }
  }, [roomId]);

  // Remove reaction (host/moderator only)
  const removeReaction = useCallback((reactionId: string) => {
    if (!socketRef.current) return;

    setReactions(prev => prev.filter(r => r.id !== reactionId));
    socketRef.current.emit('reaction:remove', { roomId, reactionId });
  }, [roomId]);

  // Clear reactions
  const clearReactions = useCallback(() => {
    if (!socketRef.current) return;

    setReactions([]);
    socketRef.current.emit('reaction:clear', { roomId });
  }, [roomId]);

  // Get reactions within time window
  const getReactionsAt = useCallback((timestamp: number, windowMs = 5000): ReactionEvent[] => {
    const cutoff = timestamp - windowMs;
    const windowEnd = timestamp + windowMs;
    return reactions.filter(r => {
      if (r.episodeTimestamp === undefined) return false;
      return r.episodeTimestamp >= cutoff && r.episodeTimestamp <= windowEnd;
    });
  }, [reactions]);

  // Get recent reactions
  const getRecentReactions = useCallback(() => {
    return reactions.slice(-20);
  }, [reactions]);

  // Trigger fullscreen reaction (shows locally without server)
  const triggerFullscreenReaction = useCallback((type: ReactionType) => {
    const config = REACTION_CONFIGS[type];
    const reaction: ReactionEvent = {
      id: `fs_${Date.now()}`,
      userId,
      username,
      type,
      timestamp: Date.now(),
      roomId,
      isFullscreen: true,
    };
    setFullscreenReaction(reaction);
    setTimeout(() => setFullscreenReaction(null), 2500);
  }, [roomId, userId, username]);

  const dismissFullscreenReaction = useCallback(() => {
    setFullscreenReaction(null);
  }, []);

  // Memoized recent reactions
  const recentReactions = useMemo(() => reactions.slice(-30), [reactions]);

  return {
    reactions,
    recentReactions,
    isLoading,
    error,
    sendReaction,
    sendTextReaction,
    removeReaction,
    clearReactions,
    getReactionsAt,
    getRecentReactions,
    triggerFullscreenReaction,
    isFullscreenReactionActive: !!fullscreenReaction,
    dismissFullscreenReaction,
  };
}
