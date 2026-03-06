import { resolve } from "node:path";
import { defineConfig } from "vite";

/**
 * Vite configuration for the vanilla-js example.
 *
 * Resolves workspace packages from their TypeScript source so the example
 * can be run with `pnpm dev` without a separate build step for each package.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@sw-editor/editor-host-client": resolve(
        __dirname,
        "../../packages/editor-host-client/src/index.ts",
      ),
      "@sw-editor/editor-core": resolve(__dirname, "../../packages/editor-core/src/index.ts"),
    },
  },
});
