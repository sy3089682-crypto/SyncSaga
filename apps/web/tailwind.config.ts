import './resolve-tailwind';
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
      },
      colors: {
        // ── The Ceremony Palette ──────────────────────────────
        // All values match globals.css CSS custom properties

        // Canvas / surface luminance stepping
        canvas: '#0B0B0E',
        surface: '#1A191C',
        elevated: '#212024',

        // Ink — warm whites (not cold)
        ink: {
          DEFAULT: '#EDE4D8',
          soft: '#A49B8E',
          mute: '#6E6660',
          faint: '#423E3A',
        },

        // The single accent — golden amber
        amber: {
          DEFAULT: '#E8A840',
          hover: '#D49A35',
          text: 'rgba(232, 168, 64, 0.92)',
          strong: 'rgba(232, 168, 64, 0.15)',
          glow: 'rgba(232, 168, 64, 0.08)',
          pulse: 'rgba(232, 168, 64, 0.25)',
        },

        // Semantic
        success: '#4AE09E',
        error: '#FCA5A5',

        // Borders — whisper-thin
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.05)',
          hover: 'rgba(255, 255, 255, 0.09)',
        },

        // Kept for backward compat — remove once all pages migrated
        primary: '#FF6A5B',
        'accent-green': '#10b981',
        'accent-cyan': '#06b6d4',
        'accent-pink': '#ec4899',
        background: '#0E0E10',
        'text-primary': '#F4F2ED',
        'text-secondary': '#B7B5B0',
        'text-muted': '#77767A',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        full: '999px',
      },
      animation: {
        float: 'float 8s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'sync-pulse': 'syncPulse 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        syncPulse: {
          '0%': { boxShadow: '0 0 0 0 rgba(232, 168, 64, 0.25)' },
          '50%': { boxShadow: '0 0 12px 4px rgba(232, 168, 64, 0.15)' },
          '100%': { boxShadow: '0 0 0 0 rgba(232, 168, 64, 0.25)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
