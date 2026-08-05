'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';

export interface TimestampShare {
  id: string;
  userId: string;
  username: string;
  timestamp: number;      // Video timestamp in seconds
  message?: string;
  createdAt: number;
  reactions: {
    emoji: string;
    count: number;
  }[];
}

export interface UseTimestampShareOptions {
  roomId: string;
  userId?: string;
  username?: string;
  onShare?: (share: TimestampShare) => void;
}

export function useTimestampShare(options: UseTimestampShareOptions) {
  const { roomId, userId = '', username = 'User', onShare } = options;
  
  const [shares, setShares] = useState<TimestampShare[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const socketRef = useRef<any>(null);
  const currentTimestampRef = useRef<number>(0);

  // Set current video timestamp
  const setCurrentTimestamp = useCallback((timestamp: number) => {
    currentTimestampRef.current = timestamp;
  }, []);

  // Initialize socket
  useEffect(() => {
    const initSocket = async () => {
      try {
        const socket = await getSocket();
        socketRef.current = socket;
        
        socket.on(`timestamp:share:${roomId}`, (share: TimestampShare) => {
          setShares(prev => [share, ...prev].slice(0, 50));
          onShare?.(share);
        });
        
        socket.on(`timestamp:delete:${roomId}`, ({ id }: { id: string }) => {
          setShares(prev => prev.filter(s => s.id !== id));
        });
        
      } catch (err) {
        console.error('Failed to initialize timestamp share:', err);
      }
    };
    
    initSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off(`timestamp:share:${roomId}`);
        socketRef.current.off(`timestamp:delete:${roomId}`);
      }
    };
  }, [roomId, onShare]);

  // Share current timestamp
  const shareCurrent = useCallback(async (message?: string): Promise<TimestampShare | null> => {
    if (!socketRef.current) {
      setError('Not connected');
      return null;
    }

    setIsSharing(true);
    setError(null);

    try {
      const share: TimestampShare = {
        id: `ts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId,
        username,
        timestamp: currentTimestampRef.current,
        message,
        createdAt: Date.now(),
        reactions: [],
      };

      socketRef.current.emit('timestamp:share', {
        roomId,
        timestamp: currentTimestampRef.current,
        message,
      });

      setShares(prev => [share, ...prev].slice(0, 50));
      onShare?.(share);

      return share;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share';
      setError(errorMessage);
      return null;
    } finally {
      setIsSharing(false);
    }
  }, [roomId, userId, username, onShare]);

  // Share specific timestamp
  const shareAt = useCallback(async (timestamp: number, message?: string): Promise<TimestampShare | null> => {
    if (!socketRef.current) {
      setError('Not connected');
      return null;
    }

    setIsSharing(true);
    setError(null);

    try {
      const share: TimestampShare = {
        id: `ts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        userId,
        username,
        timestamp,
        message,
        createdAt: Date.now(),
        reactions: [],
      };

      socketRef.current.emit('timestamp:share', {
        roomId,
        timestamp,
        message,
      });

      setShares(prev => [share, ...prev].slice(0, 50));
      onShare?.(share);

      return share;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share';
      setError(errorMessage);
      return null;
    } finally {
      setIsSharing(false);
    }
  }, [roomId, userId, username, onShare]);

  // Format timestamp
  const formatTimestamp = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Get share URL
  const getShareUrl = useCallback((share: TimestampShare): string => {
    if (typeof window !== 'undefined') {
      const baseUrl = window.location.origin;
      return `${baseUrl}/room/${roomId}?timestamp=${share.timestamp}`;
    }
    return `/room/${roomId}?timestamp=${share.timestamp}`;
  }, [roomId]);

  // Copy share link
  const copyLink = useCallback(async (share: TimestampShare): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(getShareUrl(share));
      setCopiedId(share.id);
      setTimeout(() => setCopiedId(null), 2000);
      return true;
    } catch (err) {
      console.error('Failed to copy link:', err);
      return false;
    }
  }, [getShareUrl]);

  // React to share
  const reactToShare = useCallback(async (shareId: string, emoji: string): Promise<void> => {
    if (!socketRef.current) return;

    setShares(prev => prev.map(s => {
      if (s.id !== shareId) return s;
      
      const existingReaction = s.reactions.find(r => r.emoji === emoji);
      if (existingReaction) {
        return {
          ...s,
          reactions: s.reactions.map(r => 
            r.emoji === emoji ? { ...r, count: r.count + 1 } : r
          ),
        };
      }
      
      return {
        ...s,
        reactions: [...s.reactions, { emoji, count: 1 }],
      };
    }));
  }, []);

  // Delete share (creator only)
  const deleteShare = useCallback(async (shareId: string): Promise<void> => {
    if (!socketRef.current) return;

    socketRef.current.emit('timestamp:delete', { roomId, shareId });
    setShares(prev => prev.filter(s => s.id !== shareId));
  }, [roomId]);

  // Get recent shares
  const getRecentShares = useCallback((limit = 10): TimestampShare[] => {
    return shares.slice(0, limit);
  }, [shares]);

  // Get shares near timestamp
  const getSharesNear = useCallback((timestamp: number, windowSeconds = 10): TimestampShare[] => {
    return shares.filter(s => 
      Math.abs(s.timestamp - timestamp) <= windowSeconds
    );
  }, [shares]);

  // Clear all shares
  const clearShares = useCallback(() => {
    setShares([]);
  }, []);

  return {
    shares,
    isSharing,
    error,
    copiedId,
    setCurrentTimestamp,
    shareCurrent,
    shareAt,
    formatTimestamp,
    getShareUrl,
    copyLink,
    reactToShare,
    deleteShare,
    getRecentShares,
    getSharesNear,
    clearShares,
  };
}
