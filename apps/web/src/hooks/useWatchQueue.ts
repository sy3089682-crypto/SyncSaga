'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAppStore } from '@/store/useAppStore';

export interface QueueItem {
  id: string;
  title: string;
  url?: string;
  thumbnail?: string;
  addedBy: string;
  addedAt: number;
  votes: number;
  voters: string[];
  episode?: number;
  animeId?: string;
}

interface WatchQueueOptions {
  roomId: string;
  initialItems?: QueueItem[];
}

export function useWatchQueue(options: WatchQueueOptions) {
  const { roomId, initialItems = [] } = options;
  const { user } = useAppStore();
  
  const [queue, setQueue] = useState<QueueItem[]>(initialItems);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voting, setVoting] = useState<Record<string, boolean>>({});
  
  const socketRef = useRef<any>(null);

  // Initialize socket connection for queue updates
  useEffect(() => {
    const initSocket = async () => {
      try {
        const socket = await getSocket();
        socketRef.current = socket;
        
        // Listen for queue updates
        socket.on(`queue:update:${roomId}`, (items: QueueItem[]) => {
          setQueue(items);
        });
        
        socket.on(`queue:vote:${roomId}`, ({ itemId, votes, voters }: { itemId: string; votes: number; voters: string[] }) => {
          setQueue(prev => prev.map(item => 
            item.id === itemId 
              ? { ...item, votes, voters }
              : item
          ));
        });
        
        socket.on(`queue:remove:${roomId}`, ({ itemId }: { itemId: string }) => {
          setQueue(prev => prev.filter(item => item.id !== itemId));
        });
        
        socket.on(`queue:move:${roomId}`, ({ itemId, newIndex }: { itemId: string; newIndex: number }) => {
          setQueue(prev => {
            const item = prev.find(i => i.id === itemId);
            if (!item) return prev;
            const newQueue = prev.filter(i => i.id !== itemId);
            newQueue.splice(newIndex, 0, item);
            return newQueue;
          });
        });
      } catch (err) {
        console.error('Failed to initialize queue socket:', err);
      }
    };
    
    initSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off(`queue:update:${roomId}`);
        socketRef.current.off(`queue:vote:${roomId}`);
        socketRef.current.off(`queue:remove:${roomId}`);
        socketRef.current.off(`queue:move:${roomId}`);
      }
    };
  }, [roomId]);

  // Add item to queue
  const addItem = useCallback(async (item: Omit<QueueItem, 'id' | 'addedBy' | 'addedAt' | 'votes' | 'voters'>) => {
    if (!user) {
      setError('You must be logged in to add to queue');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post<{ item: QueueItem }>('/api/queue/add', {
        roomId,
        item,
      });

      const newItem = response.item;
      setQueue(prev => [...prev, newItem]);

      // Notify others via socket
      if (socketRef.current) {
        socketRef.current.emit('queue:add', { roomId, item: newItem });
      }

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add item';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [roomId, user]);

  // Vote for an item
  const vote = useCallback(async (itemId: string) => {
    if (!user) {
      setError('You must be logged in to vote');
      return false;
    }

    if (voting[itemId]) {
      setError('You already voted for this item');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post<{ item: QueueItem }>('/api/queue/vote', {
        roomId,
        itemId,
      });

      const updatedItem = response.item;
      setQueue(prev => prev.map(item => 
        item.id === itemId ? updatedItem : item
      ));

      // Update local voting state
      setVoting(prev => ({ ...prev, [itemId]: true }));

      // Notify others
      if (socketRef.current) {
        socketRef.current.emit('queue:vote', { roomId, itemId });
      }

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to vote';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [roomId, user, voting]);

  // Remove item (only by adder or host)
  const removeItem = useCallback(async (itemId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await api.post('/api/queue/remove', {
        roomId,
        itemId,
      });

      setQueue(prev => prev.filter(item => item.id !== itemId));

      if (socketRef.current) {
        socketRef.current.emit('queue:remove', { roomId, itemId });
      }

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove item';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  // Move item (reorder)
  const moveItem = useCallback(async (itemId: string, newIndex: number) => {
    if (!user) return false;

    setIsLoading(true);
    setError(null);

    try {
      await api.post('/api/queue/move', {
        roomId,
        itemId,
        newIndex,
      });

      setQueue(prev => {
        const item = prev.find(i => i.id === itemId);
        if (!item) return prev;
        const newQueue = prev.filter(i => i.id !== itemId);
        newQueue.splice(Math.min(newIndex, newQueue.length), 0, item);
        return newQueue;
      });

      if (socketRef.current) {
        socketRef.current.emit('queue:move', { roomId, itemId, newIndex });
      }

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to move item';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [roomId, user]);

  // Clear queue (host only)
  const clearQueue = useCallback(async () => {
    if (!user) return false;

    setIsLoading(true);
    setError(null);

    try {
      await api.post('/api/queue/clear', { roomId });

      setQueue([]);

      if (socketRef.current) {
        socketRef.current.emit('queue:clear', { roomId });
      }

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear queue';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [roomId, user]);

  // Get item by ID
  const getItem = useCallback((itemId: string): QueueItem | undefined => {
    return queue.find(item => item.id === itemId);
  }, [queue]);

  // Check if user has voted for item
  const hasUserVoted = useCallback((itemId: string): boolean => {
    return !!voting[itemId];
  }, [voting]);

  // Auto-vote for current user
  useEffect(() => {
    if (!user) return;

    const newVoting: Record<string, boolean> = {};
    queue.forEach(item => {
      newVoting[item.id] = item.voters.includes(user.id);
    });
    setVoting(newVoting);
  }, [queue, user]);

  return {
    queue,
    isLoading,
    error,
    addItem,
    vote,
    removeItem,
    moveItem,
    clearQueue,
    getItem,
    hasUserVoted,
  };
}
