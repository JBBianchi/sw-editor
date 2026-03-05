import { defineConfig } from "vitest/config";

/** Vitest configuration for the editor-core package. */
export default defineConfig({
  test: {
    name: "editor-core",
    globals: false,
    environment: "node",
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    passWithNoTests: true,
  },
});
