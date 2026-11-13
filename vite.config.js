import { defineConfig } from 'vite';
import { mochiApiPlugin } from './server/mochi-vite.js';
export default defineConfig({
  base: './',
  plugins: [mochiApiPlugin()],
  build: { chunkSizeWarningLimit: 650 },
});
