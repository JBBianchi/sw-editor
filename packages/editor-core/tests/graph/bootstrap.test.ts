import { describe, expect, it } from "vitest";
import type { WorkflowGraph } from "../../src/graph/index.js";
import {
  bootstrapWorkflowGraph,
  END_NODE_ID,
  INITIAL_EDGE_ID,
  START_NODE_ID,
} from "../../src/graph/index.js";

describe("bootstrapWorkflowGraph", () => {
  it("returns a graph with exactly 2 nodes and 1 edge", () => {
    const graph: WorkflowGraph = bootstrapWorkflowGraph();
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
  });

  it("start node has kind 'start' and stable ID", () => {
    const graph = bootstrapWorkflowGraph();
    const start = graph.nodes.find((n) => n.id === START_NODE_ID);
    expect(start).toBeDefined();
    expect(start?.kind).toBe("start");
  });

  it("end node has kind 'end' and stable ID", () => {
    const graph = bootstrapWorkflowGraph();
    const end = graph.nodes.find((n) => n.id === END_NODE_ID);
    expect(end).toBeDefined();
    expect(end?.kind).toBe("end");
  });

  it("initial edge connects start to end", () => {
    const graph = bootstrapWorkflowGraph();
    const edge = graph.edges[0];
    expect(edge?.id).toBe(INITIAL_EDGE_ID);
    expect(edge?.source).toBe(START_NODE_ID);
    expect(edge?.target).toBe(END_NODE_ID);
  });

  it("synthetic boundary nodes have no taskReference", () => {
    const graph = bootstrapWorkflowGraph();
    for (const node of graph.nodes) {
      expect(node.taskReference).toBeUndefined();
    }
  });

  it("returns a fresh graph object on each call", () => {
    const a = bootstrapWorkflowGraph();
    const b = bootstrapWorkflowGraph();
    expect(a).not.toBe(b);
    expect(a.nodes).not.toBe(b.nodes);
    expect(a.edges).not.toBe(b.edges);
  });

  it("mutating the returned graph does not affect subsequent calls", () => {
    const a = bootstrapWorkflowGraph();
    a.nodes.push({ id: "extra", kind: "task" });
    const b = bootstrapWorkflowGraph();
    expect(b.nodes).toHaveLength(2);
  });
});
