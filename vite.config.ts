import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Permite `npx vite` na raiz do monorepo sem página em branco (404).
export default defineConfig({
  root: path.resolve(__dirname, 'web'),
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:3001', changeOrigin: true },
    },
  },
});
