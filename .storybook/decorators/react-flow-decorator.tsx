/**
 * Storybook decorator that wraps stories in a {@link ReactFlowProvider}.
 *
 * Use this decorator for any story that renders React Flow nodes or edges
 * so that handles and node-internals context are available without errors.
 *
 * @example
 * ```ts
 * import { reactFlowDecorator } from "../../../.storybook/decorators/react-flow-decorator";
 *
 * const meta: Meta<typeof MyNode> = {
 *   decorators: [reactFlowDecorator],
 * };
 * ```
 *
 * @module
 */

import type { Decorator } from "@storybook/react";
import { ReactFlowProvider } from "@xyflow/react";

/**
 * Storybook decorator that provides the React Flow context.
 *
 * Wraps the story element in a `ReactFlowProvider` so that components
 * relying on React Flow internals (handles, node context, viewport) render
 * correctly in isolation.
 *
 * @param Story - The story component function supplied by Storybook.
 * @returns The story element wrapped inside a `ReactFlowProvider`.
 */
export const reactFlowDecorator: Decorator = (Story) => (
  <ReactFlowProvider>
    <Story />
  </ReactFlowProvider>
);
