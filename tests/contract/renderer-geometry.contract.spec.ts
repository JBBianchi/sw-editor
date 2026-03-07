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

import { beforeAll, describe, expect, it, vi } from "vitest";

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
} from "@sw-editor/editor-renderer-contract";
import { ReactFlowAdapter } from "@sw-editor/editor-renderer-react-flow";
import { ReteLitAdapter } from "@sw-editor/editor-renderer-rete-lit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Adapter entry with a human-readable label. */
interface AdapterEntry {
  label: string;
  adapter: RendererAdapter;
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
  { label: "react-flow", adapter: new ReactFlowAdapter() },
  { label: "rete-lit", adapter: new ReteLitAdapter() },
];

describe.each(adapters)("$label renderer — geometry contract", ({ adapter }) => {
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
