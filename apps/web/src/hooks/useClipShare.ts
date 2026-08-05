'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

export interface Clip {
  id: string;
  roomId: string;
  episodeId?: string;
  episodeTitle?: string;
  startTime: number; // seconds
  endTime: number; // seconds
  duration: number; // seconds
  videoUrl?: string;
  thumbnailUrl?: string;
  gifUrl?: string;
  reactions?: {
    userId: string;
    username: string;
    type: string;
    timestamp: number;
  }[];
  views: number;
  shares: number;
  likes: number;
  liked: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: number;
  shareUrl?: string;
  privacy: 'public' | 'unlisted' | 'private';
  tags?: string[];
}

export interface ClipCaptureOptions {
  roomId: string;
  startTime: number;
  endTime: number;
  episodeTitle?: string;
  includeReactions?: boolean;
  privacy?: 'public' | 'unlisted' | 'private';
}

export function useClipShare(roomId: string) {
  const [clips, setClips] = useState<Clip[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  
  const socketRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Initialize socket for clip updates
  useEffect(() => {
    const initSocket = async () => {
      try {
        const socket = await getSocket();
        socketRef.current = socket;
        
        socket.on(`clip:new:${roomId}`, (clip: Clip) => {
          setClips(prev => [clip, ...prev]);
        });
        
        socket.on(`clip:like:${roomId}`, ({ clipId, liked }: { clipId: string; liked: boolean }) => {
          setClips(prev => prev.map(c => 
            c.id === clipId ? { ...c, liked, likes: liked ? c.likes + 1 : c.likes - 1 } : c
          ));
        });
        
      } catch (err) {
        console.error('Failed to initialize clip socket:', err);
      }
    };
    
    initSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off(`clip:new:${roomId}`);
        socketRef.current.off(`clip:like:${roomId}`);
      }
    };
  }, [roomId]);

  // Capture a clip
  const captureClip = useCallback(async (options: ClipCaptureOptions): Promise<Clip | null> => {
    const { startTime, endTime, episodeTitle, includeReactions = true, privacy = 'public' } = options;
    
    if (endTime <= startTime) {
      setError('End time must be after start time');
      return null;
    }

    if (endTime - startTime > 60) {
      setError('Clips cannot exceed 60 seconds');
      return null;
    }

    setIsCapturing(true);
    setError(null);
    recordedChunksRef.current = [];

    try {
      // In a real implementation, this would capture from the video element
      // For now, we'll create a clip record
      
      const duration = endTime - startTime;
      const clip: Clip = {
        id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        roomId,
        startTime,
        endTime,
        duration,
        episodeTitle,
        reactions: includeReactions ? [] : undefined,
        views: 0,
        shares: 0,
        likes: 0,
        liked: false,
        createdBy: '', // Will be set by auth
        createdByName: 'You',
        createdAt: Date.now(),
        privacy,
        tags: [],
      };

      // Upload clip metadata
      const response = await api.post<{ clip: Clip }>('/api/clips', {
        roomId,
        startTime,
        endTime,
        episodeTitle,
        includeReactions,
        privacy,
      });

      const savedClip = response.clip;
      setClips(prev => [savedClip, ...prev]);

      // Notify via socket
      if (socketRef.current) {
        socketRef.current.emit('clip:create', { roomId, clip: savedClip });
      }

      setShareUrl(`${typeof window !== 'undefined' ? window.location.origin : ''}/clip/${savedClip.id}`);

      return savedClip;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to capture clip';
      setError(errorMessage);
      return null;
    } finally {
      setIsCapturing(false);
      recordedChunksRef.current = [];
    }
  }, [roomId]);

  // Share clip to social media
  const shareToSocial = useCallback(async (
    clipId: string,
    platform: 'twitter' | 'facebook' | 'discord' | 'whatsapp' | 'copy'
  ): Promise<boolean> => {
    const clip = clips.find(c => c.id === clipId);
    if (!clip) {
      setError('Clip not found');
      return false;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Generate share URL
      const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/clip/${clip.id}`;
      
      if (platform === 'copy') {
        await navigator.clipboard.writeText(shareUrl);
        return true;
      }

      // Open platform share dialog
      const urls = {
        twitter: `https://twitter.com/intent/tweet?text=Check%20out%20this%20clip%20from%20SyncSaga!&url=${encodeURIComponent(shareUrl)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
        discord: `https://discord.com/widgets/${shareUrl}`, // Would need actual embed
        whatsapp: `https://wa.me/?text=${encodeURIComponent(shareUrl)}`,
      };

      const url = urls[platform];
      if (url) {
        window.open(url, '_blank', 'width=600,height=400');
      }

      // Track share
      await api.post('/api/clips/share', { clipId, platform });

      setClips(prev => prev.map(c => 
        c.id === clipId ? { ...c, shares: c.shares + 1 } : c
      ));

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to share';
      setError(errorMessage);
      return false;
    } finally {
      setIsUploading(false);
    }
  }, [clips]);

  // Like a clip
  const likeClip = useCallback(async (clipId: string): Promise<boolean> => {
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return false;

    try {
      await api.post('/api/clips/like', { clipId });

      setClips(prev => prev.map(c => 
        c.id === clipId ? { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 } : c
      ));

      if (socketRef.current) {
        socketRef.current.emit('clip:like', { roomId, clipId, liked: !clip.liked });
      }

      return true;
    } catch (err) {
      console.error('Failed to like clip:', err);
      return false;
    }
  }, [clips, roomId]);

  // Get clip by ID
  const getClip = useCallback((clipId: string): Clip | undefined => {
    return clips.find(c => c.id === clipId);
  }, [clips]);

  // Get clips for a specific time range
  const getClipsAt = useCallback((startTime: number, endTime: number): Clip[] => {
    return clips.filter(c => 
      c.startTime <= endTime && c.endTime >= startTime
    );
  }, [clips]);

  // Get trending clips (most viewed/shared)
  const getTrendingClips = useCallback((limit = 10): Clip[] => {
    return [...clips]
      .sort((a, b) => (b.views + b.shares * 2) - (a.views + a.shares * 2))
      .slice(0, limit);
  }, [clips]);

  // Delete clip (creator only)
  const deleteClip = useCallback(async (clipId: string): Promise<boolean> => {
    setIsUploading(true);
    setError(null);

    try {
      await api.delete(`/api/clips/${clipId}`);

      setClips(prev => prev.filter(c => c.id !== clipId));
      setShareUrl(null);

      if (socketRef.current) {
        socketRef.current.emit('clip:delete', { roomId, clipId });
      }

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete clip';
      setError(errorMessage);
      return false;
    } finally {
      setIsUploading(false);
    }
  }, [roomId]);

  // Download clip as GIF (if supported)
  const downloadAsGif = useCallback(async (clipId: string): Promise<boolean> => {
    // This would require server-side GIF generation
    setError('GIF generation not available');
    return false;
  }, []);

  return {
    clips,
    isCapturing,
    isUploading,
    error,
    shareUrl,
    captureClip,
    shareToSocial,
    likeClip,
    getClip,
    getClipsAt,
    getTrendingClips,
    deleteClip,
    downloadAsGif,
  };
}
