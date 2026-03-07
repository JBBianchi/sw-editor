/**
 * Regression tests for stale-anchor cleanup during graph revision changes.
 *
 * Verifies that edge insertion anchors are correctly added, removed, and
 * re-established when the workflow graph changes — covering edge removal,
 * edge addition, full graph reload, and rapid add/remove cycles.
 *
 * Tests are parameterized across both renderer backends (`rete-lit` and
 * `react-flow`) using stub adapter implementations that exercise the
 * data-level anchor contract without requiring a live DOM.
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Mock setup — mirrors insertion-renderer-matrix.spec.ts so that adapter
// modules can be imported in a Node.js environment.
// ---------------------------------------------------------------------------

import { vi } from "vitest";

vi.mock("@retejs/lit-plugin", () => {
  class LitPlugin {
    addPreset(_preset: unknown): void {}
  }
  return {
    LitPlugin,
    LitArea2D: {},
    Presets: { classic: { setup: () => ({}) } },
  };
});

vi.mock("rete", () => {
  class Socket {
    constructor(public readonly name: string) {}
  }
  class Output {}
  class Input {}
  class Node {
    id = `rete-node-${Math.random().toString(36).slice(2)}`;
    addOutput(_key: string, _output: Output): void {}
    addInput(_key: string, _input: Input): void {}
  }
  class Connection {
    id = `rete-conn-${Math.random().toString(36).slice(2)}`;
  }
  class NodeEditor {
    use(_plugin: unknown): void {}
    async clear(): Promise<void> {}
    async addNode(_node: Node): Promise<void> {}
    async addConnection(_conn: Connection): Promise<void> {}
    getNodes(): Node[] {
      return [];
    }
  }
  return {
    ClassicPreset: { Socket, Output, Input, Node, Connection },
    NodeEditor,
    GetSchemes: {},
  };
});

vi.mock("rete-area-plugin", () => {
  class Selector<T> {
    add(_entity: T, _accumulate: boolean): void {}
    remove(_entity: T): void {}
  }
  class AreaPlugin {
    use(_plugin: unknown): void {}
    async translate(_id: string, _position: { x: number; y: number }): Promise<void> {}
    destroy(): void {}
  }
  const AreaExtensions = {
    selectableNodes: (_area: unknown, _selector: unknown, _opts: unknown): void => {},
    accumulateOnCtrl: () => ({}),
    simpleNodesOrder: (_area: unknown): void => {},
    zoomAt: (_area: unknown, _nodes: unknown[]): Promise<void> => Promise.resolve(),
    Selector,
  };
  return { AreaPlugin, AreaExtensions };
});

vi.mock("rete-connection-plugin", () => {
  class ConnectionPlugin {
    addPreset(_preset: unknown): void {}
  }
  return {
    ConnectionPlugin,
    Presets: { classic: { setup: () => ({}) } },
  };
});

vi.mock("react", () => {
  const createElement = (
    type: unknown,
    props: unknown,
    ...children: unknown[]
  ): { type: unknown; props: unknown; children: unknown[] } => ({
    type,
    props,
    children,
  });
  return {
    default: { createElement },
    createElement,
    useState: <T>(initial: T): [T, (v: T) => void] => [initial, () => {}],
    useLayoutEffect: (_fn: () => void): void => {},
  };
});

vi.mock("react-dom/client", () => ({
  createRoot: (_container: unknown) => ({
    render(_element: unknown): void {},
    unmount(): void {},
  }),
}));

vi.mock("@xyflow/react", () => ({
  ReactFlow: {},
  ReactFlowProvider: {},
}));

// ---------------------------------------------------------------------------
// Imports — must follow vi.mock() declarations (hoisted by Vitest).
// ---------------------------------------------------------------------------

import {
  bootstrapWorkflowGraph,
  END_NODE_ID,
  INITIAL_EDGE_ID,
  insertTask,
  RevisionCounter,
  START_NODE_ID,
  type WorkflowGraph,
} from "@sw-editor/editor-core";
import type {
  EdgeInsertionAnchor,
  RendererAdapter,
  RendererEdgeAnchor,
  RendererId,
} from "@sw-editor/editor-renderer-contract";
import { ReactFlowAdapter } from "@sw-editor/editor-renderer-react-flow";
import { ReteLitAdapter } from "@sw-editor/editor-renderer-rete-lit";
import { describe, expect, it } from "vitest";

import { assertMidpointWithinTolerance, type Point } from "./geometry-assertions.helpers.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Horizontal gap between nodes in the linear layout used by both adapters. */
const NODE_H_GAP = 200;

/** Midpoint tolerance for anchor position assertions. */
const MIDPOINT_TOLERANCE_PX = 6;

// ---------------------------------------------------------------------------
// Stub adapter helpers
// ---------------------------------------------------------------------------

/**
 * Builds a set of insertion anchors from the current graph by computing
 * midpoints of each edge using the linear layout convention.
 *
 * @param graph - The workflow graph to derive anchors from.
 * @returns An array of edge insertion anchors.
 */
function computeInsertionAnchors(graph: WorkflowGraph): EdgeInsertionAnchor[] {
  return graph.edges
    .map((edge) => {
      const srcIdx = graph.nodes.findIndex((n) => n.id === edge.source);
      const tgtIdx = graph.nodes.findIndex((n) => n.id === edge.target);
      if (srcIdx < 0 || tgtIdx < 0) return null;
      return {
        edgeId: edge.id,
        x: (srcIdx * NODE_H_GAP + tgtIdx * NODE_H_GAP) / 2,
        y: 0,
      };
    })
    .filter((a): a is EdgeInsertionAnchor => a !== null);
}

/**
 * Computes a single edge anchor with source/target node IDs for the given
 * edge in the graph.
 *
 * @param graph - The workflow graph.
 * @param edgeId - The edge to query.
 * @returns The edge anchor, or `null` if the edge is not found.
 */
function computeEdgeAnchor(graph: WorkflowGraph, edgeId: string): RendererEdgeAnchor | null {
  const edge = graph.edges.find((e) => e.id === edgeId);
  if (!edge) return null;

  const srcIdx = graph.nodes.findIndex((n) => n.id === edge.source);
  const tgtIdx = graph.nodes.findIndex((n) => n.id === edge.target);
  if (srcIdx < 0 || tgtIdx < 0) return null;

  return {
    edgeId,
    sourceNodeId: edge.source,
    targetNodeId: edge.target,
    x: (srcIdx * NODE_H_GAP + tgtIdx * NODE_H_GAP) / 2,
    y: 0,
  };
}

/**
 * Tracks anchor state across graph revisions, simulating the pruning and
 * reconciliation logic that {@link InsertionUI.updateGraph} performs.
 */
interface AnchorTracker {
  /** Currently tracked anchors keyed by edgeId. */
  anchors: Map<string, EdgeInsertionAnchor>;
  /**
   * Reconciles the tracked anchor set against a new graph revision.
   * Removes anchors for deleted edges, adds anchors for new edges, and
   * updates positions for existing edges.
   *
   * @param graph - The updated workflow graph.
   */
  updateGraph(graph: WorkflowGraph): void;
}

/**
 * Creates a fresh anchor tracker initialized from the given graph.
 *
 * @param initialGraph - The initial workflow graph to seed anchors from.
 * @returns A new anchor tracker instance.
 */
function createAnchorTracker(initialGraph: WorkflowGraph): AnchorTracker {
  const tracker: AnchorTracker = {
    anchors: new Map<string, EdgeInsertionAnchor>(),

    updateGraph(graph: WorkflowGraph): void {
      const currentEdgeIds = new Set(graph.edges.map((e) => e.id));

      // Prune: remove anchors for edges that no longer exist.
      for (const edgeId of tracker.anchors.keys()) {
        if (!currentEdgeIds.has(edgeId)) {
          tracker.anchors.delete(edgeId);
        }
      }

      // Reconcile: add new anchors and update existing positions.
      const freshAnchors = computeInsertionAnchors(graph);
      for (const anchor of freshAnchors) {
        tracker.anchors.set(anchor.edgeId, anchor);
      }
    },
  };

  // Seed from initial graph.
  const initialAnchors = computeInsertionAnchors(initialGraph);
  for (const anchor of initialAnchors) {
    tracker.anchors.set(anchor.edgeId, anchor);
  }

  return tracker;
}

// ---------------------------------------------------------------------------
// Adapter parameterization
// ---------------------------------------------------------------------------

/**
 * Descriptor for a renderer backend used to parameterize tests.
 */
interface AdapterDescriptor {
  /** Human-readable name for test titles. */
  name: string;
  /** The renderer ID that the adapter should report. */
  id: RendererId;
  /** Factory that creates a fresh adapter instance. */
  create(): RendererAdapter;
}

const ADAPTERS: AdapterDescriptor[] = [
  {
    name: "rete-lit",
    id: "rete-lit",
    create: () => new ReteLitAdapter(),
  },
  {
    name: "react-flow",
    id: "react-flow",
    create: () => new ReactFlowAdapter(),
  },
];

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("insertion-anchor-refresh — stale anchor cleanup on graph revision", () => {
  for (const desc of ADAPTERS) {
    describe(`[${desc.name}]`, () => {
      it("removes anchor for an edge that was deleted after task insertion", () => {
        const adapter = desc.create();
        expect(adapter.rendererId).toBe(desc.id);

        // Start with a bootstrapped graph: start → end (one edge).
        const baseGraph = bootstrapWorkflowGraph();
        const tracker = createAnchorTracker(baseGraph);

        // Precondition: one anchor exists for the initial edge.
        expect(tracker.anchors.size).toBe(1);
        expect(tracker.anchors.has(INITIAL_EDGE_ID)).toBe(true);

        // Insert a task, which removes the initial edge and adds two new edges.
        const counter = new RevisionCounter();
        const { graph: afterInsert } = insertTask(baseGraph, counter, {
          edgeId: INITIAL_EDGE_ID,
        });

        tracker.updateGraph(afterInsert);

        // The initial edge no longer exists; its anchor must be pruned.
        expect(tracker.anchors.has(INITIAL_EDGE_ID)).toBe(false);

        // Two new edges exist; both must have anchors.
        expect(tracker.anchors.size).toBe(afterInsert.edges.length);
        for (const edge of afterInsert.edges) {
          expect(
            tracker.anchors.has(edge.id),
            `anchor must exist for edge ${edge.id}`,
          ).toBe(true);
        }
      });

      it("creates anchor for a newly added edge after insertion", () => {
        const adapter = desc.create();
        expect(adapter.rendererId).toBe(desc.id);

        const baseGraph = bootstrapWorkflowGraph();
        const counter = new RevisionCounter();

        const { graph: afterInsert, nodeId: newNodeId } = insertTask(baseGraph, counter, {
          edgeId: INITIAL_EDGE_ID,
        });

        const tracker = createAnchorTracker(afterInsert);

        // Both new edges should have anchors.
        const edgeFromStart = afterInsert.edges.find((e) => e.source === START_NODE_ID);
        const edgeToEnd = afterInsert.edges.find((e) => e.target === END_NODE_ID);
        expect(edgeFromStart).toBeDefined();
        expect(edgeToEnd).toBeDefined();

        expect(tracker.anchors.has(edgeFromStart!.id)).toBe(true);
        expect(tracker.anchors.has(edgeToEnd!.id)).toBe(true);

        // Verify anchor positions are at edge midpoints within tolerance.
        const anchorStart = tracker.anchors.get(edgeFromStart!.id)!;
        const startIdx = afterInsert.nodes.findIndex((n) => n.id === START_NODE_ID);
        const newIdx = afterInsert.nodes.findIndex((n) => n.id === newNodeId);
        const edgePath: Point[] = [
          { x: startIdx * NODE_H_GAP, y: 0 },
          { x: newIdx * NODE_H_GAP, y: 0 },
        ];
        assertMidpointWithinTolerance(anchorStart, edgePath, MIDPOINT_TOLERANCE_PX);

        const anchorEnd = tracker.anchors.get(edgeToEnd!.id)!;
        const endIdx = afterInsert.nodes.findIndex((n) => n.id === END_NODE_ID);
        const edgePath2: Point[] = [
          { x: newIdx * NODE_H_GAP, y: 0 },
          { x: endIdx * NODE_H_GAP, y: 0 },
        ];
        assertMidpointWithinTolerance(anchorEnd, edgePath2, MIDPOINT_TOLERANCE_PX);
      });

      it("re-establishes all anchors after a full graph reload", () => {
        const adapter = desc.create();
        expect(adapter.rendererId).toBe(desc.id);

        // Build a graph with two insertions.
        const baseGraph = bootstrapWorkflowGraph();
        const counter = new RevisionCounter();

        const first = insertTask(baseGraph, counter, {
          edgeId: INITIAL_EDGE_ID,
          taskReference: "task1",
        });
        const edgeToEnd = first.graph.edges.find((e) => e.target === END_NODE_ID);
        const second = insertTask(first.graph, counter, {
          edgeId: edgeToEnd!.id,
          taskReference: "task2",
        });

        const tracker = createAnchorTracker(second.graph);
        expect(tracker.anchors.size).toBe(3);

        // Simulate a full graph reload by creating a fresh bootstrapped graph.
        const reloadedGraph = bootstrapWorkflowGraph();
        tracker.updateGraph(reloadedGraph);

        // After reload, only the initial edge anchor should remain.
        expect(tracker.anchors.size).toBe(1);
        expect(tracker.anchors.has(INITIAL_EDGE_ID)).toBe(true);

        // Verify the anchor position matches the reloaded graph.
        const anchor = tracker.anchors.get(INITIAL_EDGE_ID)!;
        const reloadedAnchor = computeEdgeAnchor(reloadedGraph, INITIAL_EDGE_ID);
        expect(reloadedAnchor).not.toBeNull();
        expect(anchor.x).toBe(reloadedAnchor!.x);
        expect(anchor.y).toBe(reloadedAnchor!.y);

        // Now reload back to the complex graph — all 3 anchors re-established.
        tracker.updateGraph(second.graph);
        expect(tracker.anchors.size).toBe(3);
        for (const edge of second.graph.edges) {
          expect(
            tracker.anchors.has(edge.id),
            `anchor for edge ${edge.id} must be re-established after reload`,
          ).toBe(true);
        }
      });

      it("produces no duplicate anchors after rapid add/remove cycles", () => {
        const adapter = desc.create();
        expect(adapter.rendererId).toBe(desc.id);

        const baseGraph = bootstrapWorkflowGraph();
        const tracker = createAnchorTracker(baseGraph);
        const counter = new RevisionCounter();

        // Rapid cycle 1: insert a task.
        const insert1 = insertTask(baseGraph, counter, {
          edgeId: INITIAL_EDGE_ID,
          taskReference: "rapid1",
        });
        tracker.updateGraph(insert1.graph);

        // Rapid cycle 2: insert another task on the first new edge.
        const edgeFromStart = insert1.graph.edges.find((e) => e.source === START_NODE_ID);
        const insert2 = insertTask(insert1.graph, counter, {
          edgeId: edgeFromStart!.id,
          taskReference: "rapid2",
        });
        tracker.updateGraph(insert2.graph);

        // Rapid cycle 3: reload back to base graph (simulating undo).
        tracker.updateGraph(baseGraph);

        // Rapid cycle 4: re-insert from base.
        const insert3 = insertTask(baseGraph, counter, {
          edgeId: INITIAL_EDGE_ID,
          taskReference: "rapid3",
        });
        tracker.updateGraph(insert3.graph);

        // Verify: anchor count equals edge count — no duplicates.
        expect(tracker.anchors.size).toBe(insert3.graph.edges.length);

        // Verify each anchor edgeId matches an existing edge.
        const currentEdgeIds = new Set(insert3.graph.edges.map((e) => e.id));
        for (const [edgeId] of tracker.anchors) {
          expect(
            currentEdgeIds.has(edgeId),
            `anchor ${edgeId} must correspond to an existing edge`,
          ).toBe(true);
        }

        // Verify no stale anchors from previous cycles remain.
        for (const edge of insert1.graph.edges) {
          if (!currentEdgeIds.has(edge.id)) {
            expect(
              tracker.anchors.has(edge.id),
              `stale anchor ${edge.id} from cycle 1 must not exist`,
            ).toBe(false);
          }
        }
        for (const edge of insert2.graph.edges) {
          if (!currentEdgeIds.has(edge.id)) {
            expect(
              tracker.anchors.has(edge.id),
              `stale anchor ${edge.id} from cycle 2 must not exist`,
            ).toBe(false);
          }
        }

        // Double-update with the same graph should not change anchor count.
        const sizeBefore = tracker.anchors.size;
        tracker.updateGraph(insert3.graph);
        expect(tracker.anchors.size).toBe(sizeBefore);
      });
    });
  }
});
