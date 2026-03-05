import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright end-to-end test configuration.
 *
 * Tests live under `e2e/` at the repository root.
 * The development server is expected to be running on port 4173 (Vite preview default).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  /* Fail the build on CI if test.only is accidentally left in source. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only. */
  retries: process.env.CI ? 2 : 0,
  /* Single worker on CI; use available CPUs locally. */
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
