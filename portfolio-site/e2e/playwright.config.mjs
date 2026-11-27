import { defineConfig, findChromiumExecutable } from './pw.mjs';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const executablePath = findChromiumExecutable();

export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.PW_WORKERS ? Number.parseInt(process.env.PW_WORKERS, 10) : 2,
  timeout: 30_000,
  expect: {
    timeout: 7_500,
  },
  reporter: 'list',
  use: {
    baseURL,
    headless: true,
    launchOptions: executablePath ? { executablePath } : {},
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        viewport: { width: 1440, height: 900 },
        isMobile: false,
        hasTouch: false,
      },
    },
    {
      name: 'mobile',
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
