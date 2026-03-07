/**
 * Integration tests for orientation-aware layout: port-side placement and
 * flow-direction assertions.
 *
 * Validates that {@link computeDeterministicLayout} places source/target
 * ports on the correct node sides and that nodes flow in the expected
 * direction for both TB and LR orientations.
 *
 * Uses geometry assertion helpers from T002 and test fixtures from T001.
 *
 * @module
 */

import {
  computeDeterministicLayout,
  type DeterministicLayoutOptions,
  type LayoutInputEdge,
  type LayoutInputNode,
  type LayoutSnapshot,
} from "@sw-editor/editor-renderer-contract";
import { describe, expect, it } from "vitest";

import {
  assertPortSideCorrect,
  type NodeWithPorts,
  type Orientation,
  type PortDescriptor,
  type PortSide,
} from "./geometry-assertions.helpers.js";
import { loadFixtureGraph } from "./insertion-layout.helpers.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a workflow fixture into layout input arrays suitable for
 * {@link computeDeterministicLayout}.
 *
 * @param fixtureName - Fixture file name to load.
 * @returns Layout input nodes and edges.
 */
function loadLayoutInputs(fixtureName: string): {
  nodes: LayoutInputNode[];
  edges: LayoutInputEdge[];
} {
  const graph = loadFixtureGraph(fixtureName);
  const nodes: LayoutInputNode[] = graph.nodes.map((n) => ({ id: n.id }));
  const edges: LayoutInputEdge[] = graph.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
  }));
  return { nodes, edges };
}

/**
 * Derives {@link NodeWithPorts} descriptors from a layout snapshot by
 * inspecting edge path endpoints.
 *
 * For each edge the first path point is treated as the source node's output
 * port and the last path point as the target node's input port. The port
 * side is determined by comparing the port position to the node frame center.
 *
 * @param snapshot - The layout snapshot to analyse.
 * @returns A map of node ID to {@link NodeWithPorts}.
 */
function deriveNodesWithPorts(snapshot: LayoutSnapshot): Map<string, NodeWithPorts> {
  const nodeMap = new Map(snapshot.nodes.map((n) => [n.id, n]));
  const result = new Map<string, NodeWithPorts>();

  // Initialise entries for every node.
  for (const nf of snapshot.nodes) {
    result.set(nf.id, {
      frame: { id: nf.id, x: nf.x, y: nf.y, width: nf.width, height: nf.height },
      ports: [],
    });
  }

  for (const edge of snapshot.edges) {
    const sourceFrame = nodeMap.get(edge.sourceId)!;
    const targetFrame = nodeMap.get(edge.targetId)!;
    const firstPoint = edge.path[0];
    const lastPoint = edge.path[edge.path.length - 1];

    // Source output port
    const sourceSide = classifyPortSide(firstPoint, sourceFrame);
    result.get(edge.sourceId)!.ports.push({
      position: firstPoint,
      side: sourceSide,
      role: "output",
    });

    // Target input port
    const targetSide = classifyPortSide(lastPoint, targetFrame);
    result.get(edge.targetId)!.ports.push({
      position: lastPoint,
      side: targetSide,
      role: "input",
    });
  }

  return result;
}

/**
 * Classifies which side of a node frame a port point sits on.
 *
 * Uses the relative displacement from the frame center to determine the
 * dominant axis and direction.
 *
 * @param point - The port position.
 * @param frame - The node bounding frame.
 * @returns The {@link PortSide} the point is closest to.
 */
function classifyPortSide(
  point: { x: number; y: number },
  frame: { x: number; y: number; width: number; height: number },
): PortSide {
  const cx = frame.x + frame.width / 2;
  const cy = frame.y + frame.height / 2;
  const dx = point.x - cx;
  const dy = point.y - cy;

  if (Math.abs(dy) >= Math.abs(dx)) {
    return dy >= 0 ? "bottom" : "top";
  }
  return dx >= 0 ? "right" : "left";
}

// ---------------------------------------------------------------------------
// Fixtures and options
// ---------------------------------------------------------------------------

const FIXTURE_TB = "insert-geometry-tb.json";
const FIXTURE_LR = "insert-geometry-lr.json";
const FIXTURE_LINEAR = "insert-layout-linear.json";
const FIXTURE_START_END = "insert-layout-start-end.json";
const FIXTURE_DENSE = "insert-geometry-dense.json";

const TB_OPTIONS: DeterministicLayoutOptions = { orientation: "top-to-bottom" };
const LR_OPTIONS: DeterministicLayoutOptions = { orientation: "left-to-right" };

/** All fixtures used in the port-side matrix tests. */
const ALL_FIXTURES = [
  { name: FIXTURE_TB, label: "branching TB" },
  { name: FIXTURE_LR, label: "branching LR" },
  { name: FIXTURE_LINEAR, label: "linear" },
  { name: FIXTURE_START_END, label: "start-end" },
  { name: FIXTURE_DENSE, label: "dense" },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("orientation-layout — port-side and direction assertions", () => {
  // -----------------------------------------------------------------------
  // TB mode: source ports on bottom, target ports on top
  // -----------------------------------------------------------------------

  describe("TB mode: source ports on bottom, target ports on top", () => {
    it("linear fixture — all source ports are on the bottom side", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_LINEAR);
      const snapshot = computeDeterministicLayout(nodes, edges, TB_OPTIONS);

      for (const edge of snapshot.edges) {
        const firstPoint = edge.path[0];
        const sourceFrame = snapshot.nodes.find((n) => n.id === edge.sourceId)!;
        const side = classifyPortSide(firstPoint, sourceFrame);
        expect(side, `source port of edge "${edge.id}"`).toBe("bottom");
      }
    });

    it("linear fixture — all target ports are on the top side", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_LINEAR);
      const snapshot = computeDeterministicLayout(nodes, edges, TB_OPTIONS);

      for (const edge of snapshot.edges) {
        const lastPoint = edge.path[edge.path.length - 1];
        const targetFrame = snapshot.nodes.find((n) => n.id === edge.targetId)!;
        const side = classifyPortSide(lastPoint, targetFrame);
        expect(side, `target port of edge "${edge.id}"`).toBe("top");
      }
    });

    it("branching TB fixture — assertPortSideCorrect passes for all nodes", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_TB);
      const snapshot = computeDeterministicLayout(nodes, edges, TB_OPTIONS);
      const nodesWithPorts = deriveNodesWithPorts(snapshot);

      for (const [, node] of nodesWithPorts) {
        if (node.ports.length > 0) {
          assertPortSideCorrect(node, "vertical");
        }
      }
    });
  });

  // -----------------------------------------------------------------------
  // LR mode: source ports on right, target ports on left
  // -----------------------------------------------------------------------

  describe("LR mode: source ports on right, target ports on left", () => {
    it("linear fixture — all source ports are on the right side", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_LINEAR);
      const snapshot = computeDeterministicLayout(nodes, edges, LR_OPTIONS);

      for (const edge of snapshot.edges) {
        const firstPoint = edge.path[0];
        const sourceFrame = snapshot.nodes.find((n) => n.id === edge.sourceId)!;
        const side = classifyPortSide(firstPoint, sourceFrame);
        expect(side, `source port of edge "${edge.id}"`).toBe("right");
      }
    });

    it("linear fixture — all target ports are on the left side", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_LINEAR);
      const snapshot = computeDeterministicLayout(nodes, edges, LR_OPTIONS);

      for (const edge of snapshot.edges) {
        const lastPoint = edge.path[edge.path.length - 1];
        const targetFrame = snapshot.nodes.find((n) => n.id === edge.targetId)!;
        const side = classifyPortSide(lastPoint, targetFrame);
        expect(side, `target port of edge "${edge.id}"`).toBe("left");
      }
    });

    it("branching LR fixture — assertPortSideCorrect passes for all nodes", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_LR);
      const snapshot = computeDeterministicLayout(nodes, edges, LR_OPTIONS);
      const nodesWithPorts = deriveNodesWithPorts(snapshot);

      for (const [, node] of nodesWithPorts) {
        if (node.ports.length > 0) {
          assertPortSideCorrect(node, "horizontal");
        }
      }
    });
  });

  // -----------------------------------------------------------------------
  // TB mode: nodes flow top-to-bottom (y increases)
  // -----------------------------------------------------------------------

  describe("TB mode: nodes flow top-to-bottom (y increases)", () => {
    it("linear fixture — each successive node has a greater y coordinate", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_LINEAR);
      const snapshot = computeDeterministicLayout(nodes, edges, TB_OPTIONS);

      for (let i = 1; i < snapshot.nodes.length; i++) {
        const prev = snapshot.nodes[i - 1];
        const curr = snapshot.nodes[i];
        expect(
          curr.y,
          `node "${curr.id}" should be below "${prev.id}"`,
        ).toBeGreaterThan(prev.y);
      }
    });

    it("branching TB fixture — start node is above end node", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_TB);
      const snapshot = computeDeterministicLayout(nodes, edges, TB_OPTIONS);

      const startNode = snapshot.nodes.find((n) => n.id === "__start__");
      const endNode = snapshot.nodes.find((n) => n.id === "__end__");
      expect(startNode).toBeDefined();
      expect(endNode).toBeDefined();
      expect(startNode!.y).toBeLessThan(endNode!.y);
    });

    it("start-end fixture — nodes flow top-to-bottom", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_START_END);
      const snapshot = computeDeterministicLayout(nodes, edges, TB_OPTIONS);

      for (let i = 1; i < snapshot.nodes.length; i++) {
        const prev = snapshot.nodes[i - 1];
        const curr = snapshot.nodes[i];
        expect(curr.y).toBeGreaterThan(prev.y);
      }
    });
  });

  // -----------------------------------------------------------------------
  // LR mode: nodes flow left-to-right (x increases)
  // -----------------------------------------------------------------------

  describe("LR mode: nodes flow left-to-right (x increases)", () => {
    it("linear fixture — each successive node has a greater x coordinate", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_LINEAR);
      const snapshot = computeDeterministicLayout(nodes, edges, LR_OPTIONS);

      for (let i = 1; i < snapshot.nodes.length; i++) {
        const prev = snapshot.nodes[i - 1];
        const curr = snapshot.nodes[i];
        expect(
          curr.x,
          `node "${curr.id}" should be right of "${prev.id}"`,
        ).toBeGreaterThan(prev.x);
      }
    });

    it("branching LR fixture — start node is left of end node", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_LR);
      const snapshot = computeDeterministicLayout(nodes, edges, LR_OPTIONS);

      const startNode = snapshot.nodes.find((n) => n.id === "__start__");
      const endNode = snapshot.nodes.find((n) => n.id === "__end__");
      expect(startNode).toBeDefined();
      expect(endNode).toBeDefined();
      expect(startNode!.x).toBeLessThan(endNode!.x);
    });

    it("start-end fixture — nodes flow left-to-right", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_START_END);
      const snapshot = computeDeterministicLayout(nodes, edges, LR_OPTIONS);

      for (let i = 1; i < snapshot.nodes.length; i++) {
        const prev = snapshot.nodes[i - 1];
        const curr = snapshot.nodes[i];
        expect(curr.x).toBeGreaterThan(prev.x);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Port sides are correct for all nodes in fixture matrix
  // -----------------------------------------------------------------------

  describe("port sides correct for all nodes in fixture matrix", () => {
    for (const fixture of ALL_FIXTURES) {
      it(`TB orientation — all port sides correct (${fixture.label})`, () => {
        const { nodes, edges } = loadLayoutInputs(fixture.name);
        const snapshot = computeDeterministicLayout(nodes, edges, TB_OPTIONS);
        const nodesWithPorts = deriveNodesWithPorts(snapshot);

        for (const [, node] of nodesWithPorts) {
          if (node.ports.length > 0) {
            assertPortSideCorrect(node, "vertical");
          }
        }
      });

      it(`LR orientation — all port sides correct (${fixture.label})`, () => {
        const { nodes, edges } = loadLayoutInputs(fixture.name);
        const snapshot = computeDeterministicLayout(nodes, edges, LR_OPTIONS);
        const nodesWithPorts = deriveNodesWithPorts(snapshot);

        for (const [, node] of nodesWithPorts) {
          if (node.ports.length > 0) {
            assertPortSideCorrect(node, "horizontal");
          }
        }
      });
    }
  });
});
