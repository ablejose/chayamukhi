import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./config/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1c1917",
        gold: "#b8860b",
        cream: "#faf7f2",
        sand: "#f0e9df",
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
        script: ["var(--font-script)", "Segoe Script", "cursive"],
      },
      keyframes: {
        logoBounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-9px)" },
        },
      },
      animation: {
        logoBounce: "logoBounce 1.1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
