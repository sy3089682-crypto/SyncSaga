import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          50: '#f8f9fc',
          100: '#f0f2f8',
          200: '#e2e6f0',
          300: '#c8cfdf',
          400: '#a4afc7',
          500: '#8693ad',
          600: '#6b7893',
          700: '#565f77',
          800: '#484f63',
          900: '#3d4354',
          950: '#1a1d2b',
        },
        brand: {
          50: '#f0f4ff',
          100: '#dbe4ff',
          200: '#bac8ff',
          300: '#91a7ff',
          400: '#748ffc',
          500: '#5c7cfa',
          600: '#4c6ef5',
          700: '#4263eb',
          800: '#3b5bdb',
          900: '#364fc7',
        },
        accent: {
          50: '#fff0f6',
          100: '#ffd6e7',
          200: '#faa2c1',
          300: '#f783ac',
          400: '#f06595',
          500: '#e64980',
          600: '#d6336c',
          700: '#c2255c',
          800: '#a61e4d',
          900: '#8c1941',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(92, 124, 250, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(92, 124, 250, 0.8)' },
        },
      },
    },
  },
  plugins: [],
}

export default config
