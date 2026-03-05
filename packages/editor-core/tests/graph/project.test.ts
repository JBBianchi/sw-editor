import { describe, expect, it } from "vitest";
import { END_NODE_ID, START_NODE_ID, projectWorkflowToGraph } from "../../src/graph/index.js";
import type { WorkflowGraph } from "../../src/graph/index.js";
import { parseWorkflowSource } from "../../src/source/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_DOCUMENT = {
  dsl: "1.0.0",
  name: "test-workflow",
  version: "1.0.0",
  namespace: "default",
};

/**
 * Parses a JSON workflow definition and runs the model-to-graph projection.
 * Throws if parsing fails (tests should use valid definitions).
 */
function projectFromJson(doTasks: unknown[]): WorkflowGraph {
  const source = { format: "json" as const, content: JSON.stringify({ document: BASE_DOCUMENT, do: doTasks }) };
  const result = parseWorkflowSource(source);
  if (!result.ok) {
    throw new Error(`Parse failed: ${result.diagnostics.map((d) => d.message).join("; ")}`);
  }
  return projectWorkflowToGraph(result.workflow);
}

/** Returns true if every edge in the graph references existing node IDs. */
function isGraphConnected(graph: WorkflowGraph): boolean {
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  return graph.edges.every((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
}

/** Returns the IDs of all direct successors of a node. */
function successors(graph: WorkflowGraph, nodeId: string): string[] {
  return graph.edges.filter((e) => e.source === nodeId).map((e) => e.target);
}

// ---------------------------------------------------------------------------
// Boundary nodes
// ---------------------------------------------------------------------------

describe("projectWorkflowToGraph — synthetic boundary nodes", () => {
  it("always produces a start node with id __start__ and kind 'start'", () => {
    const graph = projectFromJson([{ step1: { set: { x: 1 } } }]);
    const start = graph.nodes.find((n) => n.id === START_NODE_ID);
    expect(start).toBeDefined();
    expect(start?.kind).toBe("start");
  });

  it("always produces an end node with id __end__ and kind 'end'", () => {
    const graph = projectFromJson([{ step1: { set: { x: 1 } } }]);
    const end = graph.nodes.find((n) => n.id === END_NODE_ID);
    expect(end).toBeDefined();
    expect(end?.kind).toBe("end");
  });

  it("boundary nodes have no taskReference", () => {
    const graph = projectFromJson([{ step1: { set: { x: 1 } } }]);
    const start = graph.nodes.find((n) => n.id === START_NODE_ID);
    const end = graph.nodes.find((n) => n.id === END_NODE_ID);
    expect(start?.taskReference).toBeUndefined();
    expect(end?.taskReference).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Empty workflow (no tasks)
// ---------------------------------------------------------------------------

describe("projectWorkflowToGraph — empty / no-task workflow", () => {
  it("produces exactly 2 nodes and 1 edge when there are no tasks", () => {
    // Parse a valid workflow, then override `do` to an empty array to simulate
    // a no-task projection without violating SDK schema validation.
    const source = {
      format: "json" as const,
      content: JSON.stringify({ document: BASE_DOCUMENT, do: [{ placeholder: { set: { x: 1 } } }] }),
    };
    const result = parseWorkflowSource(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const workflow = result.workflow;
    const originalDo = workflow.do;
    (workflow as { do: unknown }).do = [];
    const graph = projectWorkflowToGraph(workflow);
    (workflow as { do: unknown }).do = originalDo;

    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]?.source).toBe(START_NODE_ID);
    expect(graph.edges[0]?.target).toBe(END_NODE_ID);
  });

  it("empty graph is connected", () => {
    const source = {
      format: "json" as const,
      content: JSON.stringify({ document: BASE_DOCUMENT, do: [{ placeholder: { set: { x: 1 } } }] }),
    };
    const result = parseWorkflowSource(source);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const workflow = result.workflow;
    const originalDo = workflow.do;
    (workflow as { do: unknown }).do = [];
    const graph = projectWorkflowToGraph(workflow);
    (workflow as { do: unknown }).do = originalDo;
    expect(isGraphConnected(graph)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Single-task workflow
// ---------------------------------------------------------------------------

describe("projectWorkflowToGraph — single task", () => {
  it("produces 3 nodes and 2 edges", () => {
    const graph = projectFromJson([{ step1: { set: { x: 1 } } }]);
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(2);
  });

  it("task node has kind 'task'", () => {
    const graph = projectFromJson([{ step1: { set: { x: 1 } } }]);
    const taskNode = graph.nodes.find((n) => n.kind === "task");
    expect(taskNode).toBeDefined();
    expect(taskNode?.kind).toBe("task");
  });

  it("task node id equals the task name", () => {
    const graph = projectFromJson([{ step1: { set: { x: 1 } } }]);
    const taskNode = graph.nodes.find((n) => n.kind === "task");
    expect(taskNode?.id).toBe("step1");
  });

  it("task node taskReference equals the task name", () => {
    const graph = projectFromJson([{ step1: { set: { x: 1 } } }]);
    const taskNode = graph.nodes.find((n) => n.kind === "task");
    expect(taskNode?.taskReference).toBe("step1");
  });

  it("wires __start__ → step1 → __end__", () => {
    const graph = projectFromJson([{ step1: { set: { x: 1 } } }]);
    expect(successors(graph, START_NODE_ID)).toEqual(["step1"]);
    expect(successors(graph, "step1")).toEqual([END_NODE_ID]);
  });

  it("graph is fully connected", () => {
    const graph = projectFromJson([{ step1: { set: { x: 1 } } }]);
    expect(isGraphConnected(graph)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Sequential multi-task workflow
// ---------------------------------------------------------------------------

describe("projectWorkflowToGraph — sequential multi-task (linear chain)", () => {
  const THREE_TASKS = [
    { step1: { set: { x: 1 } } },
    { step2: { set: { y: 2 } } },
    { step3: { set: { z: 3 } } },
  ];

  it("produces correct node count (tasks + 2 boundary)", () => {
    const graph = projectFromJson(THREE_TASKS);
    expect(graph.nodes).toHaveLength(5); // __start__, step1, step2, step3, __end__
  });

  it("produces correct edge count (one per sequential step + start-to-first)", () => {
    const graph = projectFromJson(THREE_TASKS);
    expect(graph.edges).toHaveLength(4); // start→1, 1→2, 2→3, 3→end
  });

  it("forms a linear chain: __start__ → step1 → step2 → step3 → __end__", () => {
    const graph = projectFromJson(THREE_TASKS);
    expect(successors(graph, START_NODE_ID)).toEqual(["step1"]);
    expect(successors(graph, "step1")).toEqual(["step2"]);
    expect(successors(graph, "step2")).toEqual(["step3"]);
    expect(successors(graph, "step3")).toEqual([END_NODE_ID]);
  });

  it("all task nodes have correct taskReference", () => {
    const graph = projectFromJson(THREE_TASKS);
    const taskNodes = graph.nodes.filter((n) => n.kind === "task");
    expect(taskNodes).toHaveLength(3);
    expect(taskNodes.map((n) => n.taskReference)).toEqual(["step1", "step2", "step3"]);
  });

  it("graph is fully connected", () => {
    const graph = projectFromJson(THREE_TASKS);
    expect(isGraphConnected(graph)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Flow directive: then: 'end'
// ---------------------------------------------------------------------------

describe("projectWorkflowToGraph — then: 'end' directive", () => {
  it("connects task directly to __end__ when then is 'end'", () => {
    const graph = projectFromJson([
      { step1: { set: { x: 1 }, then: "end" } },
      { step2: { set: { y: 2 } } },
    ]);

    // step1 should connect to __end__, not step2.
    expect(successors(graph, "step1")).toEqual([END_NODE_ID]);
  });

  it("graph is connected when then: 'end' is used", () => {
    const graph = projectFromJson([
      { step1: { set: { x: 1 }, then: "end" } },
      { step2: { set: { y: 2 } } },
    ]);
    expect(isGraphConnected(graph)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Flow directive: then: 'exit'
// ---------------------------------------------------------------------------

describe("projectWorkflowToGraph — then: 'exit' directive", () => {
  it("connects task directly to __end__ when then is 'exit'", () => {
    const graph = projectFromJson([
      { step1: { set: { x: 1 }, then: "exit" } },
      { step2: { set: { y: 2 } } },
    ]);

    expect(successors(graph, "step1")).toEqual([END_NODE_ID]);
  });
});

// ---------------------------------------------------------------------------
// Flow directive: then: 'continue' (explicit)
// ---------------------------------------------------------------------------

describe("projectWorkflowToGraph — then: 'continue' directive (explicit)", () => {
  it("advances to the next task when then is 'continue'", () => {
    const graph = projectFromJson([
      { step1: { set: { x: 1 }, then: "continue" } },
      { step2: { set: { y: 2 } } },
    ]);

    expect(successors(graph, "step1")).toEqual(["step2"]);
  });

  it("last task with then: 'continue' connects to __end__", () => {
    const graph = projectFromJson([
      { step1: { set: { x: 1 }, then: "continue" } },
    ]);

    expect(successors(graph, "step1")).toEqual([END_NODE_ID]);
  });
});

// ---------------------------------------------------------------------------
// Named task transition
// ---------------------------------------------------------------------------

describe("projectWorkflowToGraph — named task transition", () => {
  it("creates an edge to the named task when then references a valid task name", () => {
    const graph = projectFromJson([
      { step1: { set: { x: 1 }, then: "step3" } },
      { step2: { set: { y: 2 } } },
      { step3: { set: { z: 3 } } },
    ]);

    // step1 jumps to step3 (skipping step2).
    expect(successors(graph, "step1")).toEqual(["step3"]);
  });

  it("falls back to __end__ for unknown named task reference", () => {
    const graph = projectFromJson([
      { step1: { set: { x: 1 }, then: "nonExistentStep" } },
    ]);

    expect(successors(graph, "step1")).toEqual([END_NODE_ID]);
  });

  it("graph is connected with named transitions", () => {
    const graph = projectFromJson([
      { step1: { set: { x: 1 }, then: "step3" } },
      { step2: { set: { y: 2 } } },
      { step3: { set: { z: 3 } } },
    ]);
    expect(isGraphConnected(graph)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Node ordering
// ---------------------------------------------------------------------------

describe("projectWorkflowToGraph — node ordering", () => {
  it("start node is first in the nodes array", () => {
    const graph = projectFromJson([{ step1: { set: { x: 1 } } }]);
    expect(graph.nodes[0]?.id).toBe(START_NODE_ID);
  });

  it("end node is last in the nodes array", () => {
    const graph = projectFromJson([{ step1: { set: { x: 1 } } }]);
    expect(graph.nodes[graph.nodes.length - 1]?.id).toBe(END_NODE_ID);
  });

  it("task nodes appear between start and end in declaration order", () => {
    const graph = projectFromJson([
      { alpha: { set: { a: 1 } } },
      { beta: { set: { b: 2 } } },
      { gamma: { set: { c: 3 } } },
    ]);
    const taskNodes = graph.nodes.filter((n) => n.kind === "task");
    expect(taskNodes.map((n) => n.id)).toEqual(["alpha", "beta", "gamma"]);
  });
});

// ---------------------------------------------------------------------------
// Return value immutability
// ---------------------------------------------------------------------------

describe("projectWorkflowToGraph — return value", () => {
  it("returns a fresh graph object on each call", () => {
    const source = { format: "json" as const, content: JSON.stringify({ document: BASE_DOCUMENT, do: [{ s: { set: {} } }] }) };
    const result = parseWorkflowSource(source);
    if (!result.ok) return;
    const a = projectWorkflowToGraph(result.workflow);
    const b = projectWorkflowToGraph(result.workflow);
    expect(a).not.toBe(b);
    expect(a.nodes).not.toBe(b.nodes);
    expect(a.edges).not.toBe(b.edges);
  });
});
