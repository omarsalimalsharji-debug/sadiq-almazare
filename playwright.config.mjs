import { defineConfig } from '@playwright/test';
import { mkdtempSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempRoot = mkdtempSync(path.join(os.tmpdir(), 'farmer-friend-ui-'));
process.env.FARMER_FRIEND_UI_TMP = tempRoot;
const dataDir = path.join(tempRoot, 'data');
const mediaDir = path.join(tempRoot, 'media');
mkdirSync(dataDir, { recursive: true });
mkdirSync(mediaDir, { recursive: true });

export default defineConfig({
  testDir: './tests/ui',
  globalTeardown: './scripts/cleanup-ui-test.mjs',
  reporter: 'list',
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:4179',
    browserName: 'chromium',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm start',
    url: 'http://127.0.0.1:4179',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      PORT: '4179',
      NODE_ENV: 'test',
      DATA_DIR: dataDir,
      MEDIA_STORE_DIR: mediaDir,
      ADMIN_BOOTSTRAP_PASSWORD: 'UI-Smoke-Only-Not-A-Real-Credential-987!',
    },
  },
});
