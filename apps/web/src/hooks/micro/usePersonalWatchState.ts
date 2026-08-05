'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket';

export interface PersonalWatchState {
  // Personal pause - user can pause for themselves while others continue
  isPersonalPaused: boolean;
  personalPauseStart: number | null;
  
  // Personal rewind - rewind for user only
  isPersonalRewound: boolean;
  rewindAmount: number; // seconds
  rewindStartPosition: number;
  
  // Personal volume boost
  volumeBoost: number; // 1.0 = normal, 2.0 = double
  
  // Personal playback speed (independent of room speed)
  personalSpeed: number; // 0.5 - 2.0
  
  // "Loo break" mode - pauses for user, shows countdown
  isOnBreak: boolean;
  breakEndTime: number | null;
  breakDuration: number; // seconds
}

export interface UsePersonalWatchStateOptions {
  roomId?: string;
  userId?: string;
  onStateChange?: (state: Partial<PersonalWatchState>) => void;
}

export function usePersonalWatchState(options: UsePersonalWatchStateOptions = {}) {
  const { roomId, userId, onStateChange } = options;
  
  const [state, setState] = useState<PersonalWatchState>({
    isPersonalPaused: false,
    personalPauseStart: null,
    isPersonalRewound: false,
    rewindAmount: 10,
    rewindStartPosition: 0,
    volumeBoost: 1.0,
    personalSpeed: 1.0,
    isOnBreak: false,
    breakEndTime: null,
    breakDuration: 300, // 5 minutes default
  });
  
  const socketRef = useRef<any>(null);
  const breakIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize socket
  useEffect(() => {
    const initSocket = async () => {
      try {
        const socket = await getSocket();
        socketRef.current = socket;
        
        // Listen for sync events (to know when to pause personal state)
        socket.on('sync:state', (syncState: { playback_state: string }) => {
          if (syncState.playback_state === 'playing' && state.isPersonalPaused) {
            // Room is playing but user is paused - maintain personal pause
          }
        });
        
      } catch (err) {
        console.error('Failed to initialize personal watch state:', err);
      }
    };
    
    initSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.off('sync:state');
      }
      if (breakIntervalRef.current) {
        clearInterval(breakIntervalRef.current);
      }
    };
  }, [roomId, state.isPersonalPaused]);

  // Personal pause - pause for yourself only
  const togglePersonalPause = useCallback(() => {
    setState(prev => {
      const newState = !prev.isPersonalPaused;
      return {
        ...prev,
        isPersonalPaused: newState,
        personalPauseStart: newState ? Date.now() : null,
      };
    });
    onStateChange?.({ isPersonalPaused: !state.isPersonalPaused });
  }, [state.isPersonalPaused, onStateChange]);

  // Pause for x seconds (loo break)
  const takeBreak = useCallback((durationSeconds?: number) => {
    const duration = durationSeconds || 300; // 5 min default
    const endTime = Date.now() + duration * 1000;
    
    setState(prev => ({
      ...prev,
      isOnBreak: true,
      breakEndTime: endTime,
      breakDuration: duration,
    }));
    
    onStateChange?.({ isOnBreak: true, breakEndTime: endTime });
    
    // Auto-resume when break ends
    breakIntervalRef.current = setInterval(() => {
      if (Date.now() >= endTime) {
        endBreak();
      }
    }, 1000);
    
    return endTime;
  }, [onStateChange]);

  // End break early
  const endBreak = useCallback(() => {
    if (breakIntervalRef.current) {
      clearInterval(breakIntervalRef.current);
      breakIntervalRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isOnBreak: false,
      breakEndTime: null,
    }));
    
    onStateChange?.({ isOnBreak: false, breakEndTime: null });
  }, [onStateChange]);

  // Get remaining break time
  const getBreakRemaining = useCallback((): number => {
    if (!state.breakEndTime) return 0;
    return Math.max(0, Math.ceil((state.breakEndTime - Date.now()) / 1000));
  }, [state.breakEndTime]);

  // Get break progress
  const getBreakProgress = useCallback((): number => {
    if (!state.breakEndTime || state.breakDuration === 0) return 1;
    const elapsed = (state.breakEndTime - Date.now()) / 1000;
    return Math.max(0, Math.min(1, elapsed / state.breakDuration));
  }, [state.breakEndTime, state.breakDuration]);

  // Personal rewind
  const rewind = useCallback((seconds?: number) => {
    const amount = seconds || state.rewindAmount;
    setState(prev => ({
      ...prev,
      isPersonalRewound: true,
      rewindAmount: amount,
      rewindStartPosition: prev.rewindAmount > 0 ? 0 : 0,
    }));
    
    onStateChange?.({ isPersonalRewound: true, rewindAmount: amount });
    
    // Auto-reset after 5 seconds
    setTimeout(() => {
      setState(prev => ({ ...prev, isPersonalRewound: false }));
      onStateChange?.({ isPersonalRewound: false });
    }, 5000);
    
    return amount;
  }, [state.rewindAmount, onStateChange]);

  // Set personal rewind amount
  const setRewindAmount = useCallback((seconds: number) => {
    setState(prev => ({ ...prev, rewindAmount: seconds }));
    onStateChange?.({ rewindAmount: seconds });
  }, [onStateChange]);

  // Personal volume boost
  const setVolumeBoost = useCallback((boost: number) => {
    const clamped = Math.max(1, Math.min(3, boost));
    setState(prev => ({ ...prev, volumeBoost: clamped }));
    onStateChange?.({ volumeBoost: clamped });
  }, [onStateChange]);

  // Cycle volume boost
  const cycleVolumeBoost = useCallback(() => {
    const boosts = [1, 1.25, 1.5, 2, 2.5, 3];
    const currentIndex = boosts.indexOf(state.volumeBoost);
    const nextIndex = (currentIndex + 1) % boosts.length;
    setVolumeBoost(boosts[nextIndex]);
  }, [state.volumeBoost, setVolumeBoost]);

  // Set personal speed
  const setPersonalSpeed = useCallback((speed: number) => {
    const clamped = Math.max(0.5, Math.min(2, speed));
    setState(prev => ({ ...prev, personalSpeed: clamped }));
    onStateChange?.({ personalSpeed: clamped });
  }, [onStateChange]);

  // Reset to defaults
  const reset = useCallback(() => {
    if (breakIntervalRef.current) {
      clearInterval(breakIntervalRef.current);
    }
    
    setState({
      isPersonalPaused: false,
      personalPauseStart: null,
      isPersonalRewound: false,
      rewindAmount: 10,
      rewindStartPosition: 0,
      volumeBoost: 1.0,
      personalSpeed: 1.0,
      isOnBreak: false,
      breakEndTime: null,
      breakDuration: 300,
    });
    
    onStateChange?.({});
  }, [onStateChange]);

  // Get effective speed (personal speed if set, otherwise 1)
  const getEffectiveSpeed = useCallback((): number => {
    return state.personalSpeed !== 1.0 ? state.personalSpeed : 1.0;
  }, [state.personalSpeed]);

  // Check if user is on break
  const isCurrentlyOnBreak = useCallback((): boolean => {
    if (!state.isOnBreak || !state.breakEndTime) return false;
    return Date.now() < state.breakEndTime;
  }, [state.isOnBreak, state.breakEndTime]);

  return {
    ...state,
    togglePersonalPause,
    takeBreak,
    endBreak,
    getBreakRemaining,
    getBreakProgress,
    rewind,
    setRewindAmount,
    setVolumeBoost,
    cycleVolumeBoost,
    setPersonalSpeed,
    reset,
    getEffectiveSpeed,
    isCurrentlyOnBreak,
  };
}
