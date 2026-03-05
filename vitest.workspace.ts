import { defineWorkspace } from "vitest/config";

/**
 * Vitest workspace configuration enumerating all packages that contain tests.
 * Packages without a `tests/` directory are omitted intentionally.
 */
export default defineWorkspace([
  {
    extends: "./vitest.config.ts",
    test: {
      name: "editor-core",
      root: "./packages/editor-core",
    },
  },
  {
    extends: "./vitest.config.ts",
    test: {
      name: "editor-web-component",
      root: "./packages/editor-web-component",
    },
  },
  {
    extends: "./vitest.config.ts",
    test: {
      name: "editor-host-client",
      root: "./packages/editor-host-client",
    },
  },
]);
