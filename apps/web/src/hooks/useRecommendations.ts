'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { api } from '@/lib/api';

export interface AnimeRecommendation {
  animeId: number;
  title: string;
  titleEnglish?: string;
  titleRomaji?: string;
  coverImage?: string;
  synopsis?: string;
  episodes?: number;
  averageScore?: number;
  genres?: string[];
  tags?: { name: string; type: string }[];
  reason: string;
  similarityScore: number;
  matchReason: {
    factor: string;
    description: string;
  }[];
}

export interface GroupRecommendation {
  animeId: number;
  title: string;
  coverImage?: string;
  reasons: {
    user: string;
    reason: string;
  }[];
  groupScore: number;
}

export interface WatchHistoryItem {
  animeId: number;
  title: string;
  coverImage?: string;
  watchedAt: number;
  completed: boolean;
  episodesWatched: number;
  totalEpisodes: number;
  score?: number;
  roomId?: string;
  watchedWith?: string[];
}

export interface UseRecommendationsOptions {
  userId?: string;
  friendsIds?: string[];
  onRecommend?: (anime: AnimeRecommendation) => void;
}

export function useRecommendations(options: UseRecommendationsOptions = {}) {
  const { userId, friendsIds = [] } = options;
  
  const [personalized, setPersonalized] = useState<AnimeRecommendation[]>([]);
  const [group, setGroup] = useState<GroupRecommendation[]>([]);
  const [trending, setTrending] = useState<AnimeRecommendation[]>([]);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnime, setSelectedAnime] = useState<AnimeRecommendation | null>(null);

  const isLoadingRef = useRef(false);

  // Fetch personalized recommendations
  const fetchPersonalized = useCallback(async (limit = 10): Promise<AnimeRecommendation[]> => {
    if (!userId) {
      setError('User ID required for personalized recommendations');
      return [];
    }

    setIsLoading(true);
    setError(null);
    isLoadingRef.current = true;

    try {
      const response = await api.get<{ recommendations: AnimeRecommendation[] }>(
        `/api/recommendations/personalized?userId=${userId}&limit=${limit}`
      );

      setPersonalized(response.recommendations);
      return response.recommendations;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch recommendations';
      setError(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [userId]);

  // Fetch group recommendations (based on friends' tastes)
  const fetchGroupRecommendations = useCallback(async (limit = 5): Promise<GroupRecommendation[]> => {
    if (friendsIds.length === 0) {
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get<{ recommendations: GroupRecommendation[] }>(
        `/api/recommendations/group?friendIds=${friendsIds.join(',')}&limit=${limit}`
      );

      setGroup(response.recommendations);
      return response.recommendations;
    } catch (err: unknown) {
      console.error('Failed to fetch group recommendations:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [friendsIds]);

  // Fetch trending anime
  const fetchTrending = useCallback(async (limit = 10, timeframe = 'week'): Promise<AnimeRecommendation[]> => {
    try {
      const response = await api.get<{ anime: AnimeRecommendation[] }>(
        `/api/recommendations/trending?limit=${limit}&timeframe=${timeframe}`
      );

      setTrending(response.anime);
      return response.anime;
    } catch (err) {
      console.error('Failed to fetch trending:', err);
      return [];
    }
  }, []);

  // Fetch watch history
  const fetchHistory = useCallback(async (limit = 20): Promise<WatchHistoryItem[]> => {
    if (!userId) {
      return [];
    }

    try {
      const response = await api.get<{ history: WatchHistoryItem[] }>(
        `/api/recommendations/history?userId=${userId}&limit=${limit}`
      );

      setHistory(response.history);
      return response.history;
    } catch (err) {
      console.error('Failed to fetch history:', err);
      return [];
    }
  }, [userId]);

  // Get recommendation reason
  const getRecommendationReason = useCallback((animeId: number): string => {
    const rec = personalized.find(r => r.animeId === animeId);
    if (rec?.reason) return rec.reason;
    
    const groupRec = group.find(r => r.animeId === animeId);
    if (groupRec && groupRec.reasons && groupRec.reasons.length > 0) {
      return groupRec.reasons.map(r => r.user).join(', ');
    }
    
    return 'Popular among users with similar taste';
  }, [personalized, group]);

  // Get match factors for an anime
  const getMatchFactors = useCallback((animeId: number) => {
    return personalized.find(r => r.animeId === animeId)?.matchReason || [];
  }, [personalized]);

  // Mark anime as interested
  const markInterested = useCallback(async (animeId: number, interest: 'interested' | 'not_interested') => {
    try {
      await api.post('/api/recommendations/feedback', {
        animeId,
        interest,
        userId,
      });

      // Update local state
      if (interest === 'not_interested') {
        setPersonalized(prev => prev.filter(r => r.animeId !== animeId));
      }
    } catch (err) {
      console.error('Failed to send feedback:', err);
    }
  }, [userId]);

  // Get similar anime
  const getSimilar = useCallback(async (animeId: number, limit = 5): Promise<AnimeRecommendation[]> => {
    try {
      const response = await api.get<{ similar: AnimeRecommendation[] }>(
        `/api/recommendations/similar?animeId=${animeId}&limit=${limit}`
      );

      return response.similar;
    } catch (err) {
      console.error('Failed to get similar:', err);
      return [];
    }
  }, []);

  // Select anime for more details
  const selectAnime = useCallback((anime: AnimeRecommendation | null) => {
    setSelectedAnime(anime);
  }, []);

  // Get personalized anime by Id
  const getPersonalized = useCallback((animeId: number): AnimeRecommendation | undefined => {
    return personalized.find(r => r.animeId === animeId);
  }, [personalized]);

  // Get group anime by Id
  const getGroup = useCallback((animeId: number): GroupRecommendation | undefined => {
    return group.find(r => r.animeId === animeId);
  }, [group]);

  // Trending from popular
  const trendingFromPopular = useMemo(() => {
    return trending.slice(0, 5);
  }, [trending]);

  return {
    personalized,
    group,
    trending,
    history,
    trendingFromPopular,
    isLoading,
    error,
    selectedAnime,
    fetchPersonalized,
    fetchGroupRecommendations,
    fetchTrending,
    fetchHistory,
    getRecommendationReason,
    getMatchFactors,
    markInterested,
    getSimilar,
    selectAnime,
    getPersonalized,
    getGroup,
  };
}
