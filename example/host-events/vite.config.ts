import { defineConfig } from "vite";
import { resolve } from "node:path";

/**
 * Vite configuration for the host-events example.
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
      "@sw-editor/editor-web-component": resolve(
        __dirname,
        "../../packages/editor-web-component/src/index.ts",
      ),
      "@sw-editor/editor-core": resolve(
        __dirname,
        "../../packages/editor-core/src/index.ts",
      ),
    },
  },
});
