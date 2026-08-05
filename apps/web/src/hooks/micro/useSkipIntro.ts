'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

export interface IntroSegment {
  id: string;
  startTime: number;
  endTime: number;
  type: 'op' | 'ed' | 'preview' | 'special';
  title?: string;
  canSkip: boolean;
  skipped: boolean;
}

export interface UseSkipIntroOptions {
  roomId?: string;
  episodeId?: string;
  autoDetect?: boolean;
  onIntroDetected?: (segments: IntroSegment[]) => void;
  onIntroSkipped?: (segments: IntroSegment[]) => void;
}

export function useSkipIntro(options: UseSkipIntroOptions = {}) {
  const { 
    roomId, 
    episodeId, 
    autoDetect = true,
    onIntroDetected,
    onIntroSkipped,
  } = options;
  
  const [segments, setSegments] = useState<IntroSegment[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [hasSkipped, setHasSkipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userPreferences, setUserPreferences] = useState<{
    skipOp: boolean;
    skipEd: boolean;
    skipPreview: boolean;
    rememberChoice: boolean;
  }>({
    skipOp: true,
    skipEd: false,
    skipPreview: true,
    rememberChoice: true,
  });
  
  const socketRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectedRef = useRef(false);

  // Set video element
  const setVideoElement = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;
  }, []);

  // Detect intro segments
  const detectIntros = useCallback(async (): Promise<IntroSegment[]> => {
    if (!episodeId) {
      setError('Episode ID required for detection');
      return [];
    }

    setIsDetecting(true);
    setError(null);

    try {
      // Try to get from API first
      const url = `/api/skip-intro/detect?episodeId=${episodeId}`;
      const response = await api.get<{ segments: IntroSegment[] }>(url);

      const detectedSegments = response.segments;
      setSegments(detectedSegments);
      detectedRef.current = true;
      onIntroDetected?.(detectedSegments);

      return detectedSegments;
    } catch (err: unknown) {
      // Fallback to default segments if API fails
      console.warn('Using default intro segments:', err);
      const defaultSegments: IntroSegment[] = [
        {
          id: 'op_default',
          startTime: 0,
          endTime: 90,
          type: 'op',
          title: 'Opening',
          canSkip: true,
          skipped: false,
        },
        {
          id: 'ed_default',
          startTime: 0,
          endTime: 0,
          type: 'ed',
          title: 'Ending',
          canSkip: false,
          skipped: false,
        },
      ];
      
      setSegments(defaultSegments);
      onIntroDetected?.(defaultSegments);
      return defaultSegments;
    } finally {
      setIsDetecting(false);
    }
  }, [episodeId, onIntroDetected]);

  // Skip intro
  const skipIntro = useCallback(async (segmentId: string): Promise<boolean> => {
    const segment = segments.find(s => s.id === segmentId);
    if (!segment) {
      setError('Segment not found');
      return false;
    }

    if (!segment.canSkip) {
      setError('This segment cannot be skipped');
      return false;
    }

    setIsSkipping(true);
    setError(null);

    try {
      // Seek past the intro
      if (videoRef.current) {
        videoRef.current.currentTime = segment.endTime;
      }

      // Update segment state
      setSegments(prev => prev.map(s => 
        s.id === segmentId ? { ...s, skipped: true } : s
      ));

      setHasSkipped(true);

      // Notify via socket if in room
      if (roomId && socketRef.current) {
        socketRef.current.emit('skip:intro', {
          roomId,
          segmentId,
          skippedBy: 'current_user',
        });
      }

      onIntroSkipped?.(segments.filter(s => s.skipped));

      // Remember preference
      if (userPreferences.rememberChoice) {
        if (segment.type === 'op') {
          setUserPreferences(prev => ({ ...prev, skipOp: true }));
        } else if (segment.type === 'ed') {
          setUserPreferences(prev => ({ ...prev, skipEd: true }));
        }
      }

      return true;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to skip intro';
      setError(errorMessage);
      return false;
    } finally {
      setIsSkipping(false);
    }
  }, [segments, roomId, userPreferences.rememberChoice, onIntroSkipped]);

  // Skip all skips
  const skipAll = useCallback(async (): Promise<string[]> => {
    const skippable = segments.filter(s => s.canSkip && !s.skipped);
    const skippedIds: string[] = [];

    for (const segment of skippable) {
      const success = await skipIntro(segment.id);
      if (success) {
        skippedIds.push(segment.id);
      }
    }

    return skippedIds;
  }, [segments, skipIntro]);

  // Show skip button
  const shouldShowSkipButton = useCallback((segment: IntroSegment): boolean => {
    if (!segment.canSkip || segment.skipped) return false;
    
    // Check user preferences
    switch (segment.type) {
      case 'op':
        return userPreferences.skipOp;
      case 'ed':
        return userPreferences.skipEd;
      case 'preview':
        return userPreferences.skipPreview;
      default:
        return true;
    }
  }, [userPreferences]);

  // Get skip button text
  const getSkipButtonText = useCallback((segment: IntroSegment): string => {
    switch (segment.type) {
      case 'op':
        return 'Skip Intro';
      case 'ed':
        return 'Skip Ending';
      case 'preview':
        return 'Skip Preview';
      default:
        return 'Skip';
    }
  }, []);

  // Get segment progress
  const getSegmentProgress = useCallback((segment: IntroSegment): number => {
    if (!videoRef.current) return 0;
    
    const current = videoRef.current.currentTime;
    const duration = segment.endTime - segment.startTime;
    
    if (duration <= 0) return 0;
    
    return Math.max(0, Math.min(1, (current - segment.startTime) / duration));
  }, []);

  // Is currently in segment
  const isInSegment = useCallback((segment: IntroSegment): boolean => {
    if (!videoRef.current) return false;
    
    const current = videoRef.current.currentTime;
    return current >= segment.startTime && current < segment.endTime;
  }, []);

  // Auto-skip when entering segment
  useEffect(() => {
    if (!autoDetect || !videoRef.current) return;

    const checkSegment = () => {
      for (const segment of segments) {
        if (segment.canSkip && !segment.skipped && isInSegment(segment)) {
          if (shouldShowSkipButton(segment) && userPreferences.rememberChoice) {
            // Auto-skip based on preference
            skipIntro(segment.id);
          }
        }
      }
    };

    videoRef.current.addEventListener('timeupdate', checkSegment);
    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('timeupdate', checkSegment);
      }
    };
  }, [segments, autoDetect, shouldShowSkipButton, userPreferences.rememberChoice, skipIntro]);

  // Update user preferences
  const updatePreferences = useCallback((updates: Partial<typeof userPreferences>) => {
    setUserPreferences(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset preferences
  const resetPreferences = useCallback(() => {
    setUserPreferences({
      skipOp: true,
      skipEd: false,
      skipPreview: true,
      rememberChoice: true,
    });
  }, []);

  // Get segments near current time
  const getActiveSegments = useCallback((currentTime?: number): IntroSegment[] => {
    const time = currentTime ?? (videoRef.current?.currentTime || 0);
    return segments.filter(s => 
      time >= s.startTime && time < s.endTime && !s.skipped
    );
  }, [segments]);

  return {
    segments,
    isDetecting,
    isSkipping,
    hasSkipped,
    error,
    userPreferences,
    setVideoElement,
    detectIntros,
    skipIntro,
    skipAll,
    shouldShowSkipButton,
    getSkipButtonText,
    getSegmentProgress,
    isInSegment,
    updatePreferences,
    resetPreferences,
    getActiveSegments,
  };
}
