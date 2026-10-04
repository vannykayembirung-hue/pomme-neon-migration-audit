import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3100'
const local = !process.env.QA_BASE_URL

export default defineConfig({
  testDir: './e2e',
  testMatch: process.env.QA_SMOKE ? /smoke\.spec\.ts/ : /(?!smoke).*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list'], ['json', { outputFile: 'qa-output/playwright.json' }]],
  use: { baseURL, ...devices['Pixel 7'], trace: 'retain-on-failure' },
  webServer: local
    ? [
        { command: 'node e2e/mock-resend.mjs', url: 'http://127.0.0.1:4010/sent', reuseExistingServer: true },
        {
          command: 'pnpm exec next start -p 3100',
          url: 'http://127.0.0.1:3100/offline',
          reuseExistingServer: true,
          env: {
            NEXT_DIST_DIR: '.next-qa',
            RESEND_API_URL: 'http://127.0.0.1:4010/emails',
            RESEND_API_KEY: 'qa-key',
            NEWSLETTER_FROM: 'Pomme <hello@pomme-qa.example>',
            CRON_SECRET: 'qa-cron-secret',
            ADMIN_TOKEN: 'qa-admin-token',
          },
        },
      ]
    : undefined,
})
