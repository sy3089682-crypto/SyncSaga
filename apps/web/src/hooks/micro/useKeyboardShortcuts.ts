'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface Shortcut {
  key: string;
  modifiers?: ('ctrl' | 'meta' | 'alt' | 'shift')[];
  description: string;
  category: 'playback' | 'navigation' | 'view' | 'reactions' | 'chat' | 'general';
  action: () => void;
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  excludeTargets?: string[];
  onShortcutTriggered?: (shortcut: Shortcut) => void;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true, excludeTargets = [], onShortcutTriggered } = options;
  
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [lastTriggered, setLastTriggered] = useState<Shortcut | null>(null);
  const shortcutRefs = useRef<Map<string, Shortcut>>(new Map());
  
  // Register a shortcut
  const register = useCallback((shortcut: Shortcut) => {
    const key = getShortcutKey(shortcut);
    shortcutRefs.current.set(key, shortcut);
    setShortcuts(prev => [...prev, shortcut]);
    return key;
  }, []);

  // Unregister a shortcut
  const unregister = useCallback((shortcut: Shortcut) => {
    const key = getShortcutKey(shortcut);
    shortcutRefs.current.delete(key);
    setShortcuts(prev => prev.filter(s => getShortcutKey(s) !== key));
  }, []);

  // Unregister by key
  const unregisterByKey = useCallback((key: string) => {
    shortcutRefs.current.delete(key);
    setShortcuts(prev => prev.filter(s => getShortcutKey(s) !== key));
  }, []);

  // Get all shortcuts by category
  const getShortcutsByCategory = useCallback((category: Shortcut['category']): Shortcut[] => {
    return shortcuts.filter(s => s.category === category);
  }, [shortcuts]);

  // Check if shortcut is enabled
  const isShortcutEnabled = useCallback((shortcut: Shortcut): boolean => {
    return isEnabled && shortcutRefs.current.has(getShortcutKey(shortcut));
  }, [isEnabled]);

  // Toggle all shortcuts
  const toggleAll = useCallback(() => {
    setIsEnabled(prev => !prev);
  }, []);

  // Enable all
  const enableAll = useCallback(() => {
    setIsEnabled(true);
  }, []);

  // Disable all
  const disableAll = useCallback(() => {
    setIsEnabled(false);
  }, []);

  // Clear last triggered
  const clearLastTriggered = useCallback(() => {
    setLastTriggered(null);
  }, []);

  // Create the key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        const tagName = (e.target as HTMLElement).tagName;
        if (tagName === 'INPUT' || tagName === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) {
          return;
        }
      }
      
      if (!isEnabled) return;
      
      // Build key identifier
      const key = e.key.toLowerCase();
      const modifiers: string[] = [];
      
      if (e.ctrlKey) modifiers.push('ctrl');
      if (e.metaKey) modifiers.push('meta');
      if (e.altKey) modifiers.push('alt');
      if (e.shiftKey) modifiers.push('shift');
      
      // Skip modifier-only keys
      if (modifiers.length === 0 && ['ctrl', 'meta', 'alt', 'shift'].includes(key)) {
        return;
      }
      
      // Find matching shortcut
      for (const [shortcutKey, shortcut] of shortcutRefs.current) {
        const shortcutMods = shortcut.modifiers || [];
        const shortcutKeyLower = shortcut.key.toLowerCase();
        
        // Check if modifiers match
        const modsMatch = modifiers.length === shortcutMods.length &&
          modifiers.every(m => shortcutMods.includes(m as any));
        
        // Check if key matches
        const keyMatch = key === shortcutKeyLower || key === shortcut.key;
        
        if (modsMatch && keyMatch) {
          e.preventDefault();
          setLastTriggered(shortcut);
          onShortcutTriggered?.(shortcut);
          shortcut.action();
          return;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEnabled, onShortcutTriggered]);

  return {
    shortcuts,
    isEnabled,
    lastTriggered,
    register,
    unregister,
    unregisterByKey,
    getShortcutsByCategory,
    isShortcutEnabled,
    toggleAll,
    enableAll,
    disableAll,
    clearLastTriggered,
  };
}

// Helper to generate unique key for shortcut
function getShortcutKey(shortcut: Shortcut): string {
  const mods = (shortcut.modifiers || []).sort().join('+');
  const key = shortcut.key.toLowerCase();
  return mods ? `${mods}+${key}` : key;
}

// Default playback shortcuts
export const DEFAULT_PLAYBACK_SHORTCUTS: Omit<Shortcut, 'action'>[] = [
  { key: ' ', description: 'Play/Pause', category: 'playback' },
  { key: 'k', description: 'Play/Pause', category: 'playback' },
  { key: 'ArrowLeft', description: 'Rewind 10s', category: 'playback' },
  { key: 'ArrowRight', description: 'Forward 10s', category: 'playback' },
  { key: 'ArrowUp', description: 'Volume Up', category: 'playback' },
  { key: 'ArrowDown', description: 'Volume Down', category: 'playback' },
  { key: 'm', description: 'Mute/Unmute', category: 'playback' },
  { key: '0', description: 'Jump to start', category: 'playback' },
  { key: '1', description: 'Jump to 10%', category: 'playback' },
  { key: '2', description: 'Jump to 20%', category: 'playback' },
  { key: '3', description: 'Jump to 30%', category: 'playback' },
  { key: '4', description: 'Jump to 40%', category: 'playback' },
  { key: '5', description: 'Jump to 50%', category: 'playback' },
  { key: '6', description: 'Jump to 60%', category: 'playback' },
  { key: '7', description: 'Jump to 70%', category: 'playback' },
  { key: '8', description: 'Jump to 80%', category: 'playback' },
  { key: '9', description: 'Jump to 90%', category: 'playback' },
];

// Default navigation shortcuts
export const DEFAULT_NAVIGATION_SHORTCUTS: Omit<Shortcut, 'action'>[] = [
  { key: 'n', description: 'Next episode', category: 'navigation' },
  { key: 'p', description: 'Previous episode', category: 'navigation' },
  { key: 'Home', description: 'Go to beginning', category: 'navigation' },
  { key: 'End', description: 'Go to end', category: 'navigation' },
  { key: 'PageUp', description: 'Skip forward 1min', category: 'navigation' },
  { key: 'PageDown', description: 'Skip back 1min', category: 'navigation' },
];

// Default view shortcuts
export const DEFAULT_VIEW_SHORTCUTS: Omit<Shortcut, 'action'>[] = [
  { key: 'f', description: 'Fullscreen', category: 'view' },
  { key: 't', description: 'Theater mode', category: 'view' },
  { key: 's', description: 'Social mode', category: 'view' },
  { key: 'm', description: 'Focus mode', category: 'view' },
  { key: 'i', description: 'Toggle info panel', category: 'view' },
  { key: 'c', description: 'Toggle chat', category: 'view' },
];

// Reaction shortcuts
export const DEFAULT_REACTION_SHORTCUTS: Omit<Shortcut, 'action'>[] = [
  { key: '1', description: 'Send 😂', category: 'reactions' },
  { key: '2', description: 'Send 🔥', category: 'reactions' },
  { key: '3', description: 'Send ❤️', category: 'reactions' },
  { key: '4', description: 'Send 😱', category: 'reactions' },
  { key: '5', description: 'Send 👍', category: 'reactions' },
];
