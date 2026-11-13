import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';
// Matriz visual: npm run test:visual (UI_VIEWPORTS=all para as 12 larguras).
export default defineConfig({
  ...base,
  testDir: './tests/visual',
  timeout: 300000,
  use: { ...base.use, actionTimeout: 8000 },
});
