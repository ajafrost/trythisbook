import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Modeled on Slow Down Creative: warm-white ground, soft near-black ink,
        // a muted apricot as the one warm accent, powder blue as the soft second.
        paper: "#fbf9f1",
        "paper-deep": "#f1ecdd",
        ink: "#2c2a26",
        "ink-soft": "#6b655c",
        "ink-faint": "#9a9488",
        accent: "#b1774a", // muted clay — a deeper sibling of the sand/beige
        "accent-deep": "#8f5d36", // darker clay for links, text, hover
        "accent-2": "#9fbecd", // powder blue
        sand: "#d9d1c1", // warm beige — primary button surface
        "sand-deep": "#cbc1af", // beige button hover
        line: "#e6dfce",
        peach: "#f2d6b3", // soft decorative peach (the hero circle)
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "Cambria", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      // subtle honeycomb pattern for the paper ground (from the sage inspiration)
      backgroundImage: {
        honeycomb:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='96' viewBox='0 0 56 96'%3E%3Cg fill='none' stroke='%232c7a4d' stroke-opacity='0.07' stroke-width='1.4'%3E%3Cpath d='M28 0l24 14v28L28 56 4 42V14z'/%3E%3Cpath d='M28 48l24 14v28L28 104 4 90V62z'/%3E%3C/g%3E%3C/svg%3E\")",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.4s ease both",
        "pop-in": "pop-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};

export default config;
