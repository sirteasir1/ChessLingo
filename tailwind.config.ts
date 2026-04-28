import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#080810",
          surface: "#0f0f1a",
          elevated: "#161624",
          card: "#1c1c30",
          hover: "#222238",
        },
        accent: {
          purple: "#7c3aed",
          violet: "#a855f7",
          gold: "#f5c518",
          gold2: "#d4a017",
          emerald: "#10b981",
          rose: "#f43f5e",
        },
        border: {
          subtle: "#2a2a45",
          default: "#353560",
          strong: "#4a4a80",
        },
        text: {
          primary: "#eeeef8",
          secondary: "#9898b8",
          muted: "#5a5a7a",
        },
      },
      fontFamily: {
        display: ["'Cinzel'", "serif"],
        body: ["'DM Sans'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(124,58,237,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,.05) 1px,transparent 1px)",
        "gold-gradient": "linear-gradient(135deg,#f5c518,#d4a017)",
        "purple-gradient": "linear-gradient(135deg,#7c3aed,#a855f7)",
        "hero-glow":
          "radial-gradient(ellipse 80% 50% at 50% -20%,rgba(124,58,237,.3),transparent)",
      },
      backgroundSize: {
        grid: "32px 32px",
      },
      animation: {
        "piece-drop": "pieceDrop .2s cubic-bezier(.34,1.56,.64,1)",
        "board-glow": "boardGlow 3s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "slide-up": "slideUp .3s ease-out",
        "fade-in": "fadeIn .2s ease-out",
        pulse2: "pulse2 2s ease-in-out infinite",
      },
      keyframes: {
        pieceDrop: {
          "0%": { transform: "scale(1.3) translateY(-8px)", opacity: "0.7" },
          "100%": { transform: "scale(1) translateY(0)", opacity: "1" },
        },
        boardGlow: {
          "0%,100%": { boxShadow: "0 0 40px rgba(124,58,237,.2)" },
          "50%": { boxShadow: "0 0 80px rgba(124,58,237,.4)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        slideUp: {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        pulse2: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      boxShadow: {
        board: "0 0 60px rgba(124,58,237,.25), 0 32px 80px rgba(0,0,0,.6)",
        card: "0 4px 24px rgba(0,0,0,.4)",
        glow: "0 0 20px rgba(124,58,237,.4)",
        "glow-gold": "0 0 20px rgba(245,197,24,.3)",
      },
    },
  },
  plugins: [],
};

export default config;
