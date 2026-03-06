import { describe, expect, it } from "vitest";
import { insertTask } from "../../src/commands/insert-task.js";
import type { WorkflowGraph } from "../../src/graph/index.js";
import {
  bootstrapWorkflowGraph,
  END_NODE_ID,
  INITIAL_EDGE_ID,
  START_NODE_ID,
} from "../../src/graph/index.js";
import { RevisionCounter } from "../../src/state/revision.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if every edge in the graph references existing node IDs. */
function isGraphConnected(graph: WorkflowGraph): boolean {
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  return graph.edges.every((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
}

/** Returns all direct successors of a node by ID. */
function successors(graph: WorkflowGraph, nodeId: string): string[] {
  return graph.edges.filter((e) => e.source === nodeId).map((e) => e.target);
}

/** Returns all direct predecessors of a node by ID. */
function predecessors(graph: WorkflowGraph, nodeId: string): string[] {
  return graph.edges.filter((e) => e.target === nodeId).map((e) => e.source);
}

// ---------------------------------------------------------------------------
// Basic insertion — start → task → end
// ---------------------------------------------------------------------------

describe("insertTask — single insertion between start and end", () => {
  it("produces a graph with 3 nodes and 2 edges", () => {
    const graph = bootstrapWorkflowGraph();
    const counter = new RevisionCounter();
    const result = insertTask(graph, counter, { edgeId: INITIAL_EDGE_ID });

    expect(result.graph.nodes).toHaveLength(3);
    expect(result.graph.edges).toHaveLength(2);
  });

  it("new node has kind 'task'", () => {
    const graph = bootstrapWorkflowGraph();
    const counter = new RevisionCounter();
    const result = insertTask(graph, counter, { edgeId: INITIAL_EDGE_ID });

    const newNode = result.graph.nodes.find((n) => n.id === result.nodeId);
    expect(newNode).toBeDefined();
    expect(newNode?.kind).toBe("task");
  });

  it("wires start → newNode → end", () => {
    const graph = bootstrapWorkflowGraph();
    const counter = new RevisionCounter();
    const result = insertTask(graph, counter, { edgeId: INITIAL_EDGE_ID });

    expect(successors(result.graph, START_NODE_ID)).toEqual([result.nodeId]);
    expect(successors(result.graph, result.nodeId)).toEqual([END_NODE_ID]);
    expect(predecessors(result.graph, END_NODE_ID)).toEqual([result.nodeId]);
  });

  it("removes the original edge", () => {
    const graph = bootstrapWorkflowGraph();
    const counter = new RevisionCounter();
    const result = insertTask(graph, counter, { edgeId: INITIAL_EDGE_ID });

    const originalEdge = result.graph.edges.find((e) => e.id === INITIAL_EDGE_ID);
    expect(originalEdge).toBeUndefined();
  });

  it("increments revision to 1 after the first insertion", () => {
    const graph = bootstrapWorkflowGraph();
    const counter = new RevisionCounter();
    const result = insertTask(graph, counter, { edgeId: INITIAL_EDGE_ID });

    expect(result.revision).toBe(1);
    expect(counter.currentRevision).toBe(1);
  });

  it("stores an optional taskReference on the new node", () => {
    const graph = bootstrapWorkflowGraph();
    const counter = new RevisionCounter();
    const result = insertTask(graph, counter, {
      edgeId: INITIAL_EDGE_ID,
      taskReference: "my-task",
    });

    const newNode = result.graph.nodes.find((n) => n.id === result.nodeId);
    expect(newNode?.taskReference).toBe("my-task");
  });

  it("new node has no taskReference when none supplied", () => {
    const graph = bootstrapWorkflowGraph();
    const counter = new RevisionCounter();
    const result = insertTask(graph, counter, { edgeId: INITIAL_EDGE_ID });

    const newNode = result.graph.nodes.find((n) => n.id === result.nodeId);
    expect(newNode?.taskReference).toBeUndefined();
  });

  it("does not mutate the original graph", () => {
    const graph = bootstrapWorkflowGraph();
    const originalNodeCount = graph.nodes.length;
    const originalEdgeCount = graph.edges.length;
    const counter = new RevisionCounter();

    insertTask(graph, counter, { edgeId: INITIAL_EDGE_ID });

    expect(graph.nodes).toHaveLength(originalNodeCount);
    expect(graph.edges).toHaveLength(originalEdgeCount);
  });

  it("returned graph is a new object reference", () => {
    const graph = bootstrapWorkflowGraph();
    const counter = new RevisionCounter();
    const result = insertTask(graph, counter, { edgeId: INITIAL_EDGE_ID });

    expect(result.graph).not.toBe(graph);
    expect(result.graph.nodes).not.toBe(graph.nodes);
    expect(result.graph.edges).not.toBe(graph.edges);
  });
});

// ---------------------------------------------------------------------------
// Multiple insertions — connectivity invariant
// ---------------------------------------------------------------------------

describe("insertTask — multiple insertions maintain connectivity", () => {
  it("two sequential insertions produce 4 nodes and 3 edges", () => {
    const counter = new RevisionCounter();
    let graph = bootstrapWorkflowGraph();

    // Insert first task, splitting start → end.
    const first = insertTask(graph, counter, { edgeId: INITIAL_EDGE_ID });
    graph = first.graph;

    // Find the edge connecting start → first task node, then split it.
    const edgeStartToFirst = graph.edges.find(
      (e) => e.source === START_NODE_ID && e.target === first.nodeId,
    );
    expect(edgeStartToFirst).toBeDefined();

    const second = insertTask(graph, counter, {
      // biome-ignore lint/style/noNonNullAssertion: toBeDefined() assertion above guarantees non-null
      edgeId: edgeStartToFirst!.id,
    });
    graph = second.graph;

    expect(graph.nodes).toHaveLength(4);
    expect(graph.edges).toHaveLength(3);
  });

  it("graph stays connected after each insertion", () => {
    const counter = new RevisionCounter();
    let graph = bootstrapWorkflowGraph();

    expect(isGraphConnected(graph)).toBe(true);

    let edgeToSplit = INITIAL_EDGE_ID;

    for (let i = 0; i < 5; i++) {
      const result = insertTask(graph, counter, { edgeId: edgeToSplit });
      graph = result.graph;
      expect(isGraphConnected(graph)).toBe(true);

      // For the next iteration, split the edge from the newly inserted node
      // to the end node so we always have a valid edge to split.
      const nextEdge = graph.edges.find(
        (e) => e.source === result.nodeId && e.target === END_NODE_ID,
      );
      if (nextEdge) {
        edgeToSplit = nextEdge.id;
      }
    }
  });

  it("revision increments once per insertion across multiple calls", () => {
    const counter = new RevisionCounter();
    let graph = bootstrapWorkflowGraph();

    const first = insertTask(graph, counter, { edgeId: INITIAL_EDGE_ID });
    graph = first.graph;
    expect(first.revision).toBe(1);

    // biome-ignore lint/style/noNonNullAssertion: bootstrapped graph always has a start edge after insertTask
    const edgeStartToFirst = graph.edges.find((e) => e.source === START_NODE_ID)!;
    const second = insertTask(graph, counter, { edgeId: edgeStartToFirst.id });
    expect(second.revision).toBe(2);
    expect(counter.currentRevision).toBe(2);
  });

  it("all inserted node IDs are unique", () => {
    const counter = new RevisionCounter();
    let graph = bootstrapWorkflowGraph();
    const insertedIds: string[] = [];

    let edgeToSplit = INITIAL_EDGE_ID;

    for (let i = 0; i < 10; i++) {
      const result = insertTask(graph, counter, { edgeId: edgeToSplit });
      graph = result.graph;
      insertedIds.push(result.nodeId);

      const nextEdge = graph.edges.find(
        (e) => e.source === result.nodeId && e.target === END_NODE_ID,
      );
      if (nextEdge) {
        edgeToSplit = nextEdge.id;
      }
    }

    const uniqueIds = new Set(insertedIds);
    expect(uniqueIds.size).toBe(insertedIds.length);
  });

  it("node IDs never collide with reserved synthetic IDs", () => {
    const counter = new RevisionCounter();
    let graph = bootstrapWorkflowGraph();
    let edgeToSplit = INITIAL_EDGE_ID;

    for (let i = 0; i < 5; i++) {
      const result = insertTask(graph, counter, { edgeId: edgeToSplit });
      graph = result.graph;
      expect(result.nodeId).not.toBe(START_NODE_ID);
      expect(result.nodeId).not.toBe(END_NODE_ID);

      const nextEdge = graph.edges.find(
        (e) => e.source === result.nodeId && e.target === END_NODE_ID,
      );
      if (nextEdge) {
        edgeToSplit = nextEdge.id;
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Insertion ordering — node array reflects logical workflow order
// ---------------------------------------------------------------------------

describe("insertTask — node array ordering (regression)", () => {
  it("insert between start and end → new node is at index 1", () => {
    const graph = bootstrapWorkflowGraph();
    const counter = new RevisionCounter();
    const result = insertTask(graph, counter, { edgeId: INITIAL_EDGE_ID });

    const nodeIds = result.graph.nodes.map((n) => n.id);
    // Expected logical order: [start, newTask, end]
    expect(nodeIds.indexOf(START_NODE_ID)).toBe(0);
    expect(nodeIds.indexOf(result.nodeId)).toBe(1);
    expect(nodeIds.indexOf(END_NODE_ID)).toBe(2);
  });

  it("insert between A and B in a linear chain → new node appears between A and B", () => {
    const counter = new RevisionCounter();
    let graph = bootstrapWorkflowGraph();

    // Build chain: start → A → end
    const insertA = insertTask(graph, counter, { edgeId: INITIAL_EDGE_ID });
    graph = insertA.graph;

    // Find edge A → end, insert B after A: start → A → B → end
    // biome-ignore lint/style/noNonNullAssertion: edge guaranteed after insertTask
    const edgeAToEnd = graph.edges.find(
      (e) => e.source === insertA.nodeId && e.target === END_NODE_ID,
    )!;
    const insertB = insertTask(graph, counter, { edgeId: edgeAToEnd.id });
    graph = insertB.graph;

    // Now insert C between A and B by splitting edge A → B
    // biome-ignore lint/style/noNonNullAssertion: edge guaranteed after insertTask
    const edgeAToB = graph.edges.find(
      (e) => e.source === insertA.nodeId && e.target === insertB.nodeId,
    )!;
    const insertC = insertTask(graph, counter, { edgeId: edgeAToB.id });
    graph = insertC.graph;

    const nodeIds = graph.nodes.map((n) => n.id);
    // Expected logical order: [start, A, C, B, end]
    const idxA = nodeIds.indexOf(insertA.nodeId);
    const idxC = nodeIds.indexOf(insertC.nodeId);
    const idxB = nodeIds.indexOf(insertB.nodeId);
    expect(idxA).toBeLessThan(idxC);
    expect(idxC).toBeLessThan(idxB);
  });

  it("insert at multiple positions → each new node is spliced at the correct index", () => {
    const counter = new RevisionCounter();
    let graph = bootstrapWorkflowGraph();

    // Insert first: start → T1 → end
    const t1 = insertTask(graph, counter, { edgeId: INITIAL_EDGE_ID });
    graph = t1.graph;

    // Insert second after T1: start → T1 → T2 → end
    // biome-ignore lint/style/noNonNullAssertion: edge guaranteed after insertTask
    const edgeT1ToEnd = graph.edges.find(
      (e) => e.source === t1.nodeId && e.target === END_NODE_ID,
    )!;
    const t2 = insertTask(graph, counter, { edgeId: edgeT1ToEnd.id });
    graph = t2.graph;

    // Insert third between start and T1: start → T3 → T1 → T2 → end
    // biome-ignore lint/style/noNonNullAssertion: edge guaranteed after insertTask
    const edgeStartToT1 = graph.edges.find(
      (e) => e.source === START_NODE_ID && e.target === t1.nodeId,
    )!;
    const t3 = insertTask(graph, counter, { edgeId: edgeStartToT1.id });
    graph = t3.graph;

    const nodeIds = graph.nodes.map((n) => n.id);
    // Expected logical order: [start, T3, T1, T2, end]
    expect(nodeIds[0]).toBe(START_NODE_ID);
    expect(nodeIds[1]).toBe(t3.nodeId);
    expect(nodeIds[2]).toBe(t1.nodeId);
    expect(nodeIds[3]).toBe(t2.nodeId);
    expect(nodeIds[4]).toBe(END_NODE_ID);
  });
});

// ---------------------------------------------------------------------------
// Edge cases and error handling
// ---------------------------------------------------------------------------

describe("insertTask — edge cases", () => {
  it("throws when the specified edgeId does not exist", () => {
    const graph = bootstrapWorkflowGraph();
    const counter = new RevisionCounter();

    expect(() => insertTask(graph, counter, { edgeId: "nonexistent-edge" })).toThrow(
      /nonexistent-edge/,
    );
  });

  it("does not increment revision when insertion fails", () => {
    const graph = bootstrapWorkflowGraph();
    const counter = new RevisionCounter();

    try {
      insertTask(graph, counter, { edgeId: "bad-edge" });
    } catch {
      // expected
    }

    expect(counter.currentRevision).toBe(0);
  });

  it("start and end synthetic nodes are preserved after insertion", () => {
    const graph = bootstrapWorkflowGraph();
    const counter = new RevisionCounter();
    const result = insertTask(graph, counter, { edgeId: INITIAL_EDGE_ID });

    const startNode = result.graph.nodes.find((n) => n.id === START_NODE_ID);
    const endNode = result.graph.nodes.find((n) => n.id === END_NODE_ID);
    expect(startNode).toBeDefined();
    expect(startNode?.kind).toBe("start");
    expect(endNode).toBeDefined();
    expect(endNode?.kind).toBe("end");
  });

  it("splitting an edge that is not the initial edge also works", () => {
    const counter = new RevisionCounter();
    let graph = bootstrapWorkflowGraph();

    // Insert first task → start → task1 → end
    const first = insertTask(graph, counter, { edgeId: INITIAL_EDGE_ID });
    graph = first.graph;

    // Find task1 → end edge and split it → start → task1 → task2 → end
    // biome-ignore lint/style/noNonNullAssertion: insertTask always creates a task-to-end edge
    const task1ToEnd = graph.edges.find(
      (e) => e.source === first.nodeId && e.target === END_NODE_ID,
    )!;

    const second = insertTask(graph, counter, { edgeId: task1ToEnd.id });
    graph = second.graph;

    expect(successors(graph, first.nodeId)).toEqual([second.nodeId]);
    expect(successors(graph, second.nodeId)).toEqual([END_NODE_ID]);
    expect(isGraphConnected(graph)).toBe(true);
  });
});
