import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const externalServer = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalServer || 'http://127.0.0.1:8765';

export default defineConfig({
  testDir: './tests',
  testMatch: 'browser.spec.js',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    baseURL,
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: externalServer ? undefined : {
    command: 'python -m http.server 8765 --bind 127.0.0.1',
    cwd: fileURLToPath(new URL('.', import.meta.url)),
    url: 'http://127.0.0.1:8765/produk.html',
    reuseExistingServer: false,
    timeout: 20000,
  },
});
