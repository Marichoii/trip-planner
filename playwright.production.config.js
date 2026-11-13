import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';
export default defineConfig({
  ...base,
  testDir: './tests/production',
  use: { ...base.use, baseURL: 'http://127.0.0.1:4173/trip-planner/', reducedMotion: 'reduce' },
  webServer: {
    command: 'node tests/serve-dist.mjs',
    url: 'http://127.0.0.1:4173/trip-planner/',
    reuseExistingServer: false,
  },
});
