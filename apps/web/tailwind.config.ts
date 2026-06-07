import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', './app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        bg: { DEFAULT: '#0a0a0a', surface: '#111111', elevated: '#181818', highlight: '#222222' },
        border: { DEFAULT: '#1f1f1f', subtle: '#161616', strong: '#2a2a2a' },
        accent: { 
          purple: '#9333ea', 
          cyan: '#00d4ff', 
          pink: '#ec4899', 
          orange: '#f97316',
          blue: '#3b82f6',
          green: '#22c55e'
        },
        text: { primary: '#ffffff', secondary: '#a1a1aa', muted: '#666666', inverse: '#0a0a0a' },
        status: { success: '#22c55e', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6' },
        rank: { newcomer: '#6b7280', watcher: '#22c55e', otaku: '#3b82f6', elite: '#9333ea', legend: '#f59e0b' },
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01))',
        'glass-border': 'linear-gradient(to bottom right, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.02))',
        'glow-cyan': 'radial-gradient(circle at center, rgba(0, 212, 255, 0.15) 0%, transparent 70%)',
        'glow-purple': 'radial-gradient(circle at center, rgba(147, 51, 234, 0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        'glow-sm': '0 0 10px rgba(0, 212, 255, 0.2)',
        'glow-md': '0 0 20px rgba(0, 212, 255, 0.3)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 15px rgba(0, 212, 255, 0.5)' },
          '50%': { opacity: '.7', boxShadow: '0 0 5px rgba(0, 212, 255, 0.2)' },
        },
      },
    },
  },
  plugins: [typography],
};

export default config;
