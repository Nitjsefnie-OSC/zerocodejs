import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    // PW_SLOWMO=500 npx playwright test --headed のように操作を遅くして目視できる
    launchOptions: { slowMo: Number(process.env.PW_SLOWMO ?? 0) }
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    // リッチテキストは Shadow DOM 内の contenteditable のブラウザ差が大きいため3ブラウザで検証する
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: /rich-text-.*\.spec\.ts/
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /rich-text-.*\.spec\.ts/
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173/test-cms.html',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});
