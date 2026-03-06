/**
 * Performance benchmarks for task insertion and anchor realignment.
 *
 * Measures:
 * 1. Insert-to-settled-layout time for a workflow with 25 nodes and 30 edges.
 *    Asserts that the 95th percentile latency is ≤ 250 ms.
 * 2. Anchor realignment time after a simulated pan/zoom viewport transform.
 *    Asserts that the 95th percentile latency is ≤ 100 ms.
 *
 * Multiple iterations are run per benchmark for statistical significance.
 *
 * @module
 */

import {
  bootstrapWorkflowGraph,
  END_NODE_ID,
  type GraphEdge,
  INITIAL_EDGE_ID,
  insertTask,
  RevisionCounter,
  type WorkflowGraph,
} from "@sw-editor/editor-core";
import type { RendererEdgeAnchor } from "@sw-editor/editor-renderer-contract";
import { beforeAll, describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Number of iterations per benchmark scenario. 30 samples give adequate
 * resolution for p50/p95/p99 while keeping total runtime practical.
 */
const ITERATIONS = 30;

/** Maximum allowed 95th percentile for insert-to-settled-layout (ms). */
const INSERT_P95_THRESHOLD_MS = 250;

/** Maximum allowed 95th percentile for anchor realignment (ms). */
const ANCHOR_P95_THRESHOLD_MS = 100;

/** Target task node count for the insertion benchmark graph. */
const TARGET_NODE_COUNT = 25;

/** Target edge count for the insertion benchmark graph. */
const TARGET_EDGE_COUNT = 30;

// ---------------------------------------------------------------------------
// Statistics helpers
// ---------------------------------------------------------------------------

/**
 * Computes a percentile value from a pre-sorted ascending array of numbers
 * using the lower nearest-rank method.
 *
 * @param sorted - Non-empty array of numbers sorted in ascending order.
 * @param p - Percentile fraction in [0, 1] (e.g. 0.95 for p95).
 * @returns The value at the requested percentile, or 0 if the array is empty.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(Math.floor(sorted.length * p), sorted.length - 1);
  return sorted[index];
}

/**
 * Logs a latency report for a benchmark scenario.
 *
 * @param label - Human-readable scenario label.
 * @param sorted - Sorted ascending latency samples in milliseconds.
 */
function logReport(label: string, sorted: number[]): void {
  const p50 = percentile(sorted, 0.5);
  const p95 = percentile(sorted, 0.95);
  const p99 = percentile(sorted, 0.99);
  const min = sorted[0] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;

  console.log(
    `\nPerformance report [${label}] (n=${sorted.length}):\n` +
      `  min=${min.toFixed(3)} ms` +
      `  p50=${p50.toFixed(3)} ms` +
      `  p95=${p95.toFixed(3)} ms` +
      `  p99=${p99.toFixed(3)} ms` +
      `  max=${max.toFixed(3)} ms`,
  );
}

// ---------------------------------------------------------------------------
// Graph builders
// ---------------------------------------------------------------------------

/**
 * Builds a linear workflow graph with 25 task nodes and 26 edges by
 * sequentially inserting tasks, then adds 4 cross-edges to reach
 * 25 task nodes + 2 boundary nodes = 27 nodes total, 30 edges total.
 *
 * The resulting graph satisfies the benchmark requirement of
 * 25 (task) nodes and 30 edges.
 *
 * @returns A workflow graph with 27 nodes (25 task + start + end) and 30 edges.
 */
function buildLargeGraph(): WorkflowGraph {
  const counter = new RevisionCounter();
  let graph = bootstrapWorkflowGraph();

  // Build a linear chain of 25 task nodes.
  const taskNodeIds: string[] = [];

  // First insertion on the initial edge.
  const first = insertTask(graph, counter, {
    edgeId: INITIAL_EDGE_ID,
    taskReference: "task-0",
  });
  graph = first.graph;
  taskNodeIds.push(first.nodeId);

  // Insert remaining 24 task nodes at the tail (before __end__).
  for (let i = 1; i < TARGET_NODE_COUNT; i++) {
    const edgeToEnd = graph.edges.find((e) => e.target === END_NODE_ID);
    if (!edgeToEnd) throw new Error(`No edge to END found at iteration ${i}`);
    const result = insertTask(graph, counter, {
      edgeId: edgeToEnd.id,
      taskReference: `task-${i}`,
    });
    graph = result.graph;
    taskNodeIds.push(result.nodeId);
  }

  // At this point: 27 nodes (start + 25 tasks + end), 26 edges.
  // Add 4 cross-edges to reach 30 edges total.
  const crossEdges: GraphEdge[] = [
    { id: "cross-0", source: taskNodeIds[0], target: taskNodeIds[4] },
    { id: "cross-1", source: taskNodeIds[5], target: taskNodeIds[10] },
    { id: "cross-2", source: taskNodeIds[10], target: taskNodeIds[15] },
    { id: "cross-3", source: taskNodeIds[15], target: taskNodeIds[24] },
  ];

  return {
    nodes: graph.nodes,
    edges: [...graph.edges, ...crossEdges],
  };
}

/**
 * Computes anchor positions for every edge in the graph by deriving
 * midpoint coordinates from the source and target node positions.
 *
 * Positions are assigned based on array index in the node list
 * (index * 200 px horizontal gap), simulating a linear layout.
 *
 * @param graph - The workflow graph to compute anchors for.
 * @returns An array of {@link RendererEdgeAnchor} objects.
 */
function computeEdgeAnchors(graph: WorkflowGraph): RendererEdgeAnchor[] {
  const nodePositions = new Map<string, { x: number; y: number }>();
  for (let i = 0; i < graph.nodes.length; i++) {
    nodePositions.set(graph.nodes[i].id, { x: i * 200, y: 0 });
  }

  return graph.edges.map((edge) => {
    const srcPos = nodePositions.get(edge.source) ?? { x: 0, y: 0 };
    const tgtPos = nodePositions.get(edge.target) ?? { x: 0, y: 0 };
    return {
      edgeId: edge.id,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      x: (srcPos.x + tgtPos.x) / 2,
      y: (srcPos.y + tgtPos.y) / 2,
    };
  });
}

/**
 * Applies a viewport transform (pan + zoom) to a set of edge anchors,
 * simulating what a renderer does after the user pans or zooms.
 *
 * @param anchors - The original edge anchor positions.
 * @param panX - Horizontal pan offset in pixels.
 * @param panY - Vertical pan offset in pixels.
 * @param zoom - Zoom scale factor (e.g. 1.5 for 150%).
 * @returns New array of transformed {@link RendererEdgeAnchor} objects.
 */
function realignAnchorsAfterViewportTransform(
  anchors: RendererEdgeAnchor[],
  panX: number,
  panY: number,
  zoom: number,
): RendererEdgeAnchor[] {
  return anchors.map((anchor) => ({
    ...anchor,
    x: anchor.x * zoom + panX,
    y: anchor.y * zoom + panY,
  }));
}

// ---------------------------------------------------------------------------
// Insert-to-settled-layout benchmark
// ---------------------------------------------------------------------------

/**
 * Measures the time to insert a new task node into a large graph and
 * recompute all edge anchor positions (simulating settled layout).
 *
 * @param graph - The base graph to insert into.
 * @returns Elapsed time in milliseconds.
 */
function measureInsertAndSettle(graph: WorkflowGraph): number {
  // Pick a random interior edge to insert on (avoid cross-edges for simplicity).
  const linearEdges = graph.edges.filter((e) => !e.id.startsWith("cross-"));
  const targetEdge = linearEdges[Math.floor(Math.random() * linearEdges.length)];

  const counter = new RevisionCounter();

  const start = performance.now();

  // Insert a new task node.
  const result = insertTask(graph, counter, {
    edgeId: targetEdge.id,
    taskReference: "perf-insert",
  });

  // Recompute all edge anchors to simulate settled layout.
  computeEdgeAnchors(result.graph);

  const end = performance.now();
  return end - start;
}

// ---------------------------------------------------------------------------
// Anchor realignment benchmark
// ---------------------------------------------------------------------------

/**
 * Measures the time to realign all edge anchors after a simulated pan/zoom.
 *
 * @param anchors - Pre-computed edge anchors for the large graph.
 * @returns Elapsed time in milliseconds.
 */
function measureAnchorRealignment(anchors: RendererEdgeAnchor[]): number {
  // Simulate a non-trivial pan and zoom.
  const panX = 150 + Math.random() * 100;
  const panY = -75 + Math.random() * 50;
  const zoom = 0.8 + Math.random() * 0.7; // 0.8x to 1.5x

  const start = performance.now();
  realignAnchorsAfterViewportTransform(anchors, panX, panY, zoom);
  const end = performance.now();

  return end - start;
}

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe("Insertion performance benchmarks", () => {
  // -----------------------------------------------------------------------
  // Insert-to-settled-layout (25 nodes / 30 edges)
  // -----------------------------------------------------------------------

  describe("insert-to-settled-layout (25 nodes / 30 edges)", () => {
    let baseGraph: WorkflowGraph;
    let sortedLatencies: number[];

    beforeAll(() => {
      baseGraph = buildLargeGraph();

      // Validate the graph meets the size requirements.
      expect(baseGraph.nodes).toHaveLength(TARGET_NODE_COUNT + 2); // +start+end
      expect(baseGraph.edges).toHaveLength(TARGET_EDGE_COUNT);

      const latencies: number[] = [];
      for (let i = 0; i < ITERATIONS; i++) {
        latencies.push(measureInsertAndSettle(baseGraph));
      }

      sortedLatencies = latencies.slice().sort((a, b) => a - b);
      logReport("insert-to-settled-layout", sortedLatencies);
    });

    it(`collects ${ITERATIONS} latency samples`, () => {
      expect(sortedLatencies).toHaveLength(ITERATIONS);
    });

    it("all samples are finite non-negative numbers", () => {
      for (const ms of sortedLatencies) {
        expect(Number.isFinite(ms), `latency ${ms} is not finite`).toBe(true);
        expect(ms, `latency ${ms} is negative`).toBeGreaterThanOrEqual(0);
      }
    });

    it(`p95 latency ≤ ${INSERT_P95_THRESHOLD_MS} ms`, () => {
      const p95 = percentile(sortedLatencies, 0.95);
      expect(
        p95,
        `Insert-to-settled p95 ${p95.toFixed(3)} ms exceeds ${INSERT_P95_THRESHOLD_MS} ms threshold`,
      ).toBeLessThanOrEqual(INSERT_P95_THRESHOLD_MS);
    });

    it("p50 latency is a finite non-negative number", () => {
      const p50 = percentile(sortedLatencies, 0.5);
      expect(Number.isFinite(p50)).toBe(true);
      expect(p50).toBeGreaterThanOrEqual(0);
    });

    it("p99 latency is a finite non-negative number", () => {
      const p99 = percentile(sortedLatencies, 0.99);
      expect(Number.isFinite(p99)).toBe(true);
      expect(p99).toBeGreaterThanOrEqual(0);
    });
  });

  // -----------------------------------------------------------------------
  // Anchor realignment after pan/zoom
  // -----------------------------------------------------------------------

  describe("anchor realignment after pan/zoom", () => {
    let baseAnchors: RendererEdgeAnchor[];
    let sortedLatencies: number[];

    beforeAll(() => {
      const graph = buildLargeGraph();
      baseAnchors = computeEdgeAnchors(graph);

      expect(baseAnchors).toHaveLength(TARGET_EDGE_COUNT);

      const latencies: number[] = [];
      for (let i = 0; i < ITERATIONS; i++) {
        latencies.push(measureAnchorRealignment(baseAnchors));
      }

      sortedLatencies = latencies.slice().sort((a, b) => a - b);
      logReport("anchor-realignment", sortedLatencies);
    });

    it(`collects ${ITERATIONS} latency samples`, () => {
      expect(sortedLatencies).toHaveLength(ITERATIONS);
    });

    it("all samples are finite non-negative numbers", () => {
      for (const ms of sortedLatencies) {
        expect(Number.isFinite(ms), `latency ${ms} is not finite`).toBe(true);
        expect(ms, `latency ${ms} is negative`).toBeGreaterThanOrEqual(0);
      }
    });

    it(`p95 latency ≤ ${ANCHOR_P95_THRESHOLD_MS} ms`, () => {
      const p95 = percentile(sortedLatencies, 0.95);
      expect(
        p95,
        `Anchor realignment p95 ${p95.toFixed(3)} ms exceeds ${ANCHOR_P95_THRESHOLD_MS} ms threshold`,
      ).toBeLessThanOrEqual(ANCHOR_P95_THRESHOLD_MS);
    });

    it("p50 latency is a finite non-negative number", () => {
      const p50 = percentile(sortedLatencies, 0.5);
      expect(Number.isFinite(p50)).toBe(true);
      expect(p50).toBeGreaterThanOrEqual(0);
    });

    it("p99 latency is a finite non-negative number", () => {
      const p99 = percentile(sortedLatencies, 0.99);
      expect(Number.isFinite(p99)).toBe(true);
      expect(p99).toBeGreaterThanOrEqual(0);
    });
  });
});
