'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export type SpoilerLevel = 'none' | 'safe' | 'spoiler' | 'major';

export interface SpoilerSettings {
  globalLevel: SpoilerLevel;
  autoHideReactions: boolean;
  blurThreshold: number; // minutes before spoiler expires
  blacklistedWords: string[];
  whitelistChannels: string[];
}

export interface SpoilerMessage {
  id: string;
  content: string;
  isSpoiler: boolean;
  spoilerLevel: SpoilerLevel;
  bypasses: string[]; // user IDs who can see
  createdAt: number;
  expiresAt?: number;
  blurIntensity: number; // 0-1
}

export interface UseSpoilerProtectionOptions {
  roomId?: string;
  defaultLevel?: SpoilerLevel;
  onSpoilerDetected?: (message: SpoilerMessage) => void;
}

export function useSpoilerProtection(options: UseSpoilerProtectionOptions = {}) {
  const { roomId, defaultLevel = 'safe', onSpoilerDetected } = options;
  
  const [settings, setSettings] = useState<SpoilerSettings>({
    globalLevel: defaultLevel,
    autoHideReactions: true,
    blurThreshold: 30, // 30 minutes
    blacklistedWords: ['spoiler', 'ending', 'death', 'who dies', 'finale'],
    whitelistChannels: [],
  });
  
  const [messages, setMessages] = useState<SpoilerMessage[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [showSpoilerWarning, setShowSpoilerWarning] = useState(false);
  const [currentSpoilerCount, setCurrentSpoilerCount] = useState(0);
  
  const spoilerWordsRef = useRef<Set<string>>(new Set([
    'spoiler', 'ending', 'death', 'dies', 'killed', 'defeated',
    'finale', 'season finale', 'who', 'ending explained',
    'twist', 'surprise', 'reveal', 'big reveal',
  ]));
  
  // Check if message contains spoilers
  const containsSpoiler = useCallback((content: string): { hasSpoiler: boolean; level: SpoilerLevel; words: string[] } => {
    const lowerContent = content.toLowerCase();
    const foundWords: string[] = [];
    let maxLevel: SpoilerLevel = 'none';
    
    for (const word of spoilerWordsRef.current) {
      if (lowerContent.includes(word)) {
        foundWords.push(word);
        if (word.includes('ending') || word.includes('finale')) {
          maxLevel = 'major';
        } else if (word.includes('death') || word.includes('dies') || word.includes('killed')) {
          if (maxLevel !== 'major') {
            maxLevel = 'spoiler';
          }
        } else if (maxLevel === 'none') {
          maxLevel = 'safe';
        }
      }
    }
    
    return { hasSpoiler: foundWords.length > 0, level: maxLevel, words: foundWords };
  }, []);

  // Add spoiler warning
  const addSpoilerWarning = useCallback((message: string) => {
    const analysis = containsSpoiler(message);
    if (analysis.hasSpoiler) {
      setShowSpoilerWarning(true);
      setCurrentSpoilerCount(prev => prev + 1);
      
      const spoilerMsg: SpoilerMessage = {
        id: `spoiler_${Date.now()}`,
        content: message,
        isSpoiler: true,
        spoilerLevel: analysis.level,
        bypasses: [],
        createdAt: Date.now(),
        blurIntensity: analysis.level === 'major' ? 0.9 : analysis.level === 'spoiler' ? 0.7 : 0.5,
      };
      
      setMessages(prev => [spoilerMsg, ...prev].slice(0, 100));
      onSpoilerDetected?.(spoilerMsg);
      
      return spoilerMsg;
    }
    return null;
  }, [containsSpoiler, onSpoilerDetected]);

  // Mark message as spoiler
  const markAsSpoiler = useCallback((messageId: string, level: SpoilerLevel = 'safe') => {
    setMessages(prev => prev.map(m => 
      m.id === messageId 
        ? { ...m, isSpoiler: true, spoilerLevel: level, blurIntensity: level === 'major' ? 0.9 : level === 'spoiler' ? 0.7 : 0.5 }
        : m
    ));
  }, []);

  // Remove spoiler mark
  const removeSpoilerMark = useCallback((messageId: string) => {
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, isSpoiler: false, spoilerLevel: 'none', blurIntensity: 0 } : m
    ));
  }, []);

  // Toggle spoiler visibility
  const toggleSpoilerVisibility = useCallback(() => {
    if (settings.globalLevel === 'none') {
      setSettings(prev => ({ ...prev, globalLevel: 'safe' }));
      setIsEnabled(true);
    } else if (settings.globalLevel === 'safe') {
      setSettings(prev => ({ ...prev, globalLevel: 'spoiler' }));
    } else {
      setSettings(prev => ({ ...prev, globalLevel: 'none' }));
      setIsEnabled(false);
    }
  }, [settings.globalLevel]);

  // Can user see spoiler
  const canSeeSpoiler = useCallback((spoilerMsg: SpoilerMessage, viewerSpoilerLevel: SpoilerLevel = settings.globalLevel): boolean => {
    if (!isEnabled) return true;
    
    if (viewerSpoilerLevel === 'none') return true;
    
    if (viewerSpoilerLevel === 'safe' && spoilerMsg.spoilerLevel === 'major') {
      return false;
    }
    
    if (viewerSpoilerLevel === 'spoiler' && spoilerMsg.spoilerLevel === 'major') {
      return false;
    }
    
    // Check if viewer is whitelisted
    // This would check against user IDs in real implementation
    
    return true;
  }, [isEnabled, settings.globalLevel]);

  // Get blur intensity for message
  const getBlurIntensity = useCallback((spoilerMsg: SpoilerMessage): number => {
    if (!isEnabled) return 0;
    
    const viewerLevel = settings.globalLevel;
    
    if (viewerLevel === 'none') return 0;
    if (viewerLevel === 'safe' && spoilerMsg.spoilerLevel === 'major') return spoilerMsg.blurIntensity;
    if (viewerLevel === 'spoiler' && spoilerMsg.spoilerLevel === 'major') return spoilerMsg.blurIntensity;
    if (viewerLevel === 'spoiler' && spoilerMsg.spoilerLevel === 'spoiler') return spoilerMsg.blurIntensity * 0.5;
    
    return 0;
  }, [isEnabled, settings.globalLevel]);

  // Set global spoiler level
  const setSpoilerLevel = useCallback((level: SpoilerLevel) => {
    setSettings(prev => ({ ...prev, globalLevel: level }));
    setIsEnabled(level !== 'none');
  }, []);

  // Toggle auto-hide reactions
  const toggleAutoHideReactions = useCallback(() => {
    setSettings(prev => ({ ...prev, autoHideReactions: !prev.autoHideReactions }));
  }, []);

  // Set blur threshold
  const setBlurThreshold = useCallback((minutes: number) => {
    setSettings(prev => ({ ...prev, blurThreshold: minutes }));
  }, []);

  // Add to blacklisted words
  const addBlacklistedWord = useCallback((word: string) => {
    const lowerWord = word.toLowerCase();
    spoilerWordsRef.current.add(lowerWord);
    setSettings(prev => ({
      ...prev,
      blacklistedWords: [...new Set([...prev.blacklistedWords, lowerWord])],
    }));
  }, []);

  // Remove from blacklisted words
  const removeBlacklistedWord = useCallback((word: string) => {
    const lowerWord = word.toLowerCase();
    spoilerWordsRef.current.delete(lowerWord);
    setSettings(prev => ({
      ...prev,
      blacklistedWords: prev.blacklistedWords.filter(w => w !== lowerWord),
    }));
  }, []);

  // Clear all spoiler messages
  const clearSpoilerMessages = useCallback(() => {
    setMessages([]);
    setCurrentSpoilerCount(0);
    setShowSpoilerWarning(false);
  }, []);

  // Dismiss spoiler warning
  const dismissSpoilerWarning = useCallback(() => {
    setShowSpoilerWarning(false);
  }, []);

  // Get spoiler count
  const getSpoilerCount = useCallback((): number => {
    return messages.filter(m => m.isSpoiler).length;
  }, [messages]);

  // Get active spoilers
  const getActiveSpoilers = useCallback((): SpoilerMessage[] => {
    const now = Date.now();
    const threshold = settings.blurThreshold * 60 * 1000;
    return messages.filter(m => 
      m.isSpoiler && (!m.expiresAt || m.expiresAt > now)
    );
  }, [messages, settings.blurThreshold]);

  // Reset to defaults
  const reset = useCallback(() => {
    setSettings({
      globalLevel: defaultLevel,
      autoHideReactions: true,
      blurThreshold: 30,
      blacklistedWords: [],
      whitelistChannels: [],
    });
    setIsEnabled(true);
    setMessages([]);
    setCurrentSpoilerCount(0);
    setShowSpoilerWarning(false);
  }, [defaultLevel]);

  return {
    settings,
    messages,
    isEnabled,
    showSpoilerWarning,
    currentSpoilerCount,
    containsSpoiler,
    addSpoilerWarning,
    markAsSpoiler,
    removeSpoilerMark,
    toggleSpoilerVisibility,
    canSeeSpoiler,
    getBlurIntensity,
    setSpoilerLevel,
    toggleAutoHideReactions,
    setBlurThreshold,
    addBlacklistedWord,
    removeBlacklistedWord,
    clearSpoilerMessages,
    dismissSpoilerWarning,
    getSpoilerCount,
    getActiveSpoilers,
    reset,
  };
}
