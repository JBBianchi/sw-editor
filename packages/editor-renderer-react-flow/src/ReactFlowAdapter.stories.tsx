/**
 * Storybook stories for the {@link ReactFlowAdapter}.
 *
 * Demonstrates the adapter rendering a complete mini-workflow with Start,
 * Task, and End nodes connected via edges.
 *
 * @module
 */

import type { Meta, StoryObj } from "@storybook/react";
import type { WorkflowGraph } from "@sw-editor/editor-renderer-contract";
// biome-ignore lint/style/useImportType: React is a value import required by jsx:"react" compilation
import React, { useEffect, useRef } from "react";
import { ReactFlowAdapter } from "./react-flow-adapter.js";

/**
 * A small workflow graph: Start → greetUser → processPayload → End.
 */
const sampleGraph: WorkflowGraph = {
  nodes: [
    { id: "start-1", kind: "start" },
    { id: "task-1", kind: "task", taskReference: "greetUser" },
    { id: "task-2", kind: "task", taskReference: "processPayload" },
    { id: "end-1", kind: "end" },
  ],
  edges: [
    { id: "e-start-task1", source: "start-1", target: "task-1" },
    { id: "e-task1-task2", source: "task-1", target: "task-2" },
    { id: "e-task2-end", source: "task-2", target: "end-1" },
  ],
};

/**
 * Wrapper component that imperatively mounts the {@link ReactFlowAdapter}
 * into a container `div`, matching its real-world usage pattern.
 *
 * @param props - Component props.
 * @param props.graph - The workflow graph to render.
 * @returns A React element containing the adapter's rendered output.
 */
function AdapterHost({ graph }: { graph: WorkflowGraph }): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<ReactFlowAdapter | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const adapter = new ReactFlowAdapter();
    adapter.mount(container, graph);
    adapterRef.current = adapter;

    return () => {
      adapter.dispose();
      adapterRef.current = null;
    };
  }, [graph]);

  return <div ref={containerRef} style={{ width: "100%", height: "500px" }} />;
}

const meta: Meta<typeof AdapterHost> = {
  title: "React Flow/ReactFlowAdapter",
  component: AdapterHost,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

type Story = StoryObj<typeof AdapterHost>;

/** A complete mini-workflow with Start → Task → Task → End. */
export const ComposedGraph: Story = {
  args: {
    graph: sampleGraph,
  },
};
