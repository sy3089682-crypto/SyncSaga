import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        bg: { DEFAULT: '#0a0a0a', surface: '#111111', elevated: '#181818' },
        border: { DEFAULT: '#1f1f1f', subtle: '#161616', strong: '#2a2a2a' },
        accent: { purple: '#9333ea', cyan: '#06b6d4', pink: '#ec4899', orange: '#f97316' },
        text: { primary: '#fafafa', secondary: '#a1a1aa', muted: '#52525b', inverse: '#0a0a0a' },
        status: { success: '#22c55e', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6' },
        rank: { newcomer: '#6b7280', watcher: '#22c55e', otaku: '#3b82f6', elite: '#9333ea', legend: '#f59e0b' },
      },
    },
  },
  plugins: [typography],
};

export default config;
