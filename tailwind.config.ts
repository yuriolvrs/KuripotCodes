import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

function withAlpha(varName: string) {
  return `oklch(var(${varName}) / <alpha-value>)`;
}

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        border: withAlpha("--border"),
        input: withAlpha("--input"),
        ring: withAlpha("--ring"),
        background: withAlpha("--background"),
        foreground: withAlpha("--foreground"),
        paper: withAlpha("--paper"),
        ink: {
          DEFAULT: withAlpha("--ink"),
          soft: withAlpha("--ink-soft")
        },
        line: withAlpha("--line"),
        skeleton: withAlpha("--skeleton"),
        brand: {
          DEFAULT: withAlpha("--brand"),
          foreground: withAlpha("--brand-foreground")
        },
        family: {
          rides: withAlpha("--family-rides"),
          delivery: withAlpha("--family-delivery"),
          shopping: withAlpha("--family-shopping")
        },
        status: {
          active: withAlpha("--status-active"),
          expiring: withAlpha("--status-expiring"),
          expired: withAlpha("--status-expired"),
          unknown: withAlpha("--status-unknown")
        },
        destructive: {
          DEFAULT: withAlpha("--destructive"),
          foreground: withAlpha("--destructive-foreground")
        },
        muted: {
          DEFAULT: withAlpha("--muted"),
          foreground: withAlpha("--muted-foreground")
        },
        popover: {
          DEFAULT: withAlpha("--popover"),
          foreground: withAlpha("--popover-foreground")
        },
        card: {
          DEFAULT: withAlpha("--card"),
          foreground: withAlpha("--foreground")
        }
      },
      fontFamily: {
        display: ["var(--font-display)"],
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"]
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "var(--radius)",
        sm: "var(--radius)"
      }
    }
  },
  plugins: [animate]
};

export default config;
