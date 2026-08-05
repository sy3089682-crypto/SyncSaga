import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0A0A0C",
        surface: "#1A1A1E",
        elevated: "#202025",
        ink: "#E8E0D5",
        "ink-soft": "#9A9488",
        "ink-mute": "#666160",
        "ink-faint": "#444048",
        amber: "#E8A840",
        "amber-hover": "#D49730",
        "amber-glow": "rgba(232,168,64,0.08)",
        "amber-strong": "rgba(232,168,64,0.15)",
        "amber-text": "rgba(232,168,64,0.90)",
        border: "rgba(255,255,255,0.05)",
        "border-hover": "rgba(255,255,255,0.09)",
        success: "#4ae09e",
        error: "#fca5a5",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontWeight: { body: "420", "ui-medium": "500" },
      borderRadius: { sm: "4px", md: "8px", lg: "12px", xl: "16px", full: "9999px" },
      spacing: { xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "24px", "2xl": "32px", "3xl": "48px" },
      boxShadow: {
        surface: "0 0 4px 0 rgba(255,255,255,0.05)",
        elevated: "0 0 8px 0 rgba(255,255,255,0.09)",
        "glow-amber": "0 0 24px 2px rgba(232,168,64,0.08)",
        "glow-amber-strong": "0 0 32px 4px rgba(232,168,64,0.15)",
      },
      keyframes: { "sync-pulse": { "0%": { boxShadow: "0 0 0 0 rgba(232,168,64,0.08)" }, "50%": { boxShadow: "0 0 10px 4px rgba(232,168,64,0.15)" }, "100%": { boxShadow: "0 0 0 0 rgba(232,168,64,0.08)" } } },
      animation: { "sync-pulse": "sync-pulse 3s ease-in-out infinite" },
      transitionTimingFunction: { spring: "cubic-bezier(.22, .61, .36, 1)" },
    },
  },
  plugins: [],
};

export default config;
