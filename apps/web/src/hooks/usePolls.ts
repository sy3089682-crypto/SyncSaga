'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage?: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  isOpen: boolean;
  expiresAt?: number;
  createdBy: string;
  createdAt: number;
  voted: boolean;
  userVote?: string;
}

interface UsePollsOptions {
  roomId: string;
}

export function usePolls({ roomId }: UsePollsOptions) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<any>(null);

  // Initialize socket for poll updates
  useEffect(() => {
    const initSocket = async () => {
      try {
        const socket = await getSocket();
        socketRef.current = socket;
        
        // Listen for poll updates
        socket.on(`poll:update:${roomId}`, (poll: Poll) => {
          setActivePoll(poll);
          setPolls(prev => {
            const existing = prev.find(p => p.id === poll.id);
            if (existing) {
              return prev.map(p => p.id === poll.id ? poll : p);
            }
            return [...prev, poll];
          });
        });
        
        socket.on(`poll:close:${roomId}`, (pollId: string) => {
          setActivePoll(null);
          setPolls(prev => prev.filter(p => p.id !== pollId));
        });
      } catch (err) {
        console.error('Failed to initialize polls socket:', err);
      }
    };
    
    initSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off(`poll:update:${roomId}`);
        socketRef.current.off(`poll:close:${roomId}`);
      }
    };
  }, [roomId]);

  // Create a new poll
  const createPoll = useCallback(async (
    question: string,
    options: string[],
    durationSeconds?: number
  ): Promise<Poll | undefined> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post<{ poll: Poll }>('/api/polls/create', {
        roomId,
        question,
        options,
        durationSeconds,
      });

      const poll = response.poll;
      setActivePoll(poll);
      setPolls(prev => [poll, ...prev]);

      // Notify others
      if (socketRef.current) {
        socketRef.current.emit('poll:create', { roomId, poll });
      }

      return poll;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create poll';
      setError(errorMessage);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  // Vote on a poll
  const vote = useCallback(async (pollId: string, optionId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post<{ poll: Poll }>('/api/polls/vote', {
        roomId,
        pollId,
        optionId,
      });

      const updatedPoll = response.poll;
      setActivePoll(updatedPoll);
      setPolls(prev => prev.map(p => p.id === pollId ? updatedPoll : p));

      // Notify others
      if (socketRef.current) {
        socketRef.current.emit('poll:vote', { roomId, pollId, optionId });
      }

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to vote';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  // Close a poll (creator or host only)
  const closePoll = useCallback(async (pollId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      await api.post('/api/polls/close', {
        roomId,
        pollId,
      });

      setActivePoll(null);
      setPolls(prev => prev.filter(p => p.id !== pollId));

      if (socketRef.current) {
        socketRef.current.emit('poll:close', { roomId, pollId });
      }

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to close poll';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  // Quick poll helpers
  const createSkipIntroPoll = useCallback(async (): Promise<Poll | undefined> => {
    return createPoll('Skip the intro?', ['Yes, skip!', 'No, watch it'], 30);
  }, [createPoll]);

  const createContinueWatchingPoll = useCallback(async (): Promise<Poll | undefined> => {
    return createPoll('What should we watch next?', ['Next Episode', 'New Show', 'Take a Break'], 60);
  }, [createPoll]);

  // Get poll by ID
  const getPoll = useCallback((pollId: string): Poll | undefined => {
    return polls.find(p => p.id === pollId) || (activePoll ?? undefined);
  }, [polls, activePoll]);

  // Check if user has voted on active poll
  const hasVoted = useCallback((): boolean => {
    if (!activePoll) return false;
    return activePoll.voted;
  }, [activePoll]);

  return {
    polls,
    activePoll,
    isLoading,
    error,
    createPoll,
    vote,
    closePoll,
    createSkipIntroPoll,
    createContinueWatchingPoll,
    getPoll,
    hasVoted,
  };
}
