import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // Dev server proxy: backend runs on port 3000 in dev (tsx watch).
        // Production: nginx on :80 proxies /api → backend:3000.
        // Set MG_API_URL=http://localhost for production sim CLI uploads.
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
