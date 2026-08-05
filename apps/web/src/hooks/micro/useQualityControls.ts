'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export type VideoQuality = 'auto' | '1080p' | '720p' | '480p' | '360p';

export interface QualityOption {
  value: VideoQuality;
  label: string;
  bitrate?: number;
}

export const QUALITY_OPTIONS: QualityOption[] = [
  { value: 'auto', label: 'Auto' },
  { value: '1080p', label: '1080p', bitrate: 5000000 },
  { value: '720p', label: '720p', bitrate: 2500000 },
  { value: '480p', label: '480p', bitrate: 1000000 },
  { value: '360p', label: '360p', bitrate: 500000 },
];

export interface UseQualityControlsOptions {
  defaultQuality?: VideoQuality;
  onQualityChange?: (quality: VideoQuality) => void;
}

export function useQualityControls(options: UseQualityControlsOptions = {}) {
  const { defaultQuality = 'auto', onQualityChange } = options;
  
  const [currentQuality, setCurrentQuality] = useState<VideoQuality>(defaultQuality);
  const [isDataSaverEnabled, setDataSaverEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [availableQualities, setAvailableQualities] = useState<VideoQuality[]>(
    ['auto', '1080p', '720p', '480p', '360p']
  );
  
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Apply quality to video element
  const applyQuality = useCallback((quality: VideoQuality) => {
    setCurrentQuality(quality);
    onQualityChange?.(quality);
    
    // In a real implementation, this would switch video sources
    // For now, we just track the selected quality
    if (videoRef.current) {
      // Could adjust video source URL or player settings
      console.log('Applying quality:', quality);
    }
  }, [onQualityChange]);

  // Set video ref for quality control
  const setVideoElement = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;
  }, []);

  // Toggle data saver mode
  const toggleDataSaver = useCallback(() => {
    const newState = !isDataSaverEnabled;
    setDataSaverEnabled(newState);
    
    if (newState) {
      // In data saver mode, default to lower quality
      applyQuality('480p');
    } else {
      applyQuality('auto');
    }
    
    return newState;
  }, [isDataSaverEnabled, applyQuality]);

  // Get quality label
  const getQualityLabel = useCallback((quality: VideoQuality): string => {
    const option = QUALITY_OPTIONS.find(q => q.value === quality);
    return option?.label || quality;
  }, []);

  // Check if quality is available
  const isQualityAvailable = useCallback((quality: VideoQuality): boolean => {
    return availableQualities.includes(quality);
  }, [availableQualities]);

  // Set available qualities (for adaptive streaming)
  const setAvailable = useCallback((qualities: VideoQuality[]) => {
    setAvailableQualities(qualities);
  }, []);

  // Reset to default
  const reset = useCallback(() => {
    setCurrentQuality(defaultQuality);
    setDataSaverEnabled(false);
  }, [defaultQuality]);

  return {
    currentQuality,
    isDataSaverEnabled,
    isLoading,
    availableQualities,
    setVideoElement,
    applyQuality,
    toggleDataSaver,
    getQualityLabel,
    isQualityAvailable,
    setAvailable,
    reset,
  };
}
