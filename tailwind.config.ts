import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        peery: {
          orange: "#F97316",
          dark: "#1A1A2E",
          navy: "#16213E",
          accent: "#0F3460",
          gold: "#E94560",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
