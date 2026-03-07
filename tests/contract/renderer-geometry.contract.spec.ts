/**
 * @vitest-environment happy-dom
 */

/**
 * Contract tests for renderer geometry surface.
 *
 * Verifies that both renderer adapters (React Flow and Rete-Lit) satisfy the
 * geometry contract methods defined in {@link RendererAdapter}:
 * - `getLayoutSnapshot()`
 * - `getInsertionAnchors()`
 * - `setOrientation()`
 * - `onViewportChange()`
 *
 * Uses contract types from `@sw-editor/editor-renderer-contract` (T004/T005).
 *
 * @module
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Stub browser-specific dependencies required by the rete-lit renderer.
// ---------------------------------------------------------------------------

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
  class Output {
    // biome-ignore lint/complexity/noUselessConstructor: stub constructor matches rete.js Output signature for TypeScript compatibility
    constructor(_socket: Socket) {}
  }
  class Input {
    // biome-ignore lint/complexity/noUselessConstructor: stub constructor matches rete.js Input signature for TypeScript compatibility
    constructor(_socket: Socket) {}
  }
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
  return { ClassicPreset: { Socket, Output, Input, Node, Connection }, NodeEditor, GetSchemes: {} };
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
  return { ConnectionPlugin, Presets: { classic: { setup: () => ({}) } } };
});

// ---------------------------------------------------------------------------
// Imports — must come after vi.mock() calls (they are hoisted by Vitest).
// ---------------------------------------------------------------------------

import type {
  EdgeInsertionAnchor,
  LayoutSnapshot,
  OrientationMode,
  RendererAdapter,
  WorkflowGraph,
} from "@sw-editor/editor-renderer-contract";
import { ReactFlowAdapter } from "@sw-editor/editor-renderer-react-flow";
import { ReteLitAdapter } from "@sw-editor/editor-renderer-rete-lit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Adapter entry with a human-readable label. */
interface AdapterEntry {
  label: string;
  createAdapter: () => RendererAdapter;
}

/**
 * Define a stable mocked bounding rectangle for an element.
 *
 * @param element - Element to patch.
 * @param rect - Rectangle values.
 */
function setMockRect(
  element: Element,
  rect: { left: number; top: number; width: number; height: number },
): void {
  Object.defineProperty(element, "getBoundingClientRect", {
    value: () =>
      ({
        x: rect.left,
        y: rect.top,
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
        toJSON: () => ({}),
      }) satisfies DOMRect,
    configurable: true,
  });
}

/**
 * Build an SVG path element with deterministic geometry APIs for tests.
 *
 * @param points - Ordered points defining a polyline.
 * @returns SVG path element.
 */
function createMockSvgPath(points: Array<{ x: number; y: number }>): SVGPathElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  svg.append(path);

  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    segmentLengths.push(len);
    totalLength += len;
  }

  const pathAny = path as unknown as {
    getTotalLength: () => number;
    getPointAtLength: (distance: number) => DOMPoint;
    getScreenCTM: () => DOMMatrix | null;
  };

  pathAny.getTotalLength = () => totalLength;
  pathAny.getScreenCTM = () => null;
  pathAny.getPointAtLength = (distance: number) => {
    if (points.length === 0) {
      return { x: 0, y: 0 } as DOMPoint;
    }
    if (distance <= 0 || segmentLengths.length === 0) {
      const p = points[0]!;
      return { x: p.x, y: p.y } as DOMPoint;
    }
    if (distance >= totalLength) {
      const p = points[points.length - 1]!;
      return { x: p.x, y: p.y } as DOMPoint;
    }

    let traversed = 0;
    for (let i = 0; i < segmentLengths.length; i++) {
      const segLen = segmentLengths[i]!;
      if (traversed + segLen >= distance) {
        const from = points[i]!;
        const to = points[i + 1]!;
        const t = segLen === 0 ? 0 : (distance - traversed) / segLen;
        return {
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
        } as DOMPoint;
      }
      traversed += segLen;
    }

    const p = points[points.length - 1]!;
    return { x: p.x, y: p.y } as DOMPoint;
  };

  return path;
}

/**
 * Configure adapter internals with deterministic DOM geometry for snapshot tests.
 *
 * @param adapter - Adapter under test.
 * @returns The graph used to configure internals.
 */
function configureDomSnapshotFixture(adapter: RendererAdapter): WorkflowGraph {
  const graph: WorkflowGraph = {
    nodes: [
      { id: "__start__", kind: "start", data: {} },
      { id: "task-a", kind: "task", data: { name: "A" } },
      { id: "__end__", kind: "end", data: {} },
    ],
    edges: [
      { id: "e1", source: "__start__", target: "task-a" },
      { id: "e2", source: "task-a", target: "__end__" },
    ],
  };

  const container = document.createElement("div");
  setMockRect(container, { left: 100, top: 200, width: 1000, height: 800 });

  const reactStart = document.createElement("div");
  reactStart.className = "react-flow__node";
  reactStart.setAttribute("data-id", "__start__");
  setMockRect(reactStart, { left: 140, top: 230, width: 120, height: 48 });
  container.append(reactStart);

  const reactTask = document.createElement("div");
  reactTask.className = "react-flow__node";
  reactTask.setAttribute("data-id", "task-a");
  setMockRect(reactTask, { left: 390, top: 320, width: 150, height: 58 });
  container.append(reactTask);

  const reactEnd = document.createElement("div");
  reactEnd.className = "react-flow__node";
  reactEnd.setAttribute("data-id", "__end__");
  setMockRect(reactEnd, { left: 700, top: 410, width: 120, height: 48 });
  container.append(reactEnd);

  const edge1Group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  edge1Group.setAttribute("class", "react-flow__edge");
  edge1Group.setAttribute("data-id", "e1");
  const edge1Path = createMockSvgPath([
    { x: 150, y: 64 },
    { x: 260, y: 102 },
    { x: 360, y: 149 },
  ]);
  edge1Path.setAttribute("class", "react-flow__edge-path");
  edge1Group.append(edge1Path);
  container.append(edge1Group);

  const edge2Group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  edge2Group.setAttribute("class", "react-flow__edge");
  edge2Group.setAttribute("data-id", "e2");
  const edge2Path = createMockSvgPath([
    { x: 460, y: 149 },
    { x: 560, y: 175 },
    { x: 670, y: 226 },
  ]);
  edge2Path.setAttribute("class", "react-flow__edge-path");
  edge2Group.append(edge2Path);
  container.append(edge2Group);

  const fallback: LayoutSnapshot = {
    nodes: graph.nodes.map((node) => ({ id: node.id, x: 0, y: 0, width: 1, height: 1 })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      sourceId: edge.source,
      targetId: edge.target,
      path: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
    })),
  };

  if (adapter.rendererId === "react-flow") {
    const internal = adapter as unknown as {
      container: HTMLElement | null;
      lastGraph: WorkflowGraph | null;
      cachedLayout: LayoutSnapshot;
    };
    internal.container = container;
    internal.lastGraph = graph;
    internal.cachedLayout = fallback;
    return graph;
  }

  const reteInternal = adapter as unknown as {
    mounted: {
      container: HTMLElement;
      area: { nodeViews: Map<string, { element: HTMLElement }> };
      editor: unknown;
    } | null;
    lastGraph: WorkflowGraph | null;
    cachedLayout: LayoutSnapshot;
    graphIdToReteNode: Map<string, string>;
    graphIdToReteConn: Map<string, string>;
  };

  const nodeViews = new Map<string, { element: HTMLElement }>();
  const reteNodeA = "rete-node-start";
  const reteNodeB = "rete-node-task";
  const reteNodeC = "rete-node-end";
  nodeViews.set(reteNodeA, { element: reactStart });
  nodeViews.set(reteNodeB, { element: reactTask });
  nodeViews.set(reteNodeC, { element: reactEnd });

  const reteConn1 = "rete-edge-1";
  const reteConn2 = "rete-edge-2";
  const reteConn1Wrap = document.createElement("div");
  reteConn1Wrap.setAttribute("data-testid", `connection-${reteConn1}`);
  reteConn1Wrap.append(createMockSvgPath([{ x: 150, y: 64 }, { x: 260, y: 102 }, { x: 360, y: 149 }]));
  container.append(reteConn1Wrap);
  const reteConn2Wrap = document.createElement("div");
  reteConn2Wrap.setAttribute("data-testid", `connection-${reteConn2}`);
  reteConn2Wrap.append(createMockSvgPath([{ x: 460, y: 149 }, { x: 560, y: 175 }, { x: 670, y: 226 }]));
  container.append(reteConn2Wrap);

  reteInternal.mounted = { container, area: { nodeViews }, editor: {} };
  (reteInternal.mounted.area as { destroy?: () => void }).destroy = () => {};
  reteInternal.lastGraph = graph;
  reteInternal.cachedLayout = fallback;
  reteInternal.graphIdToReteNode.clear();
  reteInternal.graphIdToReteConn.clear();
  reteInternal.graphIdToReteNode.set("__start__", reteNodeA);
  reteInternal.graphIdToReteNode.set("task-a", reteNodeB);
  reteInternal.graphIdToReteNode.set("__end__", reteNodeC);
  reteInternal.graphIdToReteConn.set("e1", reteConn1);
  reteInternal.graphIdToReteConn.set("e2", reteConn2);
  return graph;
}

/**
 * Assert that `snapshot` conforms to the {@link LayoutSnapshot} schema.
 *
 * @param snapshot - The value to validate.
 */
function assertLayoutSnapshot(snapshot: LayoutSnapshot): void {
  expect(snapshot).toBeDefined();
  expect(Array.isArray(snapshot.nodes)).toBe(true);
  expect(Array.isArray(snapshot.edges)).toBe(true);

  for (const node of snapshot.nodes) {
    expect(typeof node.id).toBe("string");
    expect(typeof node.x).toBe("number");
    expect(typeof node.y).toBe("number");
    expect(typeof node.width).toBe("number");
    expect(typeof node.height).toBe("number");
  }

  for (const edge of snapshot.edges) {
    expect(typeof edge.id).toBe("string");
    expect(typeof edge.sourceId).toBe("string");
    expect(typeof edge.targetId).toBe("string");
    expect(Array.isArray(edge.path)).toBe(true);
    for (const point of edge.path) {
      expect(typeof point.x).toBe("number");
      expect(typeof point.y).toBe("number");
    }
  }
}

/**
 * Assert that `anchor` conforms to the {@link EdgeInsertionAnchor} schema.
 *
 * @param anchor - The value to validate.
 */
function assertEdgeInsertionAnchor(anchor: EdgeInsertionAnchor): void {
  expect(typeof anchor.edgeId).toBe("string");
  expect(anchor.edgeId.length).toBeGreaterThan(0);
  expect(typeof anchor.x).toBe("number");
  expect(typeof anchor.y).toBe("number");
}

// ---------------------------------------------------------------------------
// Parameterised test suite — runs against both adapters.
// ---------------------------------------------------------------------------

const adapters: AdapterEntry[] = [
  { label: "react-flow", createAdapter: () => new ReactFlowAdapter() },
  { label: "rete-lit", createAdapter: () => new ReteLitAdapter() },
];

describe.each(adapters)("$label renderer — geometry contract", ({ createAdapter }) => {
  let adapter: RendererAdapter;

  beforeEach(() => {
    adapter = createAdapter();
  });

  afterEach(() => {
    adapter.dispose();
  });

  // -------------------------------------------------------------------
  // getLayoutSnapshot()
  // -------------------------------------------------------------------

  describe("getLayoutSnapshot()", () => {
    it("is a function on the adapter", () => {
      expect(typeof adapter.getLayoutSnapshot).toBe("function");
    });

    it("returns a valid LayoutSnapshot when unmounted (empty graph)", () => {
      const snapshot = adapter.getLayoutSnapshot();
      assertLayoutSnapshot(snapshot);
      expect(snapshot.nodes).toHaveLength(0);
      expect(snapshot.edges).toHaveLength(0);
    });

    it("return type satisfies LayoutSnapshot schema", () => {
      const snapshot: LayoutSnapshot = adapter.getLayoutSnapshot();
      expect(snapshot).toHaveProperty("nodes");
      expect(snapshot).toHaveProperty("edges");
    });

    it("returns viewport-relative node frames and edge paths from rendered DOM geometry", () => {
      configureDomSnapshotFixture(adapter);
      const snapshot = adapter.getLayoutSnapshot();
      assertLayoutSnapshot(snapshot);

      expect(snapshot.nodes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "__start__", x: 40, y: 30, width: 120, height: 48 }),
          expect.objectContaining({ id: "task-a", x: 290, y: 120, width: 150, height: 58 }),
          expect.objectContaining({ id: "__end__", x: 600, y: 210, width: 120, height: 48 }),
        ]),
      );
      expect(snapshot.edges).toHaveLength(2);
      for (const edge of snapshot.edges) {
        expect(edge.path.length).toBeGreaterThanOrEqual(2);
      }
    });

    it("returns a defensive copy that cannot mutate adapter-internal snapshot state", () => {
      configureDomSnapshotFixture(adapter);
      const first = adapter.getLayoutSnapshot();
      first.nodes[0]!.x = -999;
      first.edges[0]!.path[0]!.x = -999;

      const second = adapter.getLayoutSnapshot();
      expect(second.nodes[0]!.x).not.toBe(-999);
      expect(second.edges[0]!.path[0]!.x).not.toBe(-999);
    });
  });

  // -------------------------------------------------------------------
  // getInsertionAnchors()
  // -------------------------------------------------------------------

  describe("getInsertionAnchors()", () => {
    it("is a function on the adapter", () => {
      expect(typeof adapter.getInsertionAnchors).toBe("function");
    });

    it("returns an array when unmounted (no edges)", () => {
      const anchors = adapter.getInsertionAnchors();
      expect(Array.isArray(anchors)).toBe(true);
      expect(anchors).toHaveLength(0);
    });

    it("return type is EdgeInsertionAnchor[]", () => {
      const anchors: EdgeInsertionAnchor[] = adapter.getInsertionAnchors();
      expect(Array.isArray(anchors)).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // setOrientation()
  // -------------------------------------------------------------------

  describe("setOrientation()", () => {
    it("is a function on the adapter", () => {
      expect(typeof adapter.setOrientation).toBe("function");
    });

    it("accepts 'top-to-bottom' without throwing", () => {
      expect(() => adapter.setOrientation("top-to-bottom")).not.toThrow();
    });

    it("accepts 'left-to-right' without throwing", () => {
      expect(() => adapter.setOrientation("left-to-right")).not.toThrow();
    });

    it("accepts all valid OrientationMode values", () => {
      const modes: OrientationMode[] = ["top-to-bottom", "left-to-right"];
      for (const mode of modes) {
        expect(() => adapter.setOrientation(mode)).not.toThrow();
      }
    });
  });

  // -------------------------------------------------------------------
  // onViewportChange()
  // -------------------------------------------------------------------

  describe("onViewportChange()", () => {
    it("is a function on the adapter", () => {
      expect(typeof adapter.onViewportChange).toBe("function");
    });

    it("returns an unsubscribe function", () => {
      const unsubscribe = adapter.onViewportChange(() => {});
      expect(typeof unsubscribe).toBe("function");
    });

    it("unsubscribe can be called without throwing", () => {
      const unsubscribe = adapter.onViewportChange(() => {});
      expect(() => unsubscribe()).not.toThrow();
    });

    it("unsubscribe is idempotent (can be called multiple times)", () => {
      const unsubscribe = adapter.onViewportChange(() => {});
      unsubscribe();
      expect(() => unsubscribe()).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// Cross-adapter parity tests
// ---------------------------------------------------------------------------

describe("Geometry contract — cross-adapter parity", () => {
  let reteLit: RendererAdapter;
  let reactFlow: RendererAdapter;

  beforeAll(() => {
    reteLit = new ReteLitAdapter();
    reactFlow = new ReactFlowAdapter();
  });

  it("both adapters implement getLayoutSnapshot", () => {
    expect(typeof reteLit.getLayoutSnapshot).toBe("function");
    expect(typeof reactFlow.getLayoutSnapshot).toBe("function");
  });

  it("both adapters implement getInsertionAnchors", () => {
    expect(typeof reteLit.getInsertionAnchors).toBe("function");
    expect(typeof reactFlow.getInsertionAnchors).toBe("function");
  });

  it("both adapters implement setOrientation", () => {
    expect(typeof reteLit.setOrientation).toBe("function");
    expect(typeof reactFlow.setOrientation).toBe("function");
  });

  it("both adapters implement onViewportChange", () => {
    expect(typeof reteLit.onViewportChange).toBe("function");
    expect(typeof reactFlow.onViewportChange).toBe("function");
  });

  it("both adapters return structurally equivalent empty layout snapshots", () => {
    const reteLitSnapshot = reteLit.getLayoutSnapshot();
    const reactFlowSnapshot = reactFlow.getLayoutSnapshot();

    assertLayoutSnapshot(reteLitSnapshot);
    assertLayoutSnapshot(reactFlowSnapshot);

    expect(reteLitSnapshot.nodes).toHaveLength(0);
    expect(reactFlowSnapshot.nodes).toHaveLength(0);
    expect(reteLitSnapshot.edges).toHaveLength(0);
    expect(reactFlowSnapshot.edges).toHaveLength(0);
  });

  it("both adapters return empty insertion anchors when unmounted", () => {
    expect(reteLit.getInsertionAnchors()).toHaveLength(0);
    expect(reactFlow.getInsertionAnchors()).toHaveLength(0);
  });
});
