import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const target = process.env.API_TARGET || 'http://localhost:4000';
const here = (p) => fileURLToPath(new URL(p, import.meta.url));

// Статическая сборка для GitHub Pages: сервер из server/src работает прямо в браузере,
// Node-модули заменены на src/static/node. PAGES_BASE — путь сайта, например /repo/.
const pages = process.env.PAGES_BASE;
const node = (name) => here(`./src/static/node/${name}.js`);

export default defineConfig({
  base: pages || '/',
  plugins: [react()],
  resolve: {
    alias: pages
      ? {
          '@backend': here('./src/static/backend.js'),
          express: node('express'),
          'socket.io-client': node('socket-io'),
          'socket.io': node('socket-io'),
          'node:crypto': node('crypto'),
          'node:fs': node('fs'),
          'node:path': node('path'),
          'node:url': node('url'),
        }
      : { '@backend': here('./src/backend.js') },
  },
  build: pages ? { target: 'es2022' } : {},
  server: {
    port: 5173,
    proxy: {
      '/api': { target, changeOrigin: true },
      '/mock': { target, changeOrigin: true },
      '/socket.io': { target, ws: true },
    },
  },
});
