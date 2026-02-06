import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Vite configuration tailored for a React + TypeScript project with
// a simple path alias for cleaner imports.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: true,
    port: Number(process.env.VITE_PORT) || 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
    watch: {
      usePolling: process.env.VITE_USE_POLLING === 'true',
      interval: 100,
    },
    hmr: process.env.VITE_HMR_CLIENT_PORT
      ? { clientPort: Number(process.env.VITE_HMR_CLIENT_PORT) }
      : undefined,
  },
});