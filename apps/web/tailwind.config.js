/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        safety: { yellow: "#f5b800" },
        slate: { bg: "#0f1216", card: "#151a21" }
      }
    }
  },
  plugins: []
};
