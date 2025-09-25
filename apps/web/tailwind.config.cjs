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
      keyframes: {
        orbit: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '25%': { transform: 'translate3d(5%, -10%, 0) scale(1.05)' },
          '50%': { transform: 'translate3d(-8%, 12%, 0) scale(0.98)' },
          '75%': { transform: 'translate3d(10%, -6%, 0) scale(1.04)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: 0.35, transform: 'scale(0.95)' },
          '50%': { opacity: 0.65, transform: 'scale(1.08)' },
        },
        levitate: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -12px, 0)' },
        },
        'sheen-sweep': {
          '0%': { transform: 'translateX(-120%) skewX(-12deg)', opacity: 0 },
          '40%': { opacity: 0.25 },
          '60%': { opacity: 0.25 },
          '100%': { transform: 'translateX(180%) skewX(-12deg)', opacity: 0 },
        },
        'card-pop': {
          '0%': { transform: 'scale(1) rotateX(0deg)' },
          '45%': { transform: 'scale(1.02) rotateX(8deg)' },
          '100%': { transform: 'scale(1) rotateX(0deg)' },
        },
        ripple: {
          '0%': { transform: 'scale(0.85)', opacity: 0.65 },
          '70%': { transform: 'scale(1.15)', opacity: 0 },
          '100%': { transform: 'scale(1.2)', opacity: 0 },
        },
      },
      animation: {
        orbit: 'orbit 18s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 12s ease-in-out infinite',
        'float-slow': 'levitate 16s ease-in-out infinite',
        'float-medium': 'levitate 12s ease-in-out infinite',
        sheen: 'sheen-sweep 2.6s ease-in-out infinite',
        'card-pop': 'card-pop 18s cubic-bezier(.22,1.61,.36,1) infinite',
        ripple: 'ripple 2.8s ease-out infinite',
      },
    },
  },
  plugins: [],
};
