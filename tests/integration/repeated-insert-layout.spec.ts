/**
 * @vitest-environment happy-dom
 */

/**
 * Layout snapshot regressions for determinism and overlap safety.
 *
 * Validates SC-004 and SC-005 by exercising both renderer adapters with
 * fixture graphs from T001 and geometry assertions from T002.
 *
 * @module
 */

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
  class Output {
    constructor(_socket: Socket) {}
  }
  class Input {
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
    getNode(_id: string): Node | undefined {
      return undefined;
    }
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
    async add(_entity: T, _accumulate: boolean): Promise<void> {}
    async remove(_entity: T): Promise<void> {}
  }
  class AreaPlugin {
    nodeViews = new Map<string, { element?: HTMLElement }>();
    constructor(_container?: unknown) {}
    use(_plugin: unknown): void {}
    addPipe(_pipe: unknown): void {}
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
  useReactFlow: () => ({
    getNode: (_id: string) => undefined,
    getEdge: (_id: string) => undefined,
    setCenter: (_x: number, _y: number, _options?: unknown) => {},
  }),
}));

import type {
  LayoutSnapshot,
  OrientationMode,
  RendererAdapter,
  WorkflowGraph,
} from "@sw-editor/editor-renderer-contract";
import { ReactFlowAdapter } from "@sw-editor/editor-renderer-react-flow";
import { ReteLitAdapter } from "@sw-editor/editor-renderer-rete-lit";
import { parseWorkflowSource, projectWorkflowToGraph } from "@sw-editor/editor-core";
import { describe, expect, it } from "vitest";

import {
  assertDeterministicLayout,
  assertNoOverlap,
  type LayoutSnapshot as GeometryLayoutSnapshot,
  type NodeFrame,
} from "./geometry-assertions.helpers.js";
import { readFileSync } from "node:fs";
import { extname, resolve } from "node:path";

interface AdapterDescriptor {
  name: string;
  create: () => RendererAdapter;
}

const ADAPTERS: AdapterDescriptor[] = [
  { name: "react-flow", create: () => new ReactFlowAdapter() },
  { name: "rete-lit", create: () => new ReteLitAdapter() },
];

const ORIENTATIONS: OrientationMode[] = ["top-to-bottom", "left-to-right"];

const FIXTURES = [
  { name: "insert-geometry-tb.json", label: "tb" },
  { name: "insert-geometry-lr.json", label: "lr" },
  { name: "insert-geometry-dense.json", label: "dense" },
];

const DETERMINISM_RUNS = 10;
const MAX_AXIS_DEVIATION_PX = 1;
const FIXTURES_DIR = resolve(process.cwd(), "tests/fixtures/valid");

function toNodeFrames(snapshot: LayoutSnapshot): NodeFrame[] {
  return snapshot.nodes.map((node) => ({
    id: node.id,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  }));
}

function loadFixtureGraph(fixtureName: string): WorkflowGraph {
  const filePath = resolve(FIXTURES_DIR, fixtureName);
  const content = readFileSync(filePath, "utf-8");
  const ext = extname(fixtureName).toLowerCase();
  const source = { format: ext === ".json" ? "json" : "yaml", content } as const;
  const parsed = parseWorkflowSource(source);
  if (!parsed.ok) {
    throw new Error(`Fixture parse failed for "${fixtureName}"`);
  }
  return projectWorkflowToGraph(parsed.workflow);
}

function toGeometrySnapshot(snapshot: LayoutSnapshot): GeometryLayoutSnapshot {
  const map: GeometryLayoutSnapshot = new Map();
  for (const node of snapshot.nodes) {
    map.set(node.id, {
      x: node.x + node.width / 2,
      y: node.y + node.height / 2,
    });
  }
  return map;
}

function assertPerAxisDeviation(
  baseline: GeometryLayoutSnapshot,
  candidate: GeometryLayoutSnapshot,
  maxDeviationPx: number,
): void {
  for (const [nodeId, basePoint] of baseline) {
    const current = candidate.get(nodeId);
    expect(current, `snapshot missing node "${nodeId}"`).toBeDefined();

    const dx = Math.abs((current?.x ?? 0) - basePoint.x);
    const dy = Math.abs((current?.y ?? 0) - basePoint.y);

    expect(
      dx,
      `node "${nodeId}" x-deviation ${dx.toFixed(2)}px exceeds ${maxDeviationPx}px`,
    ).toBeLessThanOrEqual(maxDeviationPx);
    expect(
      dy,
      `node "${nodeId}" y-deviation ${dy.toFixed(2)}px exceeds ${maxDeviationPx}px`,
    ).toBeLessThanOrEqual(maxDeviationPx);
  }
}

function classifyPortSide(
  point: { x: number; y: number },
  frame: { x: number; y: number; width: number; height: number },
): "top" | "right" | "bottom" | "left" {
  const cx = frame.x + frame.width / 2;
  const cy = frame.y + frame.height / 2;
  const dx = point.x - cx;
  const dy = point.y - cy;

  if (Math.abs(dy) >= Math.abs(dx)) {
    return dy >= 0 ? "bottom" : "top";
  }
  return dx >= 0 ? "right" : "left";
}

function assertEdgePortSidesMatchOrientation(
  snapshot: LayoutSnapshot,
  orientation: OrientationMode,
): void {
  const sourceExpected = orientation === "top-to-bottom" ? "bottom" : "right";
  const targetExpected = orientation === "top-to-bottom" ? "top" : "left";
  const frameById = new Map(snapshot.nodes.map((node) => [node.id, node]));

  for (const edge of snapshot.edges) {
    expect(edge.path.length, `edge "${edge.id}" should expose at least two path points`).toBeGreaterThanOrEqual(
      2,
    );

    const sourceFrame = frameById.get(edge.sourceId);
    const targetFrame = frameById.get(edge.targetId);
    expect(sourceFrame, `missing source node frame "${edge.sourceId}"`).toBeDefined();
    expect(targetFrame, `missing target node frame "${edge.targetId}"`).toBeDefined();
    if (sourceFrame === undefined || targetFrame === undefined) {
      continue;
    }

    const sourcePoint = edge.path[0] as { x: number; y: number };
    const targetPoint = edge.path[edge.path.length - 1] as { x: number; y: number };
    const sourceSide = classifyPortSide(sourcePoint, sourceFrame);
    const targetSide = classifyPortSide(targetPoint, targetFrame);

    expect(
      sourceSide,
      `edge "${edge.id}" source side mismatch in ${orientation} mode`,
    ).toBe(sourceExpected);
    expect(
      targetSide,
      `edge "${edge.id}" target side mismatch in ${orientation} mode`,
    ).toBe(targetExpected);
  }
}

async function waitForSnapshot(
  adapter: RendererAdapter,
  expectedNodeCount: number,
  expectedEdgeCount: number,
): Promise<LayoutSnapshot> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const snapshot = adapter.getLayoutSnapshot();
    const hasExpectedCounts =
      snapshot.nodes.length === expectedNodeCount && snapshot.edges.length === expectedEdgeCount;
    const hasNodeFrames = snapshot.nodes.every((node) => node.width > 0 && node.height > 0);
    const hasEdgePaths = snapshot.edges.every((edge) => edge.path.length >= 2);

    if (hasExpectedCounts && hasNodeFrames && hasEdgePaths) {
      return snapshot;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return adapter.getLayoutSnapshot();
}

async function captureLayoutSnapshot(
  adapter: RendererAdapter,
  graph: WorkflowGraph,
): Promise<LayoutSnapshot> {
  const container = document.createElement("div");
  adapter.mount(container, structuredClone(graph));
  return waitForSnapshot(adapter, graph.nodes.length, graph.edges.length);
}

describe("repeated-insert-layout — snapshot determinism and no-overlap regressions", () => {
  for (const adapterDescriptor of ADAPTERS) {
    describe(`[${adapterDescriptor.name}]`, () => {
      for (const orientation of ORIENTATIONS) {
        describe(`[${orientation}]`, () => {
          it("is deterministic across 10 repeated layout runs (<=1px per axis)", async () => {
            const graph = loadFixtureGraph("insert-geometry-dense.json");
            const snapshots: GeometryLayoutSnapshot[] = [];

            for (let run = 0; run < DETERMINISM_RUNS; run++) {
              const adapter = adapterDescriptor.create();
              adapter.setOrientation(orientation);
              const snapshot = await captureLayoutSnapshot(adapter, graph);
              snapshots.push(toGeometrySnapshot(snapshot));
              adapter.dispose();
            }

            const baseline = snapshots[0] as GeometryLayoutSnapshot;
            for (let i = 1; i < snapshots.length; i++) {
              const candidate = snapshots[i] as GeometryLayoutSnapshot;
              assertDeterministicLayout(baseline, candidate, MAX_AXIS_DEVIATION_PX);
              assertPerAxisDeviation(baseline, candidate, MAX_AXIS_DEVIATION_PX);
            }
          });

          for (const fixture of FIXTURES) {
            it(`has zero node bounding-box overlaps for fixture "${fixture.label}"`, async () => {
              const graph = loadFixtureGraph(fixture.name);
              const adapter = adapterDescriptor.create();
              adapter.setOrientation(orientation);
              const snapshot = await captureLayoutSnapshot(adapter, graph);

              assertNoOverlap(toNodeFrames(snapshot));
              adapter.dispose();
            });

            if (adapterDescriptor.name === "react-flow") {
              it(`edge endpoints map to orientation-correct port sides for fixture "${fixture.label}"`, async () => {
                const graph = loadFixtureGraph(fixture.name);
                const adapter = adapterDescriptor.create();
                adapter.setOrientation(orientation);
                const snapshot = await captureLayoutSnapshot(adapter, graph);

                assertEdgePortSidesMatchOrientation(snapshot, orientation);
                adapter.dispose();
              });
            } else {
              it(`rete snapshots expose non-degenerate edge paths for fixture "${fixture.label}"`, async () => {
                const graph = loadFixtureGraph(fixture.name);
                const adapter = adapterDescriptor.create();
                adapter.setOrientation(orientation);
                const snapshot = await captureLayoutSnapshot(adapter, graph);

                for (const edge of snapshot.edges) {
                  expect(edge.path.length, `edge "${edge.id}" should contain a path`).toBeGreaterThanOrEqual(2);
                }
                adapter.dispose();
              });
            }
          }
        });
      }

      it("dense fixture remains overlap-free in both orientations", async () => {
        const graph = loadFixtureGraph("insert-geometry-dense.json");

        for (const orientation of ORIENTATIONS) {
          const adapter = adapterDescriptor.create();
          adapter.setOrientation(orientation);
          const snapshot = await captureLayoutSnapshot(adapter, graph);
          assertNoOverlap(toNodeFrames(snapshot));

          adapter.dispose();
        }
      });

    });
  }
});
