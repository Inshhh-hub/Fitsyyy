import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#FAF6EE",
        beige: { DEFAULT: "#EFE6D6", deep: "#E2D5BE" },
        taupe: { DEFAULT: "#8B7D6B", dark: "#5E5346" },
        charcoal: { DEFAULT: "#1F1F1F", soft: "#33312E" },
        lime: "#C8F169",
        sage: { DEFAULT: "#8FA58A", dark: "#62785E", light: "#DCE6D8" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 8px 30px -12px rgba(31,31,31,0.18)",
        lift: "0 18px 40px -16px rgba(31,31,31,0.25)",
      },
      borderRadius: { "2xl": "1.25rem", "3xl": "1.75rem" },
      keyframes: {
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: { shimmer: "shimmer 1.6s infinite" },
    },
  },
  plugins: [],
};

export default config;
