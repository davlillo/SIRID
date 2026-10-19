import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

/**
 * Tema derivado de davlillos-design-system/ui/tailwind-theme.js y ui/tokens.json.
 * Los hex de marca no se inventan: se copian del design system.
 *
 * Los tokens `--background`, `--primary`, etc. son los que espera shadcn/ui y se
 * mapean a la marca en `app/globals.css` para no perder la identidad visual.
 */
const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        coffee: "rgb(var(--dvl-ui-coffee) / <alpha-value>)",
        terracotta: "rgb(var(--dvl-ui-terracotta) / <alpha-value>)",
        sand: "rgb(var(--dvl-ui-sand) / <alpha-value>)",
        ivory: "rgb(var(--dvl-ui-ivory) / <alpha-value>)",
        olive: "rgb(var(--dvl-ui-olive) / <alpha-value>)",
        charcoal: "rgb(var(--dvl-ui-charcoal) / <alpha-value>)",
        state: {
          available: "rgb(var(--dvl-ui-olive) / <alpha-value>)",
          pending: "rgb(var(--dvl-ui-sand) / <alpha-value>)",
          confirmed: "rgb(var(--dvl-ui-olive) / <alpha-value>)",
          cancelled: "rgb(var(--dvl-ui-muted) / <alpha-value>)",
          completed: "rgb(var(--dvl-ui-coffee) / <alpha-value>)",
          error: "rgb(var(--dvl-ui-error) / <alpha-value>)",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
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
  plugins: [animate],
};

export default config;
