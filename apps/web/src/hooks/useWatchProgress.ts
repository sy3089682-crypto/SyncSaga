import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getAccessToken } from '@/lib/supabase';
import type { WatchProgress, ContinueWatchingItem, WatchProgressUpdate, WatchProgressCreate } from '@syncsaga/shared';

export function useWatchProgress() {
  const [progress, setProgress] = useState<Record<string, any>>({});
  const [continueWatching, setContinueWatching] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const getHeaders = useCallback(async () => {
    const token = await getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }, []);

  // Fetch all watch progress for user
  const fetchProgress = useCallback(async (params?: {
    anime_id?: number;
    episode?: number;
    season?: number;
    limit?: number;
    offset?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getHeaders();
      const searchParams = new URLSearchParams();
      if (params?.anime_id) searchParams.set('anime_id', params.anime_id.toString());
      if (params?.episode) searchParams.set('episode', params.episode.toString());
      if (params?.season) searchParams.set('season', params.season.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());

      const response = await fetch(`/api/watch-progress${searchParams.toString() ? `?${searchParams.toString()}` : ''}`, {
        headers,
      });

      if (!response.ok) throw new Error('Failed to fetch watch progress');
      const data = await response.json();
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch watch progress';
      setError(message);
      console.error('Fetch progress error:', err);
      return { progress: [], total: 0 };
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  // Fetch continue watching items
  const fetchContinueWatching = useCallback(async (limit = 20) => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getHeaders();
      const response = await fetch(`/api/watch-progress/continue-watching?limit=${limit}`, { headers });

      if (!response.ok) throw new Error('Failed to fetch continue watching');
      const data = await response.json();
      setContinueWatching(data.continue_watching || []);
      return data.continue_watching || [];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch continue watching';
      setError(message);
      console.error('Fetch continue watching error:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  // Get specific progress
  const getProgress = useCallback(async (animeId: number, episode: number, season = 1) => {
    const key = `${animeId}-${episode}-${season}`;
    if (progress[key]) return progress[key];

    setLoading(true);
    setError(null);
    try {
      const headers = await getHeaders();
      const response = await fetch(`/api/watch-progress/${animeId}/${episode}/${season}`, { headers });

      if (!response.ok) throw new Error('Failed to fetch progress');
      const data = await response.json();
      if (data.progress) {
        const key = `${data.progress.anime_id}-${data.progress.episode}-${data.progress.season}`;
        setProgress(prev => ({ ...prev, [key]: data.progress }));
      }
      return data.progress;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch progress';
      setError(message);
      return null;
    } finally {
      setLoading(false)
    }
  }, [getHeaders, progress]);

  // Save/update progress
  const saveProgress = useCallback(async (update: WatchProgressUpdate) => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getHeaders();
      const response = await fetch('/api/watch-progress', {
        method: 'POST',
        headers,
        body: JSON.stringify(update),
      });

      if (!response.ok) throw new Error('Failed to save progress');
      const data = await response.json();
      
      // Update local state
      const key = `${data.progress.anime_id}-${data.progress.episode}-${data.progress.season}`;
      setProgress(prev => ({ ...prev, [key]: data.progress }));
      
      // Refresh continue watching
      fetchContinueWatching();
      
      return data.progress;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save progress';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getHeaders, fetchContinueWatching]);

  // Update progress (PATCH)
  // Update progress (PATCH)
  const updateProgress = useCallback(async (
    animeId: number,
    episode: number,
    season: number,
    update: Partial<{ timestamp: number; duration: number; completed: boolean }>
  ) => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getHeaders();
      const response = await fetch(`/api/watch-progress/${animeId}/${episode}/${season}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(update),
      });

      if (!response.ok) throw new Error('Failed to update progress');
      const data = await response.json();
      
      const key = `${animeId}-${episode}-${season}`;
      setProgress(prev => ({ ...prev, [key]: data.progress }));
      fetchContinueWatching();
      
      return data.progress;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update progress';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getHeaders, fetchContinueWatching]);

  // Delete progress
  const deleteProgress = useCallback(async (animeId: number, episode: number, season = 1) => {
    setLoading(true);
    setError(null);
    try {
      const headers = await getHeaders();
      const response = await fetch(`/api/watch-progress/${animeId}/${episode}/${season}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) throw new Error('Failed to delete progress');
      
      const key = `${animeId}-${episode}-${season}`;
      setProgress(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      fetchContinueWatching();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete progress';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [getHeaders, fetchContinueWatching]);

  // Auto-save progress with debounce
  const saveProgressDebounced = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (update: WatchProgressUpdate) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          saveProgress(update);
        }, 1000); // Debounce 1 second
      };
    })(),
    [saveProgress]
  );

  return {
    progress,
    continueWatching,
    loading,
    error,
    fetchProgress,
    fetchContinueWatching,
    getProgress,
    saveProgress,
    updateProgress,
    deleteProgress,
    saveProgressDebounced,
    setError,
  };
}

// Hook for tracking video progress in a room
export function useRoomWatchProgress(roomId: string | null) {
  const [currentProgress, setCurrentProgress] = useState<{
    timestamp: number;
    duration: number;
    episode: number;
    season: number;
    animeId: number;
    animeTitle: string;
  } | null>(null);

  // This would connect to Socket.io for real-time progress in rooms
  useEffect(() => {
    if (!roomId) return;
    
    // Socket.io listener for sync events would go here
    // Example:
    // socket.on('sync:state', (state) => { ... }
    // socket.on('anime:set_episode', (data) => { ... })
    
    return () => {
      // Cleanup socket listeners
    };
  }, [roomId]);

  return { currentProgress, setCurrentProgress };
}

export default useWatchProgress;
