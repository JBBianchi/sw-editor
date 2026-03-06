import { defineConfig } from "vitest/config";

/** Vitest configuration for the editor-host-client package. */
export default defineConfig({
  test: {
    name: "editor-host-client",
    globals: false,
    environment: "node",
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    passWithNoTests: true,
  },
});
