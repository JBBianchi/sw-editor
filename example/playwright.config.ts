import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright end-to-end test configuration for the example apps.
 *
 * Spins up a Vite dev server for each example before running tests:
 *   - `example/vanilla-js/` on port 5174
 *   - `example/host-events/` on port 5175
 *
 * Run with:
 *   pnpm exec playwright test --config example/playwright.config.ts
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    [
      "html",
      { open: "never", outputFolder: path.join(__dirname, "../playwright-report-examples") },
    ],
  ],
  projects: [
    {
      name: "vanilla-js",
      testMatch: "**/vanilla-js.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:5174",
      },
    },
    {
      name: "host-events",
      testMatch: "**/host-events.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:5175",
      },
    },
  ],
  webServer: [
    {
      command: "pnpm exec vite --port 5174",
      cwd: path.join(__dirname, "vanilla-js"),
      port: 5174,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: "pnpm exec vite --port 5175",
      cwd: path.join(__dirname, "host-events"),
      port: 5175,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
