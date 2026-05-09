import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true, rewrite: (p) => p.replace(/^\/api/, '') },
      '/auth': { target: 'http://localhost:3001', changeOrigin: true },
      '/models': { target: 'http://localhost:3001', changeOrigin: true },
      '/documents': { target: 'http://localhost:3001', changeOrigin: true },
      '/analysis': { target: 'http://localhost:3001', changeOrigin: true },
      '/compare': { target: 'http://localhost:3001', changeOrigin: true },
      '/history': { target: 'http://localhost:3001', changeOrigin: true },
      '/field-templates': { target: 'http://localhost:3001', changeOrigin: true },
      '/prompt-templates': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
