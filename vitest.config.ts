import { defineConfig, defineProject } from "vitest/config";

/** Shared base configuration for all workspace projects. */
export default defineConfig({
  test: {
    globals: false,
    environment: "node",
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    passWithNoTests: true,
    projects: [
      defineProject({
        test: {
          name: "editor-core",
          root: "./packages/editor-core",
        },
      }),
      defineProject({
        test: {
          name: "editor-web-component",
          root: "./packages/editor-web-component",
        },
      }),
      defineProject({
        test: {
          name: "editor-host-client",
          root: "./packages/editor-host-client",
        },
      }),
    ],
  },
});
