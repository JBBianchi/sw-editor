import { defineConfig } from "vitest/config";

/** Shared base configuration for all workspace packages. */
export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    passWithNoTests: true,
  },
});
