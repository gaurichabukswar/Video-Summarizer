import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#F5EFE0",
        "cream-dark": "#EDE5D0",
        coral: {
          DEFAULT: "#D95740",
          dark: "#C04A35",
          light: "#F5DDD9",
        },
        ink: "#1A1008",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "4px 4px 0px 0px #1A1008",
        "card-sm": "3px 3px 0px 0px #1A1008",
        "card-lg": "6px 6px 0px 0px #1A1008",
        "btn": "3px 3px 0px 0px #9B2D1A",
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
        "fade-up": "fadeUp 0.4s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
