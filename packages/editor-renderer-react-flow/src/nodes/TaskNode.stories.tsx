/**
 * Storybook stories for the {@link TaskNode} component.
 *
 * Each story demonstrates the task node with a different `taskReference`
 * label value. The `reactFlowDecorator` provides the required React Flow
 * context so handles render correctly in isolation.
 *
 * @module
 */

import type { Meta, StoryObj } from "@storybook/react";
import type { NodeProps } from "@xyflow/react";
import { reactFlowDecorator } from "../../../../.storybook/decorators/react-flow-decorator.js";
import { TaskNode, type TaskNodeData } from "./TaskNode.js";

/**
 * Helper that builds a {@link NodeProps} object accepted by `TaskNode`.
 *
 * @param data - Partial task-node data; `kind` defaults to `"task"`.
 * @returns A minimal `NodeProps` stub suitable for story rendering.
 */
function nodeProps(data: Partial<TaskNodeData> = {}): NodeProps {
  return {
    id: "story-task-1",
    type: "task",
    data: { kind: "task", taskReference: "(task)", ...data },
    dragging: false,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    zIndex: 0,
  } as unknown as NodeProps;
}

const meta: Meta<typeof TaskNode> = {
  title: "ReactFlow/TaskNode",
  component: TaskNode,
  decorators: [reactFlowDecorator],
  argTypes: {
    data: {
      description: "Node data containing `kind` and `taskReference`.",
      control: "object",
    },
  },
};

export default meta;

type Story = StoryObj<typeof TaskNode>;

/** Default task node with its fallback label. */
export const Default: Story = {
  args: nodeProps(),
};

/** Task node displaying a simple greeting task reference. */
export const GreetingTask: Story = {
  args: nodeProps({ taskReference: "greetUser" }),
};

/** Task node displaying a data-processing task reference. */
export const ProcessDataTask: Story = {
  args: nodeProps({ taskReference: "processPayload" }),
};

/** Task node with a long label to verify layout behaviour. */
export const LongLabel: Story = {
  args: nodeProps({ taskReference: "performExtendedDataTransformation" }),
};

/** Task node with an empty `taskReference` to show the fallback. */
export const EmptyReference: Story = {
  args: nodeProps({ taskReference: "" }),
};
