import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 180_000,
  expect: { timeout: 20_000 },
  workers: 1,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH,
      args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
    screenshot: 'only-on-failure',
  },
  // Test a production snapshot so ongoing edits cannot reload an active physics test.
  webServer: { command: 'npm run build && npm run preview -- --port 4173', url: 'http://localhost:4173', reuseExistingServer: false, timeout: 120_000 },
});
