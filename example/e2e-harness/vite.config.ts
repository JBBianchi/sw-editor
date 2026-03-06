import { defineConfig } from "vite";
import { resolve } from "node:path";

/**
 * Vite configuration for the e2e harness app.
 *
 * Resolves workspace packages from their TypeScript source so the harness
 * can be run with `pnpm dev` without a separate build step for each package.
 *
 * Sub-path aliases (e.g. `@sw-editor/editor-host-client/rete-lit`) must be
 * listed before the root-package alias so Vite matches them first.
 */
export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@sw-editor/editor-host-client/rete-lit",
        replacement: resolve(__dirname, "../../packages/editor-host-client/src/rete-lit.ts"),
      },
      {
        find: "@sw-editor/editor-host-client",
        replacement: resolve(__dirname, "../../packages/editor-host-client/src/index.ts"),
      },
      {
        find: "@sw-editor/editor-core",
        replacement: resolve(__dirname, "../../packages/editor-core/src/index.ts"),
      },
    ],
  },
  build: {
    outDir: "dist",
  },
  server: {
    port: 4173,
  },
  preview: {
    port: 4173,
  },
});
