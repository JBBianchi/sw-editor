import { defineConfig } from "vitest/config";

/** Vitest configuration for the editor-web-component package. */
export default defineConfig({
  test: {
    name: "editor-web-component",
    globals: false,
    environment: "node",
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    passWithNoTests: true,
  },
});
