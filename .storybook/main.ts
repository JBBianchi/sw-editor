/**
 * Storybook configuration — React + vanilla HTML/Web Components
 *
 * Framework choice: We use `@storybook/react-vite` as the single framework
 * because Storybook only supports one framework per instance. Vanilla DOM
 * and Web Component stories coexist by using the `htmlStory` wrapper from
 * `.storybook/html-story.tsx`, which mounts plain HTMLElements inside a
 * React host component. See that file for usage examples.
 */
import { resolve } from "node:path";
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../packages/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal(config) {
    config.resolve ??= {};
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string>),
      "@sw-editor/editor-core": resolve(__dirname, "../packages/editor-core/src/index.ts"),
      "@sw-editor/editor-host-client": resolve(
        __dirname,
        "../packages/editor-host-client/src/index.ts",
      ),
      "@sw-editor/editor-renderer-contract": resolve(
        __dirname,
        "../packages/editor-renderer-contract/src/index.ts",
      ),
      "@sw-editor/editor-renderer-react-flow": resolve(
        __dirname,
        "../packages/editor-renderer-react-flow/src/index.ts",
      ),
      "@sw-editor/editor-renderer-rete-lit": resolve(
        __dirname,
        "../packages/editor-renderer-rete-lit/src/index.ts",
      ),
      "@sw-editor/editor-web-component": resolve(
        __dirname,
        "../packages/editor-web-component/src/index.ts",
      ),
    };
    return config;
  },
};

export default config;
