import type { Config } from "tailwindcss";

/**
 * RVGESHOT dizajn sustav.
 * Boje su izložene kao CSS varijable (vidi styles.css) pa rade s dark/light temom.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--rvge-bg) / <alpha-value>)",
        surface: "rgb(var(--rvge-surface) / <alpha-value>)",
        elevated: "rgb(var(--rvge-elevated) / <alpha-value>)",
        border: "rgb(var(--rvge-border) / <alpha-value>)",
        muted: "rgb(var(--rvge-muted) / <alpha-value>)",
        text: "rgb(var(--rvge-text) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--rvge-accent) / <alpha-value>)",
          soft: "rgb(var(--rvge-accent-soft) / <alpha-value>)",
        },
        danger: "rgb(var(--rvge-danger) / <alpha-value>)",
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "SF Pro Display",
          "SF Pro Text",
          "Inter",
          "system-ui",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["SF Mono", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        toolbar: "0 12px 40px rgb(0 0 0 / 0.45)",
        card: "0 8px 30px rgb(0 0 0 / 0.25)",
        glow: "0 4px 20px rgb(var(--rvge-accent) / 0.45)",
      },
      transitionTimingFunction: {
        snappy: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        pop: {
          from: { opacity: "0", transform: "scale(0.94) translateY(6px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        pop: "pop 0.18s cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
