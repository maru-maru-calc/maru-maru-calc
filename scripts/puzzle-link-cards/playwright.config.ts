import { defineConfig, devices } from '@playwright/test';

// Not a test run: `npm run make:puzzle-cards` uses Playwright's browser to turn the drawing of
// each puzzle's link card into a picture file (see make.spec.ts). The same browser as the e2e
// tests, so nothing more has to be installed.
export default defineConfig({
  testDir: '.',
  timeout: 300_000,
  workers: 1,
  reporter: [['list']],
  projects: [
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], channel: process.env.PUZZLE_CARDS_CHANNEL === 'none' ? undefined : 'chrome', viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 },
    },
  ],
});
