import { defineConfig } from '@playwright/test'

const baseURL = 'http://127.0.0.1:1430'

export default defineConfig({
  testDir: './tests/e2e',
  // 与 Vitest 的 *.test.* 分开，浏览器测试由独立运行器执行。
  testMatch: '**/*.e2e.ts',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  outputDir: 'output/playwright/test-results',
  reporter: [['list'], ['html', { outputFolder: 'output/playwright/report', open: 'never' }]],
  use: {
    baseURL,
    browserName: 'chromium',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium-420', use: { viewport: { width: 420, height: 640 } } },
    { name: 'chromium-480', use: { viewport: { width: 480, height: 720 } } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 1430',
    url: baseURL,
    // 不接管已有开发会话，避免测试跑到用户的服务上。
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
