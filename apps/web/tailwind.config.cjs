/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#f5b800',
        },
        dark: {
          900: '#0c0c0c',
          800: '#1a1a1a',
          700: '#333333',
        },
      },
    },
  },
  plugins: [],
};