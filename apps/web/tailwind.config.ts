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
        primary: { DEFAULT: '#FF6A5B', dark: '#FF8175' },
        'accent-sync': '#79E6B2',
        'accent-cyan': '#06b6d4',
        'accent-pink': '#ec4899',
        'accent-green': '#10b981',
        background: '#0E0E10',
        surface: { DEFAULT: '#16161A', light: '#1C1C22' },
        border: 'rgba(255,255,255,.07)',
        'text-primary': '#F4F2ED',
        'text-secondary': '#B7B5B0',
        'text-muted': '#77767A',
        ink: { DEFAULT: '#F4F2ED', soft: '#B7B5B0', mute: '#77767A', faint: '#4E4D52' },
        canvas: '#0E0E10',
        coral: { DEFAULT: '#FF6A5B', hover: '#FF8175' },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        float: 'float 8s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
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
      },
    },
  },
  plugins: [],
};

export default config;
