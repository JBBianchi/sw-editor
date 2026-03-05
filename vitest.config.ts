import { fileURLToPath } from "node:url";
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
      defineProject({
        test: {
          name: "contract-tests",
          environment: "node",
          include: ["tests/contract/**/*.{test,spec}.{ts,tsx}"],
        },
        resolve: {
          alias: {
            "@sw-editor/editor-renderer-contract": fileURLToPath(
              new URL(
                "./packages/editor-renderer-contract/src/index.ts",
                import.meta.url,
              ),
            ),
            "@sw-editor/editor-renderer-rete-lit": fileURLToPath(
              new URL(
                "./packages/editor-renderer-rete-lit/src/index.ts",
                import.meta.url,
              ),
            ),
            "@sw-editor/editor-renderer-react-flow": fileURLToPath(
              new URL(
                "./packages/editor-renderer-react-flow/src/index.ts",
                import.meta.url,
              ),
            ),
            "@sw-editor/editor-host-client": fileURLToPath(
              new URL(
                "./packages/editor-host-client/src/index.ts",
                import.meta.url,
              ),
            ),
          },
        },
      }),
      defineProject({
        test: {
          name: "integration-tests",
          environment: "node",
          include: ["tests/integration/**/*.{test,spec}.{ts,tsx}"],
        },
        resolve: {
          alias: {
            "@sw-editor/editor-core": fileURLToPath(
              new URL(
                "./packages/editor-core/src/index.ts",
                import.meta.url,
              ),
            ),
          },
        },
      }),
    ],
  },
});
