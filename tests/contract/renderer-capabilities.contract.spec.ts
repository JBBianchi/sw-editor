/**
 * Contract tests for renderer capability snapshots.
 *
 * Verifies that each renderer backend's `getCapabilities()` payload matches
 * the `RendererCapabilitySnapshot` and `CapabilitySnapshot` data-model schemas
 * defined in specs/001-visual-authoring-mvp/data-model.md.
 *
 * SC-005: 100% renderer parity — both adapters must expose the same set of
 * required capability fields, differ only in their values, and remain
 * backward-compatible with consumers that ignore unknown fields.
 *
 * @module
 */

import { beforeAll, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Stub browser-specific dependencies required by the rete-lit renderer.
// The @retejs/lit-plugin package calls `customElements.define()` at module
// evaluation time, which fails in a Node test environment. We replace the
// entire module with lightweight stubs that satisfy the adapter's import
// surface without triggering any DOM API.
// ---------------------------------------------------------------------------

vi.mock("@retejs/lit-plugin", () => {
  /** Minimal stub matching the LitPlugin class surface used by ReteLitAdapter. */
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

import {
  CONTRACT_VERSION,
  createCapabilitySnapshot,
  SUPPORTED_VERSIONS,
  TARGET_VERSION,
} from "@sw-editor/editor-host-client";
import type { RendererCapabilitySnapshot } from "@sw-editor/editor-renderer-contract";
import { ReactFlowAdapter } from "@sw-editor/editor-renderer-react-flow";
import { ReteLitAdapter } from "@sw-editor/editor-renderer-rete-lit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Assert that `snapshot` satisfies the full `RendererCapabilitySnapshot`
 * schema as defined in data-model.md.
 *
 * @param snapshot - The value to validate.
 */
function assertRendererCapabilitySnapshot(snapshot: unknown): void {
  expect(snapshot).toBeDefined();
  expect(typeof snapshot).toBe("object");
  const s = snapshot as Record<string, unknown>;

  // rendererId must be one of the two known renderer identifiers.
  expect(["rete-lit", "react-flow"]).toContain(s.rendererId);

  // rendererVersion must be a non-empty string.
  expect(typeof s.rendererVersion).toBe("string");
  expect((s.rendererVersion as string).length).toBeGreaterThan(0);

  // Required boolean capability flags.
  expect(typeof s.supportsNodeRendererPlugins).toBe("boolean");
  expect(typeof s.supportsNestedInlineProjection).toBe("boolean");
  expect(typeof s.supportsRouteOverlayProjection).toBe("boolean");

  // Optional knownLimits — if present must be an array of strings.
  if (s.knownLimits !== undefined) {
    expect(Array.isArray(s.knownLimits)).toBe(true);
    const limits = s.knownLimits as unknown[];
    for (const limit of limits) {
      expect(typeof limit).toBe("string");
    }
  }
}

// ---------------------------------------------------------------------------
// rete-lit renderer capability tests
// ---------------------------------------------------------------------------

describe("rete-lit renderer — RendererCapabilitySnapshot", () => {
  let reteLitCapabilities: RendererCapabilitySnapshot;

  beforeAll(() => {
    const adapter = new ReteLitAdapter();
    reteLitCapabilities = adapter.capabilities;
  });

  it("returns a defined capabilities object", () => {
    expect(reteLitCapabilities).toBeDefined();
    expect(typeof reteLitCapabilities).toBe("object");
  });

  it("rendererId is 'rete-lit'", () => {
    expect(reteLitCapabilities.rendererId).toBe("rete-lit");
  });

  it("rendererId on adapter instance matches capabilities.rendererId", () => {
    const adapter = new ReteLitAdapter();
    expect(adapter.rendererId).toBe(reteLitCapabilities.rendererId);
  });

  it("rendererVersion is a non-empty string", () => {
    expect(typeof reteLitCapabilities.rendererVersion).toBe("string");
    expect(reteLitCapabilities.rendererVersion.length).toBeGreaterThan(0);
  });

  it("supportsNodeRendererPlugins is a boolean", () => {
    expect(typeof reteLitCapabilities.supportsNodeRendererPlugins).toBe("boolean");
  });

  it("supportsNestedInlineProjection is a boolean", () => {
    expect(typeof reteLitCapabilities.supportsNestedInlineProjection).toBe("boolean");
  });

  it("supportsRouteOverlayProjection is a boolean", () => {
    expect(typeof reteLitCapabilities.supportsRouteOverlayProjection).toBe("boolean");
  });

  it("knownLimits when present is an array of strings", () => {
    if (reteLitCapabilities.knownLimits !== undefined) {
      expect(Array.isArray(reteLitCapabilities.knownLimits)).toBe(true);
      for (const limit of reteLitCapabilities.knownLimits) {
        expect(typeof limit).toBe("string");
      }
    }
  });

  it("satisfies the full RendererCapabilitySnapshot schema", () => {
    assertRendererCapabilitySnapshot(reteLitCapabilities);
  });

  it("capabilities reference is stable across adapter instances", () => {
    // Capabilities are a module-level constant; two instances share the same object.
    const a1 = new ReteLitAdapter();
    const a2 = new ReteLitAdapter();
    expect(a1.capabilities).toBe(a2.capabilities);
  });
});

// ---------------------------------------------------------------------------
// react-flow renderer capability tests
// ---------------------------------------------------------------------------

describe("react-flow renderer — RendererCapabilitySnapshot", () => {
  let reactFlowCapabilities: RendererCapabilitySnapshot;

  beforeAll(() => {
    const adapter = new ReactFlowAdapter();
    reactFlowCapabilities = adapter.capabilities;
  });

  it("returns a defined capabilities object", () => {
    expect(reactFlowCapabilities).toBeDefined();
    expect(typeof reactFlowCapabilities).toBe("object");
  });

  it("rendererId is 'react-flow'", () => {
    expect(reactFlowCapabilities.rendererId).toBe("react-flow");
  });

  it("rendererId on adapter instance matches capabilities.rendererId", () => {
    const adapter = new ReactFlowAdapter();
    expect(adapter.rendererId).toBe(reactFlowCapabilities.rendererId);
  });

  it("rendererVersion is a non-empty string", () => {
    expect(typeof reactFlowCapabilities.rendererVersion).toBe("string");
    expect(reactFlowCapabilities.rendererVersion.length).toBeGreaterThan(0);
  });

  it("supportsNodeRendererPlugins is a boolean", () => {
    expect(typeof reactFlowCapabilities.supportsNodeRendererPlugins).toBe("boolean");
  });

  it("supportsNestedInlineProjection is a boolean", () => {
    expect(typeof reactFlowCapabilities.supportsNestedInlineProjection).toBe("boolean");
  });

  it("supportsRouteOverlayProjection is a boolean", () => {
    expect(typeof reactFlowCapabilities.supportsRouteOverlayProjection).toBe("boolean");
  });

  it("knownLimits when present is an array of strings", () => {
    if (reactFlowCapabilities.knownLimits !== undefined) {
      expect(Array.isArray(reactFlowCapabilities.knownLimits)).toBe(true);
      for (const limit of reactFlowCapabilities.knownLimits) {
        expect(typeof limit).toBe("string");
      }
    }
  });

  it("satisfies the full RendererCapabilitySnapshot schema", () => {
    assertRendererCapabilitySnapshot(reactFlowCapabilities);
  });
});

// ---------------------------------------------------------------------------
// CapabilitySnapshot factory tests
// ---------------------------------------------------------------------------

describe("createCapabilitySnapshot — CapabilitySnapshot fields", () => {
  const mockRendererCaps: RendererCapabilitySnapshot = {
    rendererId: "rete-lit",
    rendererVersion: "1.2.3",
    supportsNodeRendererPlugins: true,
    supportsNestedInlineProjection: false,
    supportsRouteOverlayProjection: false,
    knownLimits: ["Test limit"],
  };

  it("contractVersion equals CONTRACT_VERSION constant", () => {
    const snapshot = createCapabilitySnapshot(mockRendererCaps);
    expect(snapshot.contractVersion).toBe(CONTRACT_VERSION);
  });

  it("targetVersion equals TARGET_VERSION constant", () => {
    const snapshot = createCapabilitySnapshot(mockRendererCaps);
    expect(snapshot.targetVersion).toBe(TARGET_VERSION);
  });

  it("supportedVersions equals SUPPORTED_VERSIONS array", () => {
    const snapshot = createCapabilitySnapshot(mockRendererCaps);
    expect(snapshot.supportedVersions).toEqual([...SUPPORTED_VERSIONS]);
  });

  it("rendererId is derived from rendererCapabilities.rendererId", () => {
    const snapshot = createCapabilitySnapshot(mockRendererCaps);
    expect(snapshot.rendererId).toBe(mockRendererCaps.rendererId);
  });

  it("rendererCapabilities matches the input snapshot", () => {
    const snapshot = createCapabilitySnapshot(mockRendererCaps);
    expect(snapshot.rendererCapabilities).toBe(mockRendererCaps);
  });

  it("produces a valid snapshot for react-flow renderer", () => {
    const reactFlowCaps: RendererCapabilitySnapshot = {
      rendererId: "react-flow",
      rendererVersion: "12.x",
      supportsNodeRendererPlugins: true,
      supportsNestedInlineProjection: false,
      supportsRouteOverlayProjection: false,
    };
    const snapshot = createCapabilitySnapshot(reactFlowCaps);
    expect(snapshot.rendererId).toBe("react-flow");
    expect(snapshot.rendererCapabilities.rendererId).toBe("react-flow");
  });
});

// ---------------------------------------------------------------------------
// Backward-compatible capability expansion tests
// ---------------------------------------------------------------------------

describe("Backward-compatible capability expansion", () => {
  it("consumer reading known fields is not broken by additional unknown fields", () => {
    // Simulate a future renderer that adds a new boolean capability field.
    const futureSnapshot = {
      rendererId: "rete-lit" as const,
      rendererVersion: "2.0.0",
      supportsNodeRendererPlugins: true,
      supportsNestedInlineProjection: true,
      supportsRouteOverlayProjection: true,
      // Hypothetical future field — must not break existing consumers.
      supportsAnimatedTransitions: true,
      knownLimits: [],
    };

    // A consumer that only reads the fields it knows about must still work.
    const knownFieldsConsumer = (caps: RendererCapabilitySnapshot): boolean => {
      return (
        caps.rendererId === "rete-lit" &&
        typeof caps.supportsNodeRendererPlugins === "boolean" &&
        typeof caps.supportsNestedInlineProjection === "boolean" &&
        typeof caps.supportsRouteOverlayProjection === "boolean"
      );
    };

    expect(knownFieldsConsumer(futureSnapshot)).toBe(true);
  });

  it("consumer tolerates absent optional knownLimits field", () => {
    const snapshotWithoutLimits: RendererCapabilitySnapshot = {
      rendererId: "react-flow",
      rendererVersion: "12.x",
      supportsNodeRendererPlugins: true,
      supportsNestedInlineProjection: false,
      supportsRouteOverlayProjection: false,
      // knownLimits is intentionally absent.
    };

    // Consumer must not throw when knownLimits is absent.
    const readLimits = (caps: RendererCapabilitySnapshot): string[] => caps.knownLimits ?? [];

    expect(() => readLimits(snapshotWithoutLimits)).not.toThrow();
    expect(readLimits(snapshotWithoutLimits)).toEqual([]);
  });

  it("consumer that ignores unknown fields can still read known fields", () => {
    // Simulate a snapshot with extra fields arriving from a newer bundle.
    const extendedSnapshot = Object.assign({} as RendererCapabilitySnapshot, {
      rendererId: "react-flow" as const,
      rendererVersion: "15.0.0",
      supportsNodeRendererPlugins: true,
      supportsNestedInlineProjection: true,
      supportsRouteOverlayProjection: false,
      // Unknown fields a v1 consumer does not know about.
      supportsCollaborativeEditing: true,
      supportsOfflineMode: false,
    });

    assertRendererCapabilitySnapshot(extendedSnapshot);
  });
});

// ---------------------------------------------------------------------------
// Renderer parity tests (SC-005)
// ---------------------------------------------------------------------------

describe("SC-005 — Renderer parity", () => {
  it("both adapters expose the same required capability field names", () => {
    const reteLit = new ReteLitAdapter();
    const reactFlow = new ReactFlowAdapter();

    const requiredFields: Array<keyof RendererCapabilitySnapshot> = [
      "rendererId",
      "rendererVersion",
      "supportsNodeRendererPlugins",
      "supportsNestedInlineProjection",
      "supportsRouteOverlayProjection",
    ];

    for (const field of requiredFields) {
      expect(reteLit.capabilities).toHaveProperty(field);
      expect(reactFlow.capabilities).toHaveProperty(field);
    }
  });

  it("both adapters report distinct rendererId values", () => {
    const reteLit = new ReteLitAdapter();
    const reactFlow = new ReactFlowAdapter();

    expect(reteLit.capabilities.rendererId).not.toBe(reactFlow.capabilities.rendererId);
  });

  it("both adapters pass RendererCapabilitySnapshot schema validation", () => {
    const reteLit = new ReteLitAdapter();
    const reactFlow = new ReactFlowAdapter();

    assertRendererCapabilitySnapshot(reteLit.capabilities);
    assertRendererCapabilitySnapshot(reactFlow.capabilities);
  });

  it("createCapabilitySnapshot wraps both renderer capabilities without data loss", () => {
    const reteLit = new ReteLitAdapter();
    const reactFlow = new ReactFlowAdapter();

    const reteLitSnapshot = createCapabilitySnapshot(reteLit.capabilities);
    const reactFlowSnapshot = createCapabilitySnapshot(reactFlow.capabilities);

    expect(reteLitSnapshot.rendererId).toBe("rete-lit");
    expect(reteLitSnapshot.rendererCapabilities).toBe(reteLit.capabilities);

    expect(reactFlowSnapshot.rendererId).toBe("react-flow");
    expect(reactFlowSnapshot.rendererCapabilities).toBe(reactFlow.capabilities);
  });
});
