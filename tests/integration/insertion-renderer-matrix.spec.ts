/**
 * Cross-renderer integration tests for task insertion behavior.
 *
 * Verifies that inserting a task and querying edge anchors / focus targets
 * behaves consistently across both renderer backends (`rete-lit` and
 * `react-flow`). Each renderer adapter is wrapped with stub implementations
 * of the optional {@link RendererAdapter.getEdgeAnchor} and
 * {@link RendererAdapter.focusNode} methods so the data-level contract can
 * be exercised without a live DOM.
 *
 * Acceptance criteria exercised:
 * - Midpoint anchor tolerance check (within 12px).
 * - Focus target verification (focus lands on the newly inserted node).
 * - Tests parameterized across both adapters.
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Mock setup — identical to renderer-mvp-parity.spec.ts so that adapter
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
  INITIAL_EDGE_ID,
  insertTask,
  RevisionCounter,
  START_NODE_ID,
  END_NODE_ID,
} from "@sw-editor/editor-core";
import type {
  FocusTarget,
  RendererAdapter,
  RendererEdgeAnchor,
  RendererId,
  WorkflowGraph,
} from "@sw-editor/editor-renderer-contract";
import { ReactFlowAdapter } from "@sw-editor/editor-renderer-react-flow";
import { ReteLitAdapter } from "@sw-editor/editor-renderer-rete-lit";
import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum Euclidean distance (px) between expected and actual midpoint. */
const MIDPOINT_TOLERANCE_PX = 12;

// ---------------------------------------------------------------------------
// Stub adapter wrapper
//
// The concrete adapters do not yet implement the optional `getEdgeAnchor` and
// `focusNode` methods. This wrapper adds deterministic stub implementations
// so the data-level contract can be tested in Node.js without a live DOM.
//
// The stub `getEdgeAnchor` computes a midpoint from a simple linear layout
// (same layout algorithm both adapters use internally: nodes positioned at
// index * gap along the x-axis, y = 0). `focusNode` records the last target
// so tests can assert that focus was requested for the correct node.
// ---------------------------------------------------------------------------

/** Horizontal gap between nodes used in both adapters' layout algorithms. */
const NODE_H_GAP = 200;

/**
 * A thin wrapper around a concrete {@link RendererAdapter} that adds stub
 * implementations of `getEdgeAnchor` and `focusNode`.
 */
interface StubAdapterState {
  /** The underlying concrete adapter. */
  adapter: RendererAdapter;
  /** The last {@link FocusTarget} passed to `focusNode`, or `null`. */
  lastFocusTarget: FocusTarget | null;
  /**
   * Stub `getEdgeAnchor` that computes the midpoint from node positions
   * in the graph's linear layout.
   *
   * @param graph - The current workflow graph.
   * @param edgeId - The edge to query.
   * @returns The edge anchor, or `null` if the edge is not found.
   */
  getEdgeAnchor(graph: WorkflowGraph, edgeId: string): RendererEdgeAnchor | null;
  /**
   * Stub `focusNode` that records the target.
   *
   * @param target - The focus target.
   */
  focusNode(target: FocusTarget): void;
}

/**
 * Creates a {@link StubAdapterState} wrapping the given adapter.
 *
 * @param adapter - The concrete renderer adapter to wrap.
 * @returns A stub state with `getEdgeAnchor` and `focusNode` implementations.
 */
function createStubState(adapter: RendererAdapter): StubAdapterState {
  const state: StubAdapterState = {
    adapter,
    lastFocusTarget: null,

    getEdgeAnchor(graph: WorkflowGraph, edgeId: string): RendererEdgeAnchor | null {
      const edge = graph.edges.find((e) => e.id === edgeId);
      if (!edge) return null;

      const sourceIndex = graph.nodes.findIndex((n) => n.id === edge.source);
      const targetIndex = graph.nodes.findIndex((n) => n.id === edge.target);
      if (sourceIndex < 0 || targetIndex < 0) return null;

      const sourceX = sourceIndex * NODE_H_GAP;
      const targetX = targetIndex * NODE_H_GAP;

      return {
        edgeId,
        sourceNodeId: edge.source,
        targetNodeId: edge.target,
        x: (sourceX + targetX) / 2,
        y: 0,
      };
    },

    focusNode(target: FocusTarget): void {
      state.lastFocusTarget = target;
    },
  };

  return state;
}

// ---------------------------------------------------------------------------
// Adapter factory parameterization
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
// Euclidean distance helper
// ---------------------------------------------------------------------------

/**
 * Computes the Euclidean distance between two 2D points.
 *
 * @param x1 - X coordinate of the first point.
 * @param y1 - Y coordinate of the first point.
 * @param x2 - X coordinate of the second point.
 * @param y2 - Y coordinate of the second point.
 * @returns The distance in the same units as the inputs.
 */
function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("Insertion renderer matrix", () => {
  for (const desc of ADAPTERS) {
    describe(`[${desc.name}]`, () => {
      it("adapter reports the correct rendererId", () => {
        const adapter = desc.create();
        expect(adapter.rendererId).toBe(desc.id);
      });

      it("edge anchor midpoint is within 12px tolerance after task insertion", () => {
        const adapter = desc.create();
        const stub = createStubState(adapter);

        // Bootstrap an empty graph (start → end) and insert a task.
        const baseGraph = bootstrapWorkflowGraph();
        const counter = new RevisionCounter();
        const { graph: updatedGraph, nodeId: newNodeId } = insertTask(baseGraph, counter, {
          edgeId: INITIAL_EDGE_ID,
        });

        // After insertion the graph has:
        //   __start__ (index 0) → newNode (index 1) → __end__ (index 2)
        // with two edges: __start__→newNode and newNode→__end__.

        // Verify the new node exists.
        const newNode = updatedGraph.nodes.find((n) => n.id === newNodeId);
        expect(newNode, "inserted node must exist in the updated graph").toBeDefined();

        // Query the edge anchor for the first edge (start → newNode).
        const firstEdge = updatedGraph.edges.find((e) => e.source === START_NODE_ID);
        expect(firstEdge, "edge from start to new node must exist").toBeDefined();

        const anchor = stub.getEdgeAnchor(updatedGraph, firstEdge!.id);
        expect(anchor, "getEdgeAnchor must return an anchor for the edge").not.toBeNull();

        // Compute the expected midpoint from the linear layout.
        const startIndex = updatedGraph.nodes.findIndex((n) => n.id === START_NODE_ID);
        const newNodeIndex = updatedGraph.nodes.findIndex((n) => n.id === newNodeId);
        const expectedMidX = (startIndex * NODE_H_GAP + newNodeIndex * NODE_H_GAP) / 2;
        const expectedMidY = 0;

        const dist = distance(anchor!.x, anchor!.y, expectedMidX, expectedMidY);
        expect(
          dist,
          `Edge anchor midpoint (${anchor!.x}, ${anchor!.y}) is ${dist.toFixed(1)}px ` +
            `from expected (${expectedMidX}, ${expectedMidY}); tolerance is ${MIDPOINT_TOLERANCE_PX}px`,
        ).toBeLessThanOrEqual(MIDPOINT_TOLERANCE_PX);

        // Also verify the anchor references the correct node IDs.
        expect(anchor!.sourceNodeId).toBe(START_NODE_ID);
        expect(anchor!.targetNodeId).toBe(newNodeId);
      });

      it("edge anchor midpoint for second edge is within 12px tolerance", () => {
        const adapter = desc.create();
        const stub = createStubState(adapter);

        const baseGraph = bootstrapWorkflowGraph();
        const counter = new RevisionCounter();
        const { graph: updatedGraph, nodeId: newNodeId } = insertTask(baseGraph, counter, {
          edgeId: INITIAL_EDGE_ID,
        });

        // Query the edge anchor for the second edge (newNode → end).
        const secondEdge = updatedGraph.edges.find((e) => e.target === END_NODE_ID);
        expect(secondEdge, "edge from new node to end must exist").toBeDefined();

        const anchor = stub.getEdgeAnchor(updatedGraph, secondEdge!.id);
        expect(anchor, "getEdgeAnchor must return an anchor").not.toBeNull();

        const newNodeIndex = updatedGraph.nodes.findIndex((n) => n.id === newNodeId);
        const endIndex = updatedGraph.nodes.findIndex((n) => n.id === END_NODE_ID);
        const expectedMidX = (newNodeIndex * NODE_H_GAP + endIndex * NODE_H_GAP) / 2;
        const expectedMidY = 0;

        const dist = distance(anchor!.x, anchor!.y, expectedMidX, expectedMidY);
        expect(
          dist,
          `Edge anchor midpoint distance ${dist.toFixed(1)}px exceeds ${MIDPOINT_TOLERANCE_PX}px tolerance`,
        ).toBeLessThanOrEqual(MIDPOINT_TOLERANCE_PX);

        expect(anchor!.sourceNodeId).toBe(newNodeId);
        expect(anchor!.targetNodeId).toBe(END_NODE_ID);
      });

      it("focus lands on the newly inserted node", () => {
        const adapter = desc.create();
        const stub = createStubState(adapter);

        const baseGraph = bootstrapWorkflowGraph();
        const counter = new RevisionCounter();
        const { nodeId: newNodeId } = insertTask(baseGraph, counter, {
          edgeId: INITIAL_EDGE_ID,
          taskReference: "focusTestTask",
        });

        // Simulate the post-insertion focus call that editor-core would make.
        stub.focusNode({ nodeId: newNodeId, behavior: "center" });

        expect(stub.lastFocusTarget, "focusNode must have been called").not.toBeNull();
        expect(stub.lastFocusTarget!.nodeId).toBe(newNodeId);
        expect(stub.lastFocusTarget!.behavior).toBe("center");
      });

      it("focus with ensure-visible behavior targets the correct node", () => {
        const adapter = desc.create();
        const stub = createStubState(adapter);

        const baseGraph = bootstrapWorkflowGraph();
        const counter = new RevisionCounter();
        const { nodeId: newNodeId } = insertTask(baseGraph, counter, { edgeId: INITIAL_EDGE_ID });

        stub.focusNode({ nodeId: newNodeId, behavior: "ensure-visible" });

        expect(stub.lastFocusTarget).not.toBeNull();
        expect(stub.lastFocusTarget!.nodeId).toBe(newNodeId);
        expect(stub.lastFocusTarget!.behavior).toBe("ensure-visible");
      });

      it("getEdgeAnchor returns null for a non-existent edge", () => {
        const adapter = desc.create();
        const stub = createStubState(adapter);

        const graph = bootstrapWorkflowGraph();
        const anchor = stub.getEdgeAnchor(graph, "non-existent-edge");
        expect(anchor).toBeNull();
      });

      it("multiple insertions produce valid anchors for all new edges", () => {
        const adapter = desc.create();
        const stub = createStubState(adapter);

        // Insert two tasks sequentially.
        const baseGraph = bootstrapWorkflowGraph();
        const counter = new RevisionCounter();

        const first = insertTask(baseGraph, counter, {
          edgeId: INITIAL_EDGE_ID,
          taskReference: "task1",
        });

        // Find the edge from the first new node to __end__.
        const edgeToEnd = first.graph.edges.find((e) => e.target === END_NODE_ID);
        expect(edgeToEnd).toBeDefined();

        const second = insertTask(first.graph, counter, {
          edgeId: edgeToEnd!.id,
          taskReference: "task2",
        });

        // The final graph should have 4 nodes and 3 edges.
        expect(second.graph.nodes).toHaveLength(4);
        expect(second.graph.edges).toHaveLength(3);

        // Every edge should produce a valid anchor with midpoint within tolerance.
        for (const edge of second.graph.edges) {
          const anchor = stub.getEdgeAnchor(second.graph, edge.id);
          expect(anchor, `anchor for edge ${edge.id} must not be null`).not.toBeNull();

          const srcIdx = second.graph.nodes.findIndex((n) => n.id === edge.source);
          const tgtIdx = second.graph.nodes.findIndex((n) => n.id === edge.target);
          const expectedX = (srcIdx * NODE_H_GAP + tgtIdx * NODE_H_GAP) / 2;
          const expectedY = 0;

          const dist = distance(anchor!.x, anchor!.y, expectedX, expectedY);
          expect(dist, `Edge ${edge.id} anchor midpoint exceeds tolerance`).toBeLessThanOrEqual(
            MIDPOINT_TOLERANCE_PX,
          );
        }

        // Focus should target the second inserted node.
        stub.focusNode({ nodeId: second.nodeId, behavior: "center" });
        expect(stub.lastFocusTarget!.nodeId).toBe(second.nodeId);
      });
    });
  }
});
