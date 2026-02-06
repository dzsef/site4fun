const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');
const path = require('path');

module.exports = defineConfig({
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

