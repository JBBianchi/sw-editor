/**
 * Storybook stories for the {@link EndNode} React Flow custom node.
 *
 * @module
 */

import type { Meta, StoryObj } from "@storybook/react";
import type { NodeProps } from "@xyflow/react";
import { reactFlowDecorator } from "../../../../.storybook/decorators/react-flow-decorator.js";
import { EndNode } from "./EndNode.js";

const meta: Meta<typeof EndNode> = {
  title: "React Flow/EndNode",
  component: EndNode,
  decorators: [reactFlowDecorator],
  args: {
    id: "end-1",
    data: { kind: "end" },
    type: "end",
  } satisfies Partial<NodeProps>,
  parameters: {
    layout: "centered",
  },
};

export default meta;

type Story = StoryObj<typeof EndNode>;

/** Default rendering of the end node with its target handle visible. */
export const Default: Story = {};
