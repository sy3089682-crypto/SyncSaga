'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export type AccessibilityMode = 'default' | 'reduced_motion' | 'high_contrast' | 'large_text' | 'screen_reader';

export interface AccessibilitySettings {
  mode: AccessibilityMode;
  reducedMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReader: boolean;
  minimizeAnimations: boolean;
  preferDark: boolean;
  focusIndicators: boolean;
  announceMessages: boolean;
  announceReactions: boolean;
}

export interface UseAccessibilityOptions {
  defaultMode?: AccessibilityMode;
  onModeChange?: (mode: AccessibilityMode) => void;
}

export function useAccessibility(options: UseAccessibilityOptions = {}) {
  const { defaultMode = 'default', onModeChange } = options;
  
  const [settings, setSettings] = useState<AccessibilitySettings>({
    mode: defaultMode,
    reducedMotion: false,
    highContrast: false,
    largeText: false,
    screenReader: false,
    minimizeAnimations: false,
    preferDark: true,
    focusIndicators: true,
    announceMessages: false,
    announceReactions: false,
  });
  
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const announcementRef = useRef<HTMLDivElement | null>(null);

  // Apply accessibility mode
  const applyMode = useCallback((mode: AccessibilityMode) => {
    setSettings(prev => {
      const newSettings = { ...prev, mode };
      
      switch (mode) {
        case 'reduced_motion':
          newSettings.reducedMotion = true;
          newSettings.minimizeAnimations = true;
          break;
        case 'high_contrast':
          newSettings.highContrast = true;
          break;
        case 'large_text':
          newSettings.largeText = true;
          break;
        case 'screen_reader':
          newSettings.screenReader = true;
          newSettings.announceMessages = true;
          newSettings.announceReactions = true;
          break;
        default:
          break;
      }
      
      return newSettings;
    });
    
    onModeChange?.(mode);
  }, [onModeChange]);

  // Toggle reduced motion
  const toggleReducedMotion = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      reducedMotion: !prev.reducedMotion,
      minimizeAnimations: !prev.reducedMotion,
    }));
  }, []);

  // Toggle high contrast
  const toggleHighContrast = useCallback(() => {
    setSettings(prev => ({ ...prev, highContrast: !prev.highContrast }));
  }, []);

  // Toggle large text
  const toggleLargeText = useCallback(() => {
    setSettings(prev => ({ ...prev, largeText: !prev.largeText }));
  }, []);

  // Toggle screen reader
  const toggleScreenReader = useCallback(() => {
    setSettings(prev => ({
      ...prev,
      screenReader: !prev.screenReader,
      announceMessages: !prev.screenReader,
      announceReactions: !prev.screenReader,
    }));
  }, []);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setSettings(prev => ({ ...prev, preferDark: !prev.preferDark }));
  }, []);

  // Toggle focus indicators
  const toggleFocusIndicators = useCallback(() => {
    setSettings(prev => ({ ...prev, focusIndicators: !prev.focusIndicators }));
  }, []);

  // Toggle message announcements
  const toggleAnnounceMessages = useCallback(() => {
    setSettings(prev => ({ ...prev, announceMessages: !prev.announceMessages }));
  }, []);

  // Toggle reaction announcements
  const toggleAnnounceReactions = useCallback(() => {
    setSettings(prev => ({ ...prev, announceReactions: !prev.announceReactions }));
  }, []);

  // Announce message to screen reader
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncements(prev => [...prev, message].slice(-5));
    
    // Use aria-live region
    if (announcementRef.current) {
      announcementRef.current.textContent = message;
      announcementRef.current.setAttribute('aria-live', priority);
    }
  }, []);

  // Announce reaction
  const announceReaction = useCallback((username: string, emoji: string) => {
    if (settings.announceReactions) {
      announce(`${username} reacted with ${emoji}`);
    }
  }, [settings.announceReactions, announce]);

  // Announce message
  const announceMessage = useCallback((username: string, message: string) => {
    if (settings.announceMessages) {
      const truncated = message.length > 100 ? message.slice(0, 100) + '...' : message;
      announce(`${username}: ${truncated}`);
    }
  }, [settings.announceMessages, announce]);

  // Apply settings to document
  useEffect(() => {
    // Apply reduced motion
    if (settings.reducedMotion) {
      document.documentElement.style.setProperty('prefers-reduced-motion', 'reduce');
    } else {
      document.documentElement.style.removeProperty('prefers-reduced-motion');
    }
    
    // Apply high contrast
    if (settings.highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
    
    // Apply large text
    if (settings.largeText) {
      document.documentElement.style.fontSize = '18px';
    } else {
      document.documentElement.style.fontSize = '';
    }
    
    // Apply dark mode
    if (settings.preferDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    
    // Apply focus indicators
    if (settings.focusIndicators) {
      document.body.classList.add('show-focus');
    } else {
      document.body.classList.remove('show-focus');
    }
  }, [settings]);

  // Get contrast ratio
  const getContrastRatio = useCallback((): number => {
    if (settings.highContrast) return 7;
    return 4.5;
  }, [settings.highContrast]);

  // Check if animation should be reduced
  const shouldReduceMotion = useCallback((): boolean => {
    return settings.reducedMotion || settings.minimizeAnimations;
  }, [settings.reducedMotion, settings.minimizeAnimations]);

  // Get font scale
  const getFontScale = useCallback((): number => {
    if (settings.largeText) return 1.2;
    return 1;
  }, [settings.largeText]);

  // Reset to defaults
  const reset = useCallback(() => {
    setSettings({
      mode: defaultMode,
      reducedMotion: false,
      highContrast: false,
      largeText: false,
      screenReader: false,
      minimizeAnimations: false,
      preferDark: true,
      focusIndicators: true,
      announceMessages: false,
      announceReactions: false,
    });
  }, [defaultMode]);

  return {
    settings,
    announcements,
    applyMode,
    toggleReducedMotion,
    toggleHighContrast,
    toggleLargeText,
    toggleScreenReader,
    toggleDarkMode,
    toggleFocusIndicators,
    toggleAnnounceMessages,
    toggleAnnounceReactions,
    announce,
    announceReaction,
    announceMessage,
    getContrastRatio,
    shouldReduceMotion,
    getFontScale,
    reset,
  };
}
