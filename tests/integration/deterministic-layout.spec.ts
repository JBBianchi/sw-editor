/**
 * Regression tests for the shared deterministic dagre layout helper.
 *
 * Validates that {@link computeDeterministicLayout} produces repeatable,
 * orientation-correct, overlap-free layouts across all fixture graphs.
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
  assertDeterministicLayout,
  assertMidpointWithinTolerance,
  assertNoOverlap,
  type EdgePath,
  type LayoutSnapshot as GeometryLayoutSnapshot,
  type NodeFrame,
  type Point,
} from "./geometry-assertions.helpers.js";
import { loadFixtureGraph } from "./insertion-layout.helpers.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a workflow graph into layout input arrays suitable for
 * {@link computeDeterministicLayout}.
 *
 * @param fixtureName - Fixture file name to load.
 * @returns Layout input nodes, edges, and the raw graph.
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
 * Runs the layout and returns both the snapshot and a geometry-compatible
 * {@link GeometryLayoutSnapshot} for use with {@link assertDeterministicLayout}.
 *
 * @param nodes - Layout input nodes.
 * @param edges - Layout input edges.
 * @param options - Layout options.
 * @returns The layout snapshot and a geometry-compatible snapshot map.
 */
function runLayout(
  nodes: LayoutInputNode[],
  edges: LayoutInputEdge[],
  options: DeterministicLayoutOptions,
): { snapshot: LayoutSnapshot; geometrySnapshot: GeometryLayoutSnapshot } {
  const snapshot = computeDeterministicLayout(nodes, edges, options);
  const geometrySnapshot: GeometryLayoutSnapshot = new Map();
  for (const nf of snapshot.nodes) {
    geometrySnapshot.set(nf.id, {
      x: nf.x + nf.width / 2,
      y: nf.y + nf.height / 2,
    });
  }
  return { snapshot, geometrySnapshot };
}

/**
 * Converts layout snapshot node frames to the {@link NodeFrame} shape
 * expected by {@link assertNoOverlap}.
 *
 * @param snapshot - The layout snapshot.
 * @returns Array of node frames.
 */
function toNodeFrames(snapshot: LayoutSnapshot): NodeFrame[] {
  return snapshot.nodes.map((n) => ({
    id: n.id,
    x: n.x,
    y: n.y,
    width: n.width,
    height: n.height,
  }));
}

// ---------------------------------------------------------------------------
// Fixture names
// ---------------------------------------------------------------------------

const FIXTURE_TB = "insert-geometry-tb.json";
const FIXTURE_LR = "insert-geometry-lr.json";
const FIXTURE_LINEAR = "insert-layout-linear.json";
const FIXTURE_START_END = "insert-layout-start-end.json";
const FIXTURE_DENSE = "insert-geometry-dense.json";

const TB_OPTIONS: DeterministicLayoutOptions = { orientation: "top-to-bottom" };
const LR_OPTIONS: DeterministicLayoutOptions = { orientation: "left-to-right" };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("deterministic-layout — dagre layout helper regressions", () => {
  // -------------------------------------------------------------------------
  // Deterministic output
  // -------------------------------------------------------------------------

  describe("deterministic output: same input produces same layout", () => {
    it("TB orientation produces identical layout on repeated runs (linear)", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_LINEAR);
      const { geometrySnapshot: a } = runLayout(nodes, edges, TB_OPTIONS);
      const { geometrySnapshot: b } = runLayout(nodes, edges, TB_OPTIONS);

      assertDeterministicLayout(a, b, 1);
    });

    it("LR orientation produces identical layout on repeated runs (linear)", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_LINEAR);
      const { geometrySnapshot: a } = runLayout(nodes, edges, LR_OPTIONS);
      const { geometrySnapshot: b } = runLayout(nodes, edges, LR_OPTIONS);

      assertDeterministicLayout(a, b, 1);
    });

    it("TB orientation produces identical layout on repeated runs (branching)", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_TB);
      const { geometrySnapshot: a } = runLayout(nodes, edges, TB_OPTIONS);
      const { geometrySnapshot: b } = runLayout(nodes, edges, TB_OPTIONS);

      assertDeterministicLayout(a, b, 1);
    });

    it("LR orientation produces identical layout on repeated runs (branching)", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_LR);
      const { geometrySnapshot: a } = runLayout(nodes, edges, LR_OPTIONS);
      const { geometrySnapshot: b } = runLayout(nodes, edges, LR_OPTIONS);

      assertDeterministicLayout(a, b, 1);
    });

    it("dense graph produces identical layout on repeated runs (TB)", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_DENSE);
      const { geometrySnapshot: a } = runLayout(nodes, edges, TB_OPTIONS);
      const { geometrySnapshot: b } = runLayout(nodes, edges, TB_OPTIONS);

      assertDeterministicLayout(a, b, 1);
    });
  });

  // -------------------------------------------------------------------------
  // TB orientation: nodes arranged top-to-bottom
  // -------------------------------------------------------------------------

  describe("TB orientation: nodes arranged top-to-bottom", () => {
    it("linear graph nodes have increasing y coordinates", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_LINEAR);
      const { snapshot } = runLayout(nodes, edges, TB_OPTIONS);

      // In a linear TB layout, each successive node should be below the previous
      for (let i = 1; i < snapshot.nodes.length; i++) {
        const prev = snapshot.nodes[i - 1];
        const curr = snapshot.nodes[i];
        expect(
          curr.y,
          `node "${curr.id}" (y=${curr.y}) should be below "${prev.id}" (y=${prev.y})`,
        ).toBeGreaterThan(prev.y);
      }
    });

    it("branching TB fixture has start node above end node", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_TB);
      const { snapshot } = runLayout(nodes, edges, TB_OPTIONS);

      const startNode = snapshot.nodes.find((n) => n.id === "__start__");
      const endNode = snapshot.nodes.find((n) => n.id === "__end__");
      expect(startNode).toBeDefined();
      expect(endNode).toBeDefined();
      expect(startNode!.y).toBeLessThan(endNode!.y);
    });

    it("start-end fixture nodes flow top-to-bottom", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_START_END);
      const { snapshot } = runLayout(nodes, edges, TB_OPTIONS);

      for (let i = 1; i < snapshot.nodes.length; i++) {
        const prev = snapshot.nodes[i - 1];
        const curr = snapshot.nodes[i];
        expect(curr.y).toBeGreaterThan(prev.y);
      }
    });
  });

  // -------------------------------------------------------------------------
  // LR orientation: nodes arranged left-to-right
  // -------------------------------------------------------------------------

  describe("LR orientation: nodes arranged left-to-right", () => {
    it("linear graph nodes have increasing x coordinates", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_LINEAR);
      const { snapshot } = runLayout(nodes, edges, LR_OPTIONS);

      for (let i = 1; i < snapshot.nodes.length; i++) {
        const prev = snapshot.nodes[i - 1];
        const curr = snapshot.nodes[i];
        expect(
          curr.x,
          `node "${curr.id}" (x=${curr.x}) should be right of "${prev.id}" (x=${prev.x})`,
        ).toBeGreaterThan(prev.x);
      }
    });

    it("branching LR fixture has start node left of end node", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_LR);
      const { snapshot } = runLayout(nodes, edges, LR_OPTIONS);

      const startNode = snapshot.nodes.find((n) => n.id === "__start__");
      const endNode = snapshot.nodes.find((n) => n.id === "__end__");
      expect(startNode).toBeDefined();
      expect(endNode).toBeDefined();
      expect(startNode!.x).toBeLessThan(endNode!.x);
    });

    it("start-end fixture nodes flow left-to-right", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_START_END);
      const { snapshot } = runLayout(nodes, edges, LR_OPTIONS);

      for (let i = 1; i < snapshot.nodes.length; i++) {
        const prev = snapshot.nodes[i - 1];
        const curr = snapshot.nodes[i];
        expect(curr.x).toBeGreaterThan(prev.x);
      }
    });
  });

  // -------------------------------------------------------------------------
  // No overlaps: zero bounding-box overlaps for all fixtures
  // -------------------------------------------------------------------------

  describe("no overlaps: zero bounding-box overlaps for all fixtures", () => {
    const fixtures = [
      { name: FIXTURE_START_END, label: "start-end" },
      { name: FIXTURE_LINEAR, label: "linear" },
      { name: FIXTURE_TB, label: "branching TB" },
      { name: FIXTURE_LR, label: "branching LR" },
      { name: FIXTURE_DENSE, label: "dense (25-node)" },
    ];

    for (const fixture of fixtures) {
      it(`no node overlaps in TB layout (${fixture.label})`, () => {
        const { nodes, edges } = loadLayoutInputs(fixture.name);
        const { snapshot } = runLayout(nodes, edges, TB_OPTIONS);
        assertNoOverlap(toNodeFrames(snapshot));
      });

      it(`no node overlaps in LR layout (${fixture.label})`, () => {
        const { nodes, edges } = loadLayoutInputs(fixture.name);
        const { snapshot } = runLayout(nodes, edges, LR_OPTIONS);
        assertNoOverlap(toNodeFrames(snapshot));
      });
    }
  });

  // -------------------------------------------------------------------------
  // Dense graph: handles 25-node, 30-edge fixture without errors
  // -------------------------------------------------------------------------

  describe("dense graph: handles large fixture without errors", () => {
    it("computes TB layout for dense fixture without throwing", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_DENSE);

      expect(() => {
        computeDeterministicLayout(nodes, edges, TB_OPTIONS);
      }).not.toThrow();
    });

    it("computes LR layout for dense fixture without throwing", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_DENSE);

      expect(() => {
        computeDeterministicLayout(nodes, edges, LR_OPTIONS);
      }).not.toThrow();
    });

    it("dense fixture produces expected number of node and edge frames", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_DENSE);
      const { snapshot } = runLayout(nodes, edges, TB_OPTIONS);

      expect(snapshot.nodes).toHaveLength(nodes.length);
      expect(snapshot.edges).toHaveLength(edges.length);
    });

    it("dense fixture has a non-trivial node and edge count", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_DENSE);
      // The dense fixture projects to 15 graph nodes (13 tasks + start + end)
      // and multiple edges from fork branches, exercising the layout engine
      // at a scale representative of real workflows.
      expect(nodes.length).toBeGreaterThanOrEqual(10);
      expect(edges.length).toBeGreaterThanOrEqual(14);
    });
  });

  // -------------------------------------------------------------------------
  // Edge midpoints: computed edge paths have valid midpoints
  // -------------------------------------------------------------------------

  describe("edge midpoints: computed edge paths have valid midpoints", () => {
    it("all TB edge paths have at least two points", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_LINEAR);
      const { snapshot } = runLayout(nodes, edges, TB_OPTIONS);

      for (const edge of snapshot.edges) {
        expect(
          edge.path.length,
          `edge "${edge.id}" should have at least 2 path points`,
        ).toBeGreaterThanOrEqual(2);
      }
    });

    it("all LR edge paths have at least two points", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_LINEAR);
      const { snapshot } = runLayout(nodes, edges, LR_OPTIONS);

      for (const edge of snapshot.edges) {
        expect(
          edge.path.length,
          `edge "${edge.id}" should have at least 2 path points`,
        ).toBeGreaterThanOrEqual(2);
      }
    });

    it("TB edge midpoints lie between source and target nodes", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_LINEAR);
      const { snapshot } = runLayout(nodes, edges, TB_OPTIONS);

      for (const edge of snapshot.edges) {
        const sourceNode = snapshot.nodes.find((n) => n.id === edge.sourceId);
        const targetNode = snapshot.nodes.find((n) => n.id === edge.targetId);
        expect(sourceNode).toBeDefined();
        expect(targetNode).toBeDefined();

        // Compute midpoint of the edge path
        const path = edge.path as EdgePath;
        const midY = path.reduce((sum, p) => sum + p.y, 0) / path.length;

        const sourceCenter = sourceNode!.y + sourceNode!.height / 2;
        const targetCenter = targetNode!.y + targetNode!.height / 2;
        const minY = Math.min(sourceCenter, targetCenter);
        const maxY = Math.max(sourceCenter, targetCenter);

        expect(midY).toBeGreaterThanOrEqual(minY - 1);
        expect(midY).toBeLessThanOrEqual(maxY + 1);
      }
    });

    it("LR edge midpoints lie between source and target nodes", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_LINEAR);
      const { snapshot } = runLayout(nodes, edges, LR_OPTIONS);

      for (const edge of snapshot.edges) {
        const sourceNode = snapshot.nodes.find((n) => n.id === edge.sourceId);
        const targetNode = snapshot.nodes.find((n) => n.id === edge.targetId);
        expect(sourceNode).toBeDefined();
        expect(targetNode).toBeDefined();

        const path = edge.path as EdgePath;
        const midX = path.reduce((sum, p) => sum + p.x, 0) / path.length;

        const sourceCenter = sourceNode!.x + sourceNode!.width / 2;
        const targetCenter = targetNode!.x + targetNode!.width / 2;
        const minX = Math.min(sourceCenter, targetCenter);
        const maxX = Math.max(sourceCenter, targetCenter);

        expect(midX).toBeGreaterThanOrEqual(minX - 1);
        expect(midX).toBeLessThanOrEqual(maxX + 1);
      }
    });

    it("anchor at edge midpoint is within tolerance of computed path midpoint (TB)", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_TB);
      const { snapshot } = runLayout(nodes, edges, TB_OPTIONS);

      for (const edge of snapshot.edges) {
        const path = edge.path as EdgePath;
        // Compute anchor as average of first and last point
        const anchor: Point = {
          x: (path[0].x + path[path.length - 1].x) / 2,
          y: (path[0].y + path[path.length - 1].y) / 2,
        };

        // The anchor should be reasonably close to the path midpoint
        // Use a generous tolerance since dagre paths may have waypoints
        assertMidpointWithinTolerance(anchor, path, 50);
      }
    });

    it("anchor at edge midpoint is within tolerance of computed path midpoint (LR)", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_LR);
      const { snapshot } = runLayout(nodes, edges, LR_OPTIONS);

      for (const edge of snapshot.edges) {
        const path = edge.path as EdgePath;
        const anchor: Point = {
          x: (path[0].x + path[path.length - 1].x) / 2,
          y: (path[0].y + path[path.length - 1].y) / 2,
        };

        assertMidpointWithinTolerance(anchor, path, 50);
      }
    });

    it("dense graph edge paths all have valid midpoints (TB)", () => {
      const { nodes, edges } = loadLayoutInputs(FIXTURE_DENSE);
      const { snapshot } = runLayout(nodes, edges, TB_OPTIONS);

      for (const edge of snapshot.edges) {
        expect(edge.path.length).toBeGreaterThanOrEqual(2);
        // Verify no NaN coordinates
        for (const point of edge.path) {
          expect(Number.isFinite(point.x)).toBe(true);
          expect(Number.isFinite(point.y)).toBe(true);
        }
      }
    });
  });
});
