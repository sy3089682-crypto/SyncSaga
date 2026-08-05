'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export type SoundType = 
  | 'reaction'
  | 'message'
  | 'notification'
  | 'join'
  | 'leave'
  | 'host'
  | 'clip'
  | 'poll'
  | 'achievement'
  | 'error'
  | 'success';

export interface SoundConfig {
  enabled: boolean;
  volume: number; // 0-1
  reactionsEnabled: boolean;
  notificationsEnabled: boolean;
  joinLeaveEnabled: boolean;
  hostEventsEnabled: boolean;
  clipsEnabled: boolean;
}

export interface SoundSet {
  name: string;
  sounds: Record<SoundType, string>; // URL or data URI
}

export interface UseSoundEffectsOptions {
  initialVolume?: number;
  enableSounds?: boolean;
  onSoundPlay?: (type: SoundType) => void;
}

export function useSoundEffects(options: UseSoundEffectsOptions = {}) {
  const { initialVolume = 0.5, enableSounds = true, onSoundPlay } = options;
  
  const [config, setConfig] = useState<SoundConfig>({
    enabled: enableSounds,
    volume: initialVolume,
    reactionsEnabled: true,
    notificationsEnabled: true,
    joinLeaveEnabled: true,
    hostEventsEnabled: true,
    clipsEnabled: true,
  });
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSound, setCurrentSound] = useState<SoundType | null>(null);
  const [soundSet, setSoundSet] = useState<SoundSet | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioBuffersRef = useRef<Map<SoundType, AudioBuffer>>(new Map());
  const soundEnabledRef = useRef(enableSounds);

  // Initialize audio context
  const initAudio = useCallback(() => {
    if (audioContextRef.current) return;
    
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNodeRef.current = audioContextRef.current.createGain();
      gainNodeRef.current.connect(audioContextRef.current.destination);
      gainNodeRef.current.gain.value = config.volume;
    } catch (err) {
      console.error('Failed to initialize audio:', err);
    }
  }, [config.volume]);

  // Play a sound
  const playSound = useCallback(async (type: SoundType): Promise<boolean> => {
    if (!config.enabled || !soundEnabledRef.current) return false;
    
    initAudio();
    
    const ctx = audioContextRef.current;
    if (!ctx) return false;
    
    setIsPlaying(true);
    setCurrentSound(type);
    
    try {
      // Check if sound type is enabled
      const enabledChecks: Record<SoundType, boolean> = {
        reaction: config.reactionsEnabled,
        message: true, // Always allow messages
        notification: config.notificationsEnabled,
        join: config.joinLeaveEnabled,
        leave: config.joinLeaveEnabled,
        host: config.hostEventsEnabled,
        clip: config.clipsEnabled,
        poll: config.hostEventsEnabled,
        achievement: config.notificationsEnabled,
        error: true,
        success: true,
      };
      
      if (!enabledChecks[type]) {
        setIsPlaying(false);
        setCurrentSound(null);
        return false;
      }
      
      // Try to get preloaded buffer
      let buffer = audioBuffersRef.current.get(type);
      
      if (!buffer) {
        // Generate simple tone as fallback
        buffer = await generateTone(ctx, type);
        audioBuffersRef.current.set(type, buffer);
      }
      
      // Create source and play
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      
      const soundGain = ctx.createGain();
      soundGain.gain.value = config.volume;
      soundGain.connect(ctx.destination);
      source.connect(soundGain);
      
      source.start(0);
      
      // Stop after buffer duration
      source.onended = () => {
        setIsPlaying(false);
        setCurrentSound(null);
        soundGain.disconnect();
      };
      
      onSoundPlay?.(type);
      
      return true;
    } catch (err) {
      console.error('Failed to play sound:', err);
      setIsPlaying(false);
      setCurrentSound(null);
      return false;
    }
  }, [config, onSoundPlay]);

  // Generate simple tone for a sound type
  const generateTone = useCallback(async (ctx: AudioContext, type: SoundType): Promise<AudioBuffer> => {
    const sampleRate = ctx.sampleRate;
    const duration = 0.3; // 300ms
    const bufferSize = sampleRate * duration;
    
    const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);
    
    // Different frequencies for different sound types
    const frequencies: Record<SoundType, number> = {
      reaction: 880,      // A5 - happy
      message: 660,       // E5 - gentle
      notification: 440,  // A4 - notification
      join: 523,          // C5 - welcome
      leave: 392,         // G4 - goodbye
      host: 784,          // G5 - host event
      clip: 660,          // E5 - clip created
      poll: 587,          // D5 - poll created
      achievement: 1047,  // C6 - achievement
      error: 220,         // A3 - error
      success: 880,       // A5 - success
    };
    
    const frequency = frequencies[type] || 440;
    
    for (let i = 0; i < bufferSize; i++) {
      const time = i / sampleRate;
      // Sine wave with quick fade out
      const envelope = Math.exp(-time * 10);
      data[i] = Math.sin(2 * Math.PI * frequency * time) * envelope * 0.5;
    }
    
    return buffer;
  }, []);

  // Play reaction sound
  const playReaction = useCallback(() => playSound('reaction'), [playSound]);

  // Play message sound
  const playMessage = useCallback(() => playSound('message'), [playSound]);

  // Play notification sound
  const playNotification = useCallback(() => playSound('notification'), [playSound]);

  // Play join sound
  const playJoin = useCallback(() => playSound('join'), [playSound]);

  // Play leave sound
  const playLeave = useCallback(() => playSound('leave'), [playSound]);

  // Play host event sound
  const playHostEvent = useCallback(() => playSound('host'), [playSound]);

  // Play clip sound
  const playClip = useCallback(() => playSound('clip'), [playSound]);

  // Play achievement sound
  const playAchievement = useCallback(() => playSound('achievement'), [playSound]);

  // Play error sound
  const playError = useCallback(() => playSound('error'), [playSound]);

  // Play success sound
  const playSuccess = useCallback(() => playSound('success'), [playSound]);

  // Toggle all sounds
  const toggleSounds = useCallback(() => {
    setConfig(prev => ({ ...prev, enabled: !prev.enabled }));
    soundEnabledRef.current = !config.enabled;
  }, [config.enabled]);

  // Toggle reactions
  const toggleReactions = useCallback(() => {
    setConfig(prev => ({ ...prev, reactionsEnabled: !prev.reactionsEnabled }));
  }, []);

  // Toggle notifications
  const toggleNotifications = useCallback(() => {
    setConfig(prev => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }));
  }, []);

  // Toggle join/leave sounds
  const toggleJoinLeave = useCallback(() => {
    setConfig(prev => ({ ...prev, joinLeaveEnabled: !prev.joinLeaveEnabled }));
  }, []);

  // Toggle host events
  const toggleHostEvents = useCallback(() => {
    setConfig(prev => ({ ...prev, hostEventsEnabled: !prev.hostEventsEnabled }));
  }, []);

  // Toggle clips
  const toggleClips = useCallback(() => {
    setConfig(prev => ({ ...prev, clipsEnabled: !prev.clipsEnabled }));
  }, []);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    setConfig(prev => ({ ...prev, volume: clamped }));
    
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = clamped;
    }
  }, []);

  // Increase volume
  const increaseVolume = useCallback(() => {
    setVolume(Math.min(1, config.volume + 0.1));
  }, [config.volume, setVolume]);

  // Decrease volume
  const decreaseVolume = useCallback(() => {
    setVolume(Math.max(0, config.volume - 0.1));
  }, [config.volume, setVolume]);

  // Reset to defaults
  const reset = useCallback(() => {
    setConfig({
      enabled: enableSounds,
      volume: initialVolume,
      reactionsEnabled: true,
      notificationsEnabled: true,
      joinLeaveEnabled: true,
      hostEventsEnabled: true,
      clipsEnabled: true,
    });
  }, [enableSounds, initialVolume]);

  return {
    config,
    isPlaying,
    currentSound,
    initAudio,
    playSound,
    playReaction,
    playMessage,
    playNotification,
    playJoin,
    playLeave,
    playHostEvent,
    playClip,
    playAchievement,
    playError,
    playSuccess,
    toggleSounds,
    toggleReactions,
    toggleNotifications,
    toggleJoinLeave,
    toggleHostEvents,
    toggleClips,
    setVolume,
    increaseVolume,
    decreaseVolume,
    reset,
  };
}
