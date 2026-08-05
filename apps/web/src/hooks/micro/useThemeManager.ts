'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto' | 'custom';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceLight: string;
  border: string;
  borderLight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  error: string;
  success: string;
  warning: string;
  info: string;
}

export interface ThemeSettings {
  mode: ThemeMode;
  customTheme?: ThemeColors;
  accentColor?: string;
  reducedMotion: boolean;
  compactMode: boolean;
  showAvatarBorders: boolean;
}

export interface UseThemeManagerOptions {
  defaultMode?: ThemeMode;
  defaultAccent?: string;
  onThemeChange?: (theme: ThemeSettings) => void;
}

export function useThemeManager(options: UseThemeManagerOptions = {}) {
  const { defaultMode = 'dark', defaultAccent = '#7c3aed', onThemeChange } = options;
  
  const [settings, setSettings] = useState<ThemeSettings>({
    mode: defaultMode,
    accentColor: defaultAccent,
    reducedMotion: false,
    compactMode: false,
    showAvatarBorders: true,
  });
  
  const [customThemes, setCustomThemes] = useState<Map<string, ThemeColors>>(new Map());
  const [isApplying, setIsApplying] = useState(false);
  
  // Default themes
  const lightTheme: ThemeColors = {
    background: '#ffffff',
    surface: '#f5f5f5',
    surfaceLight: '#ffffff',
    border: '#e0e0e0',
    borderLight: '#f0f0f0',
    textPrimary: '#1a1a1a',
    textSecondary: '#666666',
    textMuted: '#999999',
    accent: '#7c3aed',
    accentLight: '#a78bfa',
    accentDark: '#5b21b6',
    error: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
    info: '#3b82f6',
  };
  
  const darkTheme: ThemeColors = {
    background: '#0a0a0f',
    surface: '#12121a',
    surfaceLight: '#1a1a24',
    border: '#2a2a3a',
    borderLight: '#1e1e2a',
    textPrimary: '#f4f2ed',
    textSecondary: '#b7b5b0',
    textMuted: '#77767a',
    accent: '#7c3aed',
    accentLight: '#a78bfa',
    accentDark: '#5b21b6',
    error: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
    info: '#3b82f6',
  };
  
  // Apply theme to document
  const applyTheme = useCallback((themeColors: ThemeColors) => {
    setIsApplying(true);
    
    const root = document.documentElement;
    
    root.style.setProperty('--bg', themeColors.background);
    root.style.setProperty('--surface', themeColors.surface);
    root.style.setProperty('--surface-light', themeColors.surfaceLight);
    root.style.setProperty('--border', themeColors.border);
    root.style.setProperty('--border-light', themeColors.borderLight);
    root.style.setProperty('--text-primary', themeColors.textPrimary);
    root.style.setProperty('--text-secondary', themeColors.textSecondary);
    root.style.setProperty('--text-muted', themeColors.textMuted);
    root.style.setProperty('--accent', themeColors.accent);
    root.style.setProperty('--accent-light', themeColors.accentLight);
    root.style.setProperty('--accent-dark', themeColors.accentDark);
    root.style.setProperty('--error', themeColors.error);
    root.style.setProperty('--success', themeColors.success);
    root.style.setProperty('--warning', themeColors.warning);
    root.style.setProperty('--info', themeColors.info);
    
    setIsApplying(false);
  }, []);

  // Get current theme colors
  const getCurrentTheme = useCallback((): ThemeColors => {
    if (settings.mode === 'light') {
      return lightTheme;
    } else if (settings.mode === 'dark') {
      return darkTheme;
    } else if (settings.mode === 'custom' && settings.customTheme) {
      return settings.customTheme;
    } else {
      // Auto - check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? darkTheme : lightTheme;
    }
  }, [settings.mode, settings.customTheme]);

  // Set theme mode
  const setThemeMode = useCallback((mode: ThemeMode) => {
    setSettings(prev => ({ ...prev, mode }));
    onThemeChange?.({ ...settings, mode });
  }, [settings, onThemeChange]);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const newMode = settings.mode === 'dark' ? 'light' : 'dark';
    setThemeMode(newMode);
  }, [settings.mode, setThemeMode]);

  // Set custom theme
  const setCustomTheme = useCallback((name: string, colors: ThemeColors) => {
    const newThemes = new Map(customThemes);
    newThemes.set(name, colors);
    setCustomThemes(newThemes);
    
    setSettings(prev => ({ ...prev, mode: 'custom', customTheme: colors }));
    applyTheme(colors);
    onThemeChange?.({ ...settings, mode: 'custom', customTheme: colors });
  }, [customThemes, applyTheme, onThemeChange, settings]);

  // Load custom theme
  const loadCustomTheme = useCallback((name: string) => {
    const theme = customThemes.get(name);
    if (theme) {
      setSettings(prev => ({ ...prev, mode: 'custom', customTheme: theme }));
      applyTheme(theme);
      onThemeChange?.({ ...settings, mode: 'custom', customTheme: theme });
    }
  }, [customThemes, applyTheme, onThemeChange, settings]);

  // Delete custom theme
  const deleteCustomTheme = useCallback((name: string) => {
    const newThemes = new Map(customThemes);
    newThemes.delete(name);
    setCustomThemes(newThemes);
  }, [customThemes]);

  // Set accent color
  const setAccentColor = useCallback((color: string) => {
    setSettings(prev => ({ ...prev, accentColor: color }));
    
    // Update accent in current theme
    const currentTheme = getCurrentTheme();
    const updatedTheme = { ...currentTheme, accent: color, accentLight: color, accentDark: color };
    applyTheme(updatedTheme);
  }, [getCurrentTheme, applyTheme]);

  // Toggle compact mode
  const toggleCompactMode = useCallback(() => {
    setSettings(prev => ({ ...prev, compactMode: !prev.compactMode }));
  }, []);

  // Toggle avatar borders
  const toggleAvatarBorders = useCallback(() => {
    setSettings(prev => ({ ...prev, showAvatarBorders: !prev.showAvatarBorders }));
  }, []);

  // Get CSS variables
  const getCSSVariables = useCallback((): Record<string, string> => {
    const theme = getCurrentTheme();
    return {
      '--bg': theme.background,
      '--surface': theme.surface,
      '--surface-light': theme.surfaceLight,
      '--border': theme.border,
      '--border-light': theme.borderLight,
      '--text-primary': theme.textPrimary,
      '--text-secondary': theme.textSecondary,
      '--text-muted': theme.textMuted,
      '--accent': theme.accent,
      '--accent-light': theme.accentLight,
      '--accent-dark': theme.accentDark,
      '--error': theme.error,
      '--success': theme.success,
      '--warning': theme.warning,
      '--info': theme.info,
    };
  }, [getCurrentTheme]);

  // Reset to defaults
  const reset = useCallback(() => {
    setSettings({
      mode: defaultMode,
      accentColor: defaultAccent,
      reducedMotion: false,
      compactMode: false,
      showAvatarBorders: true,
    });
    applyTheme(defaultMode === 'dark' ? darkTheme : lightTheme);
  }, [defaultMode, defaultAccent, applyTheme]);

  // Check system preference
  const checkSystemPreference = useCallback((): boolean => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }, []);

  // Listen for system changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (settings.mode === 'auto') {
        const prefersDark = mediaQuery.matches;
        const theme = prefersDark ? darkTheme : lightTheme;
        applyTheme(theme);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.mode, applyTheme]);

  // Apply default theme on mount
  useEffect(() => {
    const theme = getCurrentTheme();
    applyTheme(theme);
  }, [getCurrentTheme, applyTheme]);

  return {
    settings,
    customThemes,
    isApplying,
    getCurrentTheme,
    setThemeMode,
    toggleTheme,
    setCustomTheme,
    loadCustomTheme,
    deleteCustomTheme,
    setAccentColor,
    toggleCompactMode,
    toggleAvatarBorders,
    getCSSVariables,
    checkSystemPreference,
    reset,
  };
}
