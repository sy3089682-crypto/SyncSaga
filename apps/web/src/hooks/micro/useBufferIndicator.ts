'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface BufferState {
  isBuffering: boolean;
  buffered: number;        // 0-1 percentage
  currentTime: number;
  duration: number;
  estimatedTime: number;   // Estimated time until buffer caught up
  bufferHealth: 'good' | 'warning' | 'critical';
}

export interface UseBufferIndicatorOptions {
  onBufferStart?: () => void;
  onBufferEnd?: () => void;
  onBufferWarning?: () => void;
  checkInterval?: number;
}

export function useBufferIndicator(options: UseBufferIndicatorOptions = {}) {
  const { 
    onBufferStart, 
    onBufferEnd, 
    onBufferWarning,
    checkInterval = 1000,
  } = options;
  
  const [state, setState] = useState<BufferState>({
    isBuffering: false,
    buffered: 0,
    currentTime: 0,
    duration: 0,
    estimatedTime: 0,
    bufferHealth: 'good',
  });
  
  const [history, setHistory] = useState<{ time: number; buffered: number }[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxHistoryLength = 60;

  // Set video element
  const setVideoElement = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;
  }, []);

  // Calculate buffer health
  const calculateHealth = useCallback((buffered: number, isBuffering: boolean): 'good' | 'warning' | 'critical' => {
    if (!isBuffering) return 'good';
    if (buffered < 0.1) return 'critical';
    if (buffered < 0.3) return 'warning';
    return 'good';
  }, []);

  // Estimate time until buffer caught up
  const estimateCatchUpTime = useCallback((buffered: number, currentTime: number, duration: number): number => {
    if (duration === 0 || buffered === 0) return 0;
    
    const bufferedSeconds = buffered * duration;
    const remainingSeconds = duration - bufferedSeconds;
    const playbackRate = 1; // Assume normal speed
    
    if (remainingSeconds <= 0) return 0;
    
    // Rough estimate: time until buffer catches up
    return Math.round(remainingSeconds / playbackRate);
  }, []);

  // Update buffer state
  const updateBufferState = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const isBuffering = video.readyState < 3;
    const buffered = video.buffered.length > 0 
      ? video.buffered.end(video.buffered.length - 1) / video.duration 
      : 0;
    
    const newState: BufferState = {
      isBuffering,
      buffered: isNaN(buffered) ? 0 : buffered,
      currentTime: video.currentTime || 0,
      duration: video.duration || 0,
      estimatedTime: estimateCatchUpTime(buffered, video.currentTime, video.duration),
      bufferHealth: calculateHealth(isNaN(buffered) ? 0 : buffered, isBuffering),
    };

    setState(newState);
    
    // Track history
    setHistory(prev => {
      const newHistory = [...prev, { time: Date.now(), buffered: newState.buffered }];
      if (newHistory.length > maxHistoryLength) {
        return newHistory.slice(-maxHistoryLength);
      }
      return newHistory;
    });

    // Call callbacks
    if (isBuffering && !state.isBuffering) {
      onBufferStart?.();
    }
    
    if (!isBuffering && state.isBuffering) {
      onBufferEnd?.();
    }
    
    if (newState.bufferHealth === 'warning' && state.bufferHealth !== 'warning') {
      onBufferWarning?.();
    }
  }, [state.isBuffering, state.bufferHealth, onBufferStart, onBufferEnd, onBufferWarning, estimateCatchUpTime, calculateHealth]);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    updateBufferState();
    
    intervalRef.current = setInterval(() => {
      updateBufferState();
    }, checkInterval);
  }, [checkInterval, updateBufferState]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Get buffer percentage display
  const getBufferPercentage = useCallback((): string => {
    return `${Math.round(state.buffered * 100)}%`;
  }, [state.buffered]);

  // Get health color
  const getHealthColor = useCallback((): string => {
    switch (state.bufferHealth) {
      case 'good': return '#22c55e';
      case 'warning': return '#eab308';
      case 'critical': return '#ef4444';
      default: return '#6b7280';
    }
  }, [state.bufferHealth]);

  // Get health label
  const getHealthLabel = useCallback((): string => {
    switch (state.bufferHealth) {
      case 'good': return 'Good';
      case 'warning': return 'Low Buffer';
      case 'critical': return 'Buffering';
      default: return 'Unknown';
    }
  }, [state.bufferHealth]);

  // Reset state
  const reset = useCallback(() => {
    setState({
      isBuffering: false,
      buffered: 0,
      currentTime: 0,
      duration: 0,
      estimatedTime: 0,
      bufferHealth: 'good',
    });
    setHistory([]);
  }, []);

  // Auto-start monitoring
  useEffect(() => {
    startMonitoring();
    
    return () => {
      stopMonitoring();
    };
  }, [startMonitoring, stopMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    ...state,
    history,
    setVideoElement,
    startMonitoring,
    stopMonitoring,
    updateBufferState,
    getBufferPercentage,
    getHealthColor,
    getHealthLabel,
    reset,
  };
}
