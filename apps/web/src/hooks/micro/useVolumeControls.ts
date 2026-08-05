'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface VolumeState {
  master: number;        // 0-1
  voiceChat: number;     // 0-1
  mediaVolume: number;   // 0-1
  isMuted: boolean;
  isVoiceMuted: boolean;
}

export interface UseVolumeControlsOptions {
  initialMaster?: number;
  initialVoice?: number;
  initialMedia?: number;
  onVolumeChange?: (state: VolumeState) => void;
}

export function useVolumeControls(options: UseVolumeControlsOptions = {}) {
  const { 
    initialMaster = 1, 
    initialVoice = 1, 
    initialMedia = 1,
    onVolumeChange 
  } = options;
  
  const [volume, setVolume] = useState<VolumeState>({
    master: initialMaster,
    voiceChat: initialVoice,
    mediaVolume: initialMedia,
    isMuted: false,
    isVoiceMuted: false,
  });
  
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Set master volume
  const setMasterVolume = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setVolume(prev => ({
      ...prev,
      master: clamped,
      isMuted: clamped === 0,
    }));
    onVolumeChange?.({ ...volume, master: clamped, isMuted: clamped === 0 });
  }, [volume, onVolumeChange]);

  // Set voice chat volume
  const setVoiceVolume = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setVolume(prev => ({
      ...prev,
      voiceChat: clamped,
      isVoiceMuted: clamped === 0,
    }));
    onVolumeChange?.({ ...volume, voiceChat: clamped, isVoiceMuted: clamped === 0 });
  }, [volume, onVolumeChange]);

  // Set media volume
  const setMediaVolume = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setVolume(prev => ({
      ...prev,
      mediaVolume: clamped,
    }));
    onVolumeChange?.({ ...volume, mediaVolume: clamped });
  }, [volume, onVolumeChange]);

  // Toggle master mute
  const toggleMute = useCallback(() => {
    setVolume(prev => {
      const newMuted = !prev.isMuted;
      return {
        ...prev,
        isMuted: newMuted,
        master: newMuted ? 0 : initialMaster,
      };
    });
    onVolumeChange?.({ ...volume, isMuted: !volume.isMuted });
  }, [volume, initialMaster, onVolumeChange]);

  // Toggle voice mute
  const toggleVoiceMute = useCallback(() => {
    setVolume(prev => {
      const newMuted = !prev.isVoiceMuted;
      return {
        ...prev,
        isVoiceMuted: newMuted,
        voiceChat: newMuted ? 0 : initialVoice,
      };
    });
    onVolumeChange?.({ ...volume, isVoiceMuted: !volume.isVoiceMuted });
  }, [volume, initialVoice, onVolumeChange]);

  // Increase volume
  const increaseVolume = useCallback((step = 0.1) => {
    const newVolume = Math.min(1, volume.master + step);
    setMasterVolume(newVolume);
  }, [volume.master, setMasterVolume]);

  // Decrease volume
  const decreaseVolume = useCallback((step = 0.1) => {
    const newVolume = Math.max(0, volume.master - step);
    setMasterVolume(newVolume);
  }, [volume.master, setMasterVolume]);

  // Quick volume presets
  const setVolumePreset = useCallback((preset: 'mute' | 'low' | 'medium' | 'high' | 'max') => {
    const presets: Record<string, number> = {
      mute: 0,
      low: 0.25,
      medium: 0.5,
      high: 0.75,
      max: 1,
    };
    setMasterVolume(presets[preset] || 1);
  }, [setMasterVolume]);

  // Reset to defaults
  const reset = useCallback(() => {
    setVolume({
      master: initialMaster,
      voiceChat: initialVoice,
      mediaVolume: initialMedia,
      isMuted: false,
      isVoiceMuted: false,
    });
  }, [initialMaster, initialVoice, initialMedia]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key) {
        case 'ArrowUp':
          if (e.altKey) {
            e.preventDefault();
            setVoiceVolume(Math.min(1, volume.voiceChat + 0.1));
          } else {
            e.preventDefault();
            increaseVolume();
          }
          break;
        case 'ArrowDown':
          if (e.altKey) {
            e.preventDefault();
            setVoiceVolume(Math.max(0, volume.voiceChat - 0.1));
          } else {
            e.preventDefault();
            decreaseVolume();
          }
          break;
        case 'm':
        case 'M':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            toggleMute();
          }
          break;
        case 'v':
        case 'V':
          if (!e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            toggleVoiceMute();
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, increaseVolume, decreaseVolume, toggleMute, toggleVoiceMute, setVoiceVolume]);

  return {
    volume,
    isUpdating,
    setMasterVolume,
    setVoiceVolume,
    setMediaVolume,
    toggleMute,
    toggleVoiceMute,
    increaseVolume,
    decreaseVolume,
    setVolumePreset,
    reset,
  };
}
