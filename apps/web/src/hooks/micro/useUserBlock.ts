'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

export interface BlockedUser {
  id: string;
  blockedUserId: string;
  blockedUsername: string;
  blockedBy: string;
  reason?: string;
  createdAt: number;
  expiresAt?: number;
  isActive: boolean;
}

export interface UseUserBlockOptions {
  userId?: string;
  username?: string;
  onBlock?: (blocked: BlockedUser) => void;
  onUnblock?: (userId: string) => void;
}

export function useUserBlock(options: UseUserBlockOptions = {}) {
  const { userId = '', username = 'User', onBlock, onUnblock } = options;
  
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [pendingBlockUser, setPendingBlockUser] = useState<string | null>(null);
  
  const socketRef = useRef<any>(null);

  // Initialize socket
  useEffect(() => {
    const initSocket = async () => {
      try {
        const socket = await getSocket();
        socketRef.current = socket;
        
        socket.on('block:update', (blocked: BlockedUser) => {
          setBlockedUsers(prev => {
            const existing = prev.find(b => b.blockedUserId === blocked.blockedUserId);
            if (existing) {
              return prev.map(b => b.blockedUserId === blocked.blockedUserId ? blocked : b);
            }
            return [...prev, blocked];
          });
          
          if (blocked.blockedBy === userId) {
            onBlock?.(blocked);
          }
        });
        
        socket.on('block:remove', ({ blockedUserId }: { blockedUserId: string }) => {
          setBlockedUsers(prev => prev.filter(b => b.blockedUserId !== blockedUserId));
          onUnblock?.(blockedUserId);
        });
        
      } catch (err) {
        console.error('Failed to initialize block socket:', err);
      }
    };
    
    initSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off('block:update');
        socketRef.current.off('block:remove');
      }
    };
  }, [userId, onBlock, onUnblock]);

  // Fetch blocked users
  const fetchBlockedUsers = useCallback(async (): Promise<BlockedUser[]> => {
    if (!userId) {
      setError('User ID required');
      return [];
    }

    try {
      const response = await api.get<{ blockedUsers: BlockedUser[] }>(`/api/block/list?userId=${userId}`);

      setBlockedUsers(response.blockedUsers);
      return response.blockedUsers;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch blocked users';
      setError(errorMessage);
      return [];
    }
  }, [userId]);

  // Block user
  const blockUser = useCallback(async (targetUserId: string, reason?: string): Promise<BlockedUser | null> => {
    if (!userId) {
      setError('You must be logged in to block users');
      return null;
    }

    if (targetUserId === userId) {
      setError('You cannot block yourself');
      return null;
    }

    setIsBlocking(true);
    setError(null);
    setPendingBlockUser(targetUserId);

    try {
      const response = await api.post<{ blocked: BlockedUser }>('/api/block', {
        blockerId: userId,
        targetUserId,
        reason,
      });

      const blocked = response.blocked;
      setBlockedUsers(prev => [blocked, ...prev]);
      onBlock?.(blocked);

      return blocked;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to block user';
      setError(errorMessage);
      return null;
    } finally {
      setIsBlocking(false);
      setPendingBlockUser(null);
      setShowBlockForm(false);
    }
  }, [userId, onBlock]);

  // Unblock user
  const unblockUser = useCallback(async (blockedUserId: string): Promise<boolean> => {
    if (!userId) {
      setError('You must be logged in');
      return false;
    }

    setIsUnblocking(true);
    setError(null);

    try {
      await api.post('/api/block/unblock', {
        blockerId: userId,
        blockedUserId,
      });

      setBlockedUsers(prev => prev.filter(b => b.blockedUserId !== blockedUserId));
      onUnblock?.(blockedUserId);

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unblock user';
      setError(errorMessage);
      return false;
    } finally {
      setIsUnblocking(false);
    }
  }, [userId, onUnblock]);

  // Check if user is blocked
  const isBlocked = useCallback((targetUserId: string): boolean => {
    return blockedUsers.some(b => b.blockedUserId === targetUserId && b.isActive);
  }, [blockedUsers]);

  // Get block by user ID
  const getBlock = useCallback((targetUserId: string): BlockedUser | undefined => {
    return blockedUsers.find(b => b.blockedUserId === targetUserId);
  }, [blockedUsers]);

  // Get active blocks count
  const getActiveCount = useCallback((): number => {
    return blockedUsers.filter(b => b.isActive).length;
  }, [blockedUsers]);

  // Temporary block (auto-unblock after time)
  const temporaryBlock = useCallback(async (
    targetUserId: string,
    durationMinutes: number,
    reason?: string
  ): Promise<BlockedUser | null> => {
    if (!userId) {
      setError('You must be logged in');
      return null;
    }

    setIsBlocking(true);
    setError(null);

    try {
      const expiresAt = Date.now() + durationMinutes * 60 * 1000;
      
      const response = await api.post<{ blocked: BlockedUser }>(
        '/api/block/temporary',
        { blockerId: userId, targetUserId, reason, expiresAt }
      );

      const blocked = response.blocked;
      setBlockedUsers(prev => [blocked, ...prev]);
      onBlock?.(blocked);

      return blocked;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to temporary block';
      setError(errorMessage);
      return null;
    } finally {
      setIsBlocking(false);
    }
  }, [userId, onBlock]);

  // Block message sender
  const blockMessageSender = useCallback(async (messageId: string, reason?: string): Promise<boolean> => {
    if (!userId) {
      setError('You must be logged in');
      return false;
    }

    try {
      // First get the sender's user ID from the message
      const response = await api.get<{ senderId: string }>(`/api/messages/sender?messageId=${messageId}`);

      const senderId = response.senderId;
      
      // Then block them
      await blockUser(senderId, reason);

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to block message sender';
      setError(errorMessage);
      return false;
    }
  }, [userId, blockUser]);

  // Show block form for user
  const showBlockFormFor = useCallback((userIdToBlock: string) => {
    setPendingBlockUser(userIdToBlock);
    setShowBlockForm(true);
  }, []);

  // Hide block form
  const hideBlockForm = useCallback(() => {
    setShowBlockForm(false);
    setPendingBlockUser(null);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    blockedUsers,
    isBlocking,
    isUnblocking,
    error,
    showBlockForm,
    pendingBlockUser,
    fetchBlockedUsers,
    blockUser,
    unblockUser,
    isBlocked,
    getBlock,
    getActiveCount,
    temporaryBlock,
    blockMessageSender,
    showBlockFormFor,
    hideBlockForm,
    clearError,
  };
}
