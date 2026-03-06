/**
 * Storybook stories for the {@link StartNode} React Flow custom node.
 *
 * @module
 */

import type { Meta, StoryObj } from "@storybook/react";
import type { NodeProps } from "@xyflow/react";
import { reactFlowDecorator } from "../../../../.storybook/decorators/react-flow-decorator.js";
import { StartNode } from "./StartNode.js";

const defaultProps: NodeProps = {
  id: "start-1",
  type: "start",
  data: { kind: "start" },
  dragging: false,
  draggable: true,
  selectable: true,
  deletable: true,
  selected: false,
  isConnectable: true,
  positionAbsoluteX: 0,
  positionAbsoluteY: 0,
  zIndex: 0,
};

/**
 * Storybook metadata for the `StartNode` component.
 *
 * Wraps all stories in a `ReactFlowProvider` so handles render correctly.
 */
const meta: Meta<typeof StartNode> = {
  title: "React Flow/Nodes/StartNode",
  component: StartNode,
  decorators: [reactFlowDecorator],
  args: defaultProps,
  argTypes: {
    id: {
      control: "text",
      description: "Unique node identifier.",
    },
    isConnectable: {
      control: "boolean",
      description: "Whether the source handle accepts new connections.",
    },
    dragging: {
      control: "boolean",
      description: "Whether the node is currently being dragged.",
    },
  },
};

export default meta;

type Story = StoryObj<typeof StartNode>;

/** Default rendering of the start node with its source handle visible. */
export const Default: Story = {};

/** Start node with connections disabled. */
export const NotConnectable: Story = {
  args: {
    isConnectable: false,
  },
};
