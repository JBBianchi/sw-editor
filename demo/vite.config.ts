import { defineConfig } from "vite";
import { resolve } from "node:path";

/**
 * Vite configuration for the demo harness app.
 *
 * Resolves workspace packages from their TypeScript source so the demo
 * can be run with `pnpm dev` without a separate build step for each package.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@sw-editor/editor-host-client": resolve(
        __dirname,
        "../packages/editor-host-client/src/index.ts",
      ),
    },
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
