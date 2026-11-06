import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf4f6", 100: "#fbe8ee", 200: "#f6d0dd", 300: "#eeabc1",
          400: "#e27b9d", 500: "#d1547c", 600: "#b93a62", 700: "#9b2d50",
          800: "#812945", 900: "#6d263d",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
