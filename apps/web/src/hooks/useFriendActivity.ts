'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

export interface FriendActivity {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  activity: 'watching' | 'completed' | 'rated' | 'commented' | 'joined_room' | 'hosted_room';
  details: {
    animeId?: number;
    animeTitle?: string;
    animeCover?: string;
    episode?: number;
    roomId?: string;
    roomName?: string;
    rating?: number;
    comment?: string;
  };
  timestamp: number;
  roomUrl?: string;
}

export interface Friend {
  id: string;
  username: string;
  avatarUrl?: string;
  isOnline: boolean;
  currentlyWatching?: {
    animeId: number;
    animeTitle: string;
    animeCover: string;
    episode: number;
    roomId?: string;
  };
  lastActive: number;
  friendshipDate: number;
}

export interface UseFriendActivityOptions {
  userId?: string;
  friendIds?: string[];
  onActivity?: (activity: FriendActivity) => void;
}

export function useFriendActivity(options: UseFriendActivityOptions = {}) {
  const { userId, friendIds = [], onActivity } = options;
  
  const [activities, setActivities] = useState<FriendActivity[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [onlineFriends, setOnlineFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<any>(null);
  const activityCountRef = useRef(0);

  // Initialize socket
  useEffect(() => {
    const initSocket = async () => {
      try {
        const socket = await getSocket();
        socketRef.current = socket;
        
        // Listen for new activities
        socket.on('friend:activity', (activity: FriendActivity) => {
          if (friendIds.includes(activity.userId) || activity.userId === userId) {
            setActivities(prev => {
              const existing = prev.find(a => a.id === activity.id);
              if (existing) {
                return prev.map(a => a.id === activity.id ? activity : a);
              }
              return [activity, ...prev].slice(0, 100); // Keep last 100 activities
            });
            onActivity?.(activity);
          }
        });
        
        // Listen for friend online/offline
        socket.on('friend:status', ({ userId: friendId, isOnline }: { userId: string; isOnline: boolean }) => {
          setFriends(prev => prev.map(f => 
            f.id === friendId ? { ...f, isOnline } : f
          ));
          setOnlineFriends(prev => {
            if (isOnline) {
              const friend = prev.find(f => f.id === friendId);
              return friend ? [...prev, friend] : prev;
            }
            return prev.filter(f => f.id !== friendId);
          });
        });
        
        // Listen for friend currently watching
        socket.on('friend:watching', (data: { userId: string; watching: Friend['currentlyWatching'] }) => {
          setFriends(prev => prev.map(f => 
            f.id === data.userId ? { ...f, currentlyWatching: data.watching } : f
          ));
        });
        
      } catch (err) {
        console.error('Failed to initialize friend activity socket:', err);
      }
    };
    
    initSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off('friend:activity');
        socketRef.current.off('friend:status');
        socketRef.current.off('friend:watching');
      }
    };
  }, [friendIds, userId, onActivity]);

  // Fetch friend activities
  const fetchActivities = useCallback(async (limit = 50): Promise<FriendActivity[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get<{ activities: FriendActivity[] }>(
        `/api/friends/activity?friendIds=${friendIds.join(',')}&limit=${limit}`
      );

      setActivities(response.activities);
      return response.activities;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch activities';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [friendIds]);

  // Fetch friends list
  const fetchFriends = useCallback(async (): Promise<Friend[]> => {
    if (!userId) {
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get<{ friends: Friend[] }>(`/api/friends?userId=${userId}`);

      setFriends(response.friends);
      setOnlineFriends(response.friends.filter(f => f.isOnline));
      return response.friends;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch friends';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Add friend
  const addFriend = useCallback(async (friendUsername: string): Promise<Friend | null> => {
    if (!userId) return null;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post<{ friend: Friend }>('/api/friends/add', {
        userId,
        username: friendUsername,
      });

      const newFriend = response.friend;
      setFriends(prev => [...prev, newFriend]);
      
      if (newFriend.isOnline) {
        setOnlineFriends(prev => [...prev, newFriend]);
      }

      return newFriend;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add friend';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Remove friend
  const removeFriend = useCallback(async (friendId: string): Promise<boolean> => {
    try {
      await api.post('/api/friends/remove', { friendId });

      setFriends(prev => prev.filter(f => f.id !== friendId));
      setOnlineFriends(prev => prev.filter(f => f.id !== friendId));

      return true;
    } catch (err) {
      console.error('Failed to remove friend:', err);
      return false;
    }
  }, []);

  // Get friend by ID
  const getFriend = useCallback((friendId: string): Friend | undefined => {
    return friends.find(f => f.id === friendId);
  }, [friends]);

  // Get friend activities for specific anime
  const getAnimeActivities = useCallback((animeId: number): FriendActivity[] => {
    return activities.filter(a => a.details.animeId === animeId);
  }, [activities]);

  // Get currently watching friends
  const getCurrentlyWatching = useCallback((): Friend[] => {
    return friends.filter(f => f.currentlyWatching !== undefined);
  }, [friends]);

  // Get online friends count
  const getOnlineCount = useCallback((): number => {
    return onlineFriends.length;
  }, [onlineFriends]);

  // Check if friend is online
  const isFriendOnline = useCallback((friendId: string): boolean => {
    return onlineFriends.some(f => f.id === friendId);
  }, [onlineFriends]);

  // Get activities for specific room
  const getRoomActivities = useCallback((roomId: string): FriendActivity[] => {
    return activities.filter(a => a.details.roomId === roomId);
  }, [activities]);

  // Clear activities
  const clearActivities = useCallback(() => {
    setActivities([]);
  }, []);

  return {
    activities,
    friends,
    onlineFriends,
    isLoading,
    error,
    fetchActivities,
    fetchFriends,
    addFriend,
    removeFriend,
    getFriend,
    getAnimeActivities,
    getCurrentlyWatching,
    getOnlineCount,
    isFriendOnline,
    getRoomActivities,
    clearActivities,
  };
}
