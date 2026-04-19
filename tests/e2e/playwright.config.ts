import path from 'node:path';
import { defineConfig } from '@playwright/test';

const frontendDir =
  process.env.WATHIQ_FRONTEND_DIR
  ?? path.resolve(__dirname, '../../frontend-app');
const frontendBaseUrl =
  process.env.WATHIQ_FRONTEND_BASE_URL
  ?? 'http://127.0.0.1:4173';
const frontendPort = Number(new URL(frontendBaseUrl).port || '4173');
const apiBaseUrl =
  process.env.WATHIQ_API_BASE_URL
  ?? 'http://127.0.0.1:5005/api';
const frontendCommand = process.platform === 'win32'
  ? `npm.cmd run dev -- --host 127.0.0.1 --port ${frontendPort} --strictPort`
  : `npm run dev -- --host 127.0.0.1 --port ${frontendPort} --strictPort`;

export default defineConfig({
  testDir: './specs',
  timeout: 30_000,
  fullyParallel: false,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: frontendBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: process.env.WATHIQ_SKIP_FRONTEND_SERVER === '1'
    ? undefined
    : {
        command: frontendCommand,
        cwd: frontendDir,
        env: {
          ...process.env,
          VITE_API_BASE_URL: apiBaseUrl,
        },
        port: frontendPort,
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
});
