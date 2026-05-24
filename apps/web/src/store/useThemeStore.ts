'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light' | 'amoled' | 'sakura';

interface ThemeConfig {
  background: string;
  surface: string;
  surfaceLight: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryDark: string;
  accentCyan: string;
  accentPink: string;
  accentGreen: string;
}

const themes: Record<Theme, ThemeConfig> = {
  dark: {
    background: '#0a0a0f',
    surface: '#12121a',
    surfaceLight: '#1a1a25',
    border: '#2a2a3a',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    primary: '#8b5cf6',
    primaryDark: '#7c3aed',
    accentCyan: '#06b6d4',
    accentPink: '#ec4899',
    accentGreen: '#10b981',
  },
  light: {
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceLight: '#f1f5f9',
    border: '#e2e8f0',
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    primary: '#7c3aed',
    primaryDark: '#6d28d9',
    accentCyan: '#0891b2',
    accentPink: '#db2777',
    accentGreen: '#059669',
  },
  amoled: {
    background: '#000000',
    surface: '#0a0a0a',
    surfaceLight: '#141414',
    border: '#1a1a1a',
    text: '#f8fafc',
    textSecondary: '#6b7280',
    textMuted: '#4b5563',
    primary: '#8b5cf6',
    primaryDark: '#7c3aed',
    accentCyan: '#06b6d4',
    accentPink: '#ec4899',
    accentGreen: '#10b981',
  },
  sakura: {
    background: '#1a0f14',
    surface: '#24161c',
    surfaceLight: '#2e1a22',
    border: '#3d2430',
    text: '#fce7f3',
    textSecondary: '#f9a8d4',
    textMuted: '#be6c9c',
    primary: '#ec4899',
    primaryDark: '#db2777',
    accentCyan: '#67e8f9',
    accentPink: '#f43f5e',
    accentGreen: '#6ee7b7',
  },
};

interface ThemeState {
  theme: Theme;
  config: ThemeConfig;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'dark',
      config: themes.dark,
      setTheme: (theme) => set({ theme, config: themes[theme] }),
    }),
    { name: 'syncsaga-theme' }
  )
);

export { themes };
export type { ThemeConfig };
