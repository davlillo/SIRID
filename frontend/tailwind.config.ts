import type { Config } from "tailwindcss";

/**
 * Tema derivado de davlillos-design-system/ui/tailwind-theme.js y ui/tokens.json.
 * Los hex de marca no se inventan: se copian del design system.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        coffee: "#49352C",
        terracotta: "#C65F45",
        sand: "#E8D8BE",
        ivory: "#F7F3EA",
        olive: "#65705A",
        charcoal: "#191817",
        state: {
          available: "#65705A",
          pending: "#E8D8BE",
          confirmed: "#4C5644",
          cancelled: "#6B6864",
          completed: "#49352C",
          error: "#8C2F22",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "Inter", "sans-serif"],
        sans: ["IBM Plex Sans", "Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "JetBrains Mono", "monospace"],
      },
      borderRadius: {
        xs: "2px",
        sm: "6px",
        md: "12px",
        lg: "20px",
      },
      borderWidth: {
        technical: "1.5px",
      },
      maxWidth: {
        shell: "1440px",
      },
      spacing: {
        section: "6rem",
      },
      transitionDuration: {
        fast: "120ms",
        base: "220ms",
        slow: "420ms",
      },
      transitionTimingFunction: {
        technical: "cubic-bezier(0.22, 0.61, 0.36, 1)",
      },
      backgroundImage: {
        "dvl-grid": "url('/patterns/dvl-grid.svg')",
        "dvl-topo": "url('/patterns/dvl-topo.svg')",
        "dvl-dots": "url('/patterns/dvl-dots.svg')",
      },
      keyframes: {
        "dvl-reveal": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "dvl-reveal": "dvl-reveal 420ms cubic-bezier(0.22, 0.61, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
