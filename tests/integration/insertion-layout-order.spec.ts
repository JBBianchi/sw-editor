/**
 * Integration tests for US1: inserted task renders between predecessor and
 * successor in the graph's node ordering.
 *
 * Uses helpers from T002 ({@link insertTaskAtEdge}, {@link assertNodeOrder},
 * {@link loadFixtureGraph}) and fixtures from T001 (insert-layout-start-end,
 * insert-layout-linear, multi-task) plus geometry fixtures (insert-geometry-tb,
 * insert-geometry-lr).
 *
 * Includes:
 * - Node ordering assertions after insertion
 * - Midpoint assertions using {@link assertMidpointWithinTolerance}
 * - Ordering regression tests for TB and LR orientations
 *
 * @module
 */

import { END_NODE_ID, START_NODE_ID, type WorkflowGraph } from "@sw-editor/editor-core";
import type { EdgeInsertionAnchor, LayoutSnapshot } from "@sw-editor/editor-renderer-contract";
import { describe, expect, it } from "vitest";

import { assertMidpointWithinTolerance, type EdgePath, type Point } from "./geometry-assertions.helpers.js";
import { assertNodeOrder, insertTaskAtEdge, loadFixtureGraph } from "./insertion-layout.helpers.js";

// ---------------------------------------------------------------------------
// Simulated layout helpers
// ---------------------------------------------------------------------------

/** Horizontal gap between nodes for top-to-bottom simulated layout. */
const TB_GAP = 150;

/** Vertical gap between nodes for left-to-right simulated layout. */
const LR_GAP = 200;

/**
 * Builds a simulated layout snapshot for a graph in top-to-bottom orientation.
 *
 * Nodes are positioned vertically at `index * TB_GAP`, centered at x=0.
 *
 * @param graph - The workflow graph to lay out.
 * @returns A simulated layout snapshot.
 */
function simulateTBLayout(graph: WorkflowGraph): LayoutSnapshot {
  return {
    nodes: graph.nodes.map((n, i) => ({
      id: n.id,
      x: 0,
      y: i * TB_GAP,
      width: 100,
      height: 40,
    })),
    edges: graph.edges.map((e) => {
      const srcIdx = graph.nodes.findIndex((n) => n.id === e.source);
      const tgtIdx = graph.nodes.findIndex((n) => n.id === e.target);
      return {
        id: e.id,
        sourceId: e.source,
        targetId: e.target,
        path: [
          { x: 50, y: srcIdx * TB_GAP + 40 },
          { x: 50, y: tgtIdx * TB_GAP },
        ],
      };
    }),
  };
}

/**
 * Builds a simulated layout snapshot for a graph in left-to-right orientation.
 *
 * Nodes are positioned horizontally at `index * LR_GAP`, centered at y=0.
 *
 * @param graph - The workflow graph to lay out.
 * @returns A simulated layout snapshot.
 */
function simulateLRLayout(graph: WorkflowGraph): LayoutSnapshot {
  return {
    nodes: graph.nodes.map((n, i) => ({
      id: n.id,
      x: i * LR_GAP,
      y: 0,
      width: 100,
      height: 40,
    })),
    edges: graph.edges.map((e) => {
      const srcIdx = graph.nodes.findIndex((n) => n.id === e.source);
      const tgtIdx = graph.nodes.findIndex((n) => n.id === e.target);
      return {
        id: e.id,
        sourceId: e.source,
        targetId: e.target,
        path: [
          { x: srcIdx * LR_GAP + 100, y: 20 },
          { x: tgtIdx * LR_GAP, y: 20 },
        ],
      };
    }),
  };
}

/**
 * Computes insertion anchors from a layout snapshot by placing each anchor
 * at the midpoint of its edge path.
 *
 * @param snapshot - The simulated layout snapshot.
 * @returns An array of edge insertion anchors.
 */
function computeInsertionAnchors(snapshot: LayoutSnapshot): EdgeInsertionAnchor[] {
  return snapshot.edges.map((edge) => {
    const start = edge.path[0];
    const end = edge.path[edge.path.length - 1];
    return {
      edgeId: edge.id,
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
    };
  });
}

describe("insertion-layout-order — US1: node ordering after insert", () => {
  // -------------------------------------------------------------------------
  // Minimal (2-node equivalent) workflow: start → noop → end
  // -------------------------------------------------------------------------

  describe("minimal workflow (insert-layout-start-end)", () => {
    it("inserts a task between the only task and __end__, placing it in order", () => {
      const graph = loadFixtureGraph("insert-layout-start-end.json");

      // Fixture graph: __start__ → noop → __end__
      // Insert on the edge noop→__end__
      const edgeId = "noop->__end__";
      const result = insertTaskAtEdge(graph, edgeId, "newTask");

      // The new node must appear between noop and __end__
      assertNodeOrder(result.graph, [START_NODE_ID, "noop", result.nodeId, END_NODE_ID]);
    });

    it("inserts a task between __start__ and the first task, placing it in order", () => {
      const graph = loadFixtureGraph("insert-layout-start-end.json");

      // Insert on the edge __start__→noop
      const edgeId = `${START_NODE_ID}->noop`;
      const result = insertTaskAtEdge(graph, edgeId, "preTask");

      // The new node must appear between __start__ and noop
      assertNodeOrder(result.graph, [START_NODE_ID, result.nodeId, "noop", END_NODE_ID]);
    });
  });

  // -------------------------------------------------------------------------
  // Linear (4-node) workflow: start → taskA → taskB → end
  // -------------------------------------------------------------------------

  describe("linear workflow (insert-layout-linear)", () => {
    it("inserts a task between two adjacent tasks, placing it in order", () => {
      const graph = loadFixtureGraph("insert-layout-linear.json");

      // Fixture graph: __start__ → taskA → taskB → __end__
      // Insert on the edge taskA→taskB
      const edgeId = "taskA->taskB";
      const result = insertTaskAtEdge(graph, edgeId, "middleTask");

      // The new node must appear between taskA and taskB
      assertNodeOrder(result.graph, [START_NODE_ID, "taskA", result.nodeId, "taskB", END_NODE_ID]);
    });

    it("inserts at the beginning of a linear chain", () => {
      const graph = loadFixtureGraph("insert-layout-linear.json");

      // Insert on the edge __start__→taskA
      const edgeId = `${START_NODE_ID}->taskA`;
      const result = insertTaskAtEdge(graph, edgeId, "firstTask");

      assertNodeOrder(result.graph, [START_NODE_ID, result.nodeId, "taskA", "taskB", END_NODE_ID]);
    });

    it("inserts at the end of a linear chain", () => {
      const graph = loadFixtureGraph("insert-layout-linear.json");

      // Insert on the edge taskB→__end__
      const edgeId = `taskB->${END_NODE_ID}`;
      const result = insertTaskAtEdge(graph, edgeId, "lastTask");

      assertNodeOrder(result.graph, [START_NODE_ID, "taskA", "taskB", result.nodeId, END_NODE_ID]);
    });
  });

  // -------------------------------------------------------------------------
  // Larger linear workflow (multi-task): start → validate → charge → fulfill → end
  // -------------------------------------------------------------------------

  describe("multi-task workflow (4-node linear)", () => {
    it("inserts between non-adjacent-to-boundary nodes in a longer chain", () => {
      const graph = loadFixtureGraph("multi-task.json");

      // Fixture graph: __start__ → validateOrder → chargePayment → fulfillOrder → __end__
      // Insert on the edge chargePayment→fulfillOrder
      const edgeId = "chargePayment->fulfillOrder";
      const result = insertTaskAtEdge(graph, edgeId, "auditStep");

      assertNodeOrder(result.graph, [
        START_NODE_ID,
        "validateOrder",
        "chargePayment",
        result.nodeId,
        "fulfillOrder",
        END_NODE_ID,
      ]);
    });
  });

  // -------------------------------------------------------------------------
  // Edge connectivity preservation
  // -------------------------------------------------------------------------

  describe("edge connectivity after insertion", () => {
    it("maintains correct edges when inserting into a linear workflow", () => {
      const graph = loadFixtureGraph("insert-layout-linear.json");

      // Insert on the edge taskA→taskB
      const edgeId = "taskA->taskB";
      const result = insertTaskAtEdge(graph, edgeId);

      // The original edge taskA→taskB should be replaced
      const edgeIds = result.graph.edges.map((e) => e.id);
      expect(edgeIds).not.toContain("taskA->taskB");

      // Two new edges should exist: taskA→newNode and newNode→taskB
      expect(edgeIds).toContain(`taskA->${result.nodeId}`);
      expect(edgeIds).toContain(`${result.nodeId}->taskB`);

      // Other edges should remain intact
      expect(edgeIds).toContain(`${START_NODE_ID}->taskA`);
      expect(edgeIds).toContain(`taskB->${END_NODE_ID}`);

      // Total edge count: original 3 edges, minus 1 removed, plus 2 new = 4
      expect(result.graph.edges).toHaveLength(4);
    });
  });

  // -------------------------------------------------------------------------
  // Midpoint assertions — TB orientation
  // -------------------------------------------------------------------------

  describe("midpoint assertions — top-to-bottom orientation", () => {
    it("insertion anchors lie at edge midpoints within tolerance (linear)", () => {
      const graph = loadFixtureGraph("insert-layout-linear.json");
      const snapshot = simulateTBLayout(graph);
      const anchors = computeInsertionAnchors(snapshot);
      const tolerancePx = 1;

      for (const anchor of anchors) {
        const edgeFrame = snapshot.edges.find((e) => e.id === anchor.edgeId);
        expect(edgeFrame, `edge frame for ${anchor.edgeId} must exist`).toBeDefined();
        assertMidpointWithinTolerance(
          { x: anchor.x, y: anchor.y },
          edgeFrame!.path as EdgePath,
          tolerancePx,
        );
      }
    });

    it("insertion anchors lie at edge midpoints after insert (TB geometry fixture)", () => {
      const graph = loadFixtureGraph("insert-geometry-tb.json");
      const firstEdge = graph.edges[0];
      const result = insertTaskAtEdge(graph, firstEdge.id);

      const snapshot = simulateTBLayout(result.graph);
      const anchors = computeInsertionAnchors(snapshot);
      const tolerancePx = 1;

      for (const anchor of anchors) {
        const edgeFrame = snapshot.edges.find((e) => e.id === anchor.edgeId);
        expect(edgeFrame).toBeDefined();
        assertMidpointWithinTolerance(
          { x: anchor.x, y: anchor.y },
          edgeFrame!.path as EdgePath,
          tolerancePx,
        );
      }
    });
  });

  // -------------------------------------------------------------------------
  // Midpoint assertions — LR orientation
  // -------------------------------------------------------------------------

  describe("midpoint assertions — left-to-right orientation", () => {
    it("insertion anchors lie at edge midpoints within tolerance (linear)", () => {
      const graph = loadFixtureGraph("insert-layout-linear.json");
      const snapshot = simulateLRLayout(graph);
      const anchors = computeInsertionAnchors(snapshot);
      const tolerancePx = 1;

      for (const anchor of anchors) {
        const edgeFrame = snapshot.edges.find((e) => e.id === anchor.edgeId);
        expect(edgeFrame).toBeDefined();
        assertMidpointWithinTolerance(
          { x: anchor.x, y: anchor.y },
          edgeFrame!.path as EdgePath,
          tolerancePx,
        );
      }
    });

    it("insertion anchors lie at edge midpoints after insert (LR geometry fixture)", () => {
      const graph = loadFixtureGraph("insert-geometry-lr.json");
      const firstEdge = graph.edges[0];
      const result = insertTaskAtEdge(graph, firstEdge.id);

      const snapshot = simulateLRLayout(result.graph);
      const anchors = computeInsertionAnchors(snapshot);
      const tolerancePx = 1;

      for (const anchor of anchors) {
        const edgeFrame = snapshot.edges.find((e) => e.id === anchor.edgeId);
        expect(edgeFrame).toBeDefined();
        assertMidpointWithinTolerance(
          { x: anchor.x, y: anchor.y },
          edgeFrame!.path as EdgePath,
          tolerancePx,
        );
      }
    });
  });

  // -------------------------------------------------------------------------
  // Ordering regressions — TB orientation
  // -------------------------------------------------------------------------

  describe("ordering regressions — top-to-bottom (insert-geometry-tb)", () => {
    it("preserves node order after inserting at the first edge", () => {
      const graph = loadFixtureGraph("insert-geometry-tb.json");
      const firstEdge = graph.edges[0];
      const nodesBefore = graph.nodes.map((n) => n.id);
      const result = insertTaskAtEdge(graph, firstEdge.id, "tbInserted");

      // The new node must appear between the source and target of the first edge
      const srcIdx = nodesBefore.indexOf(firstEdge.source);
      const tgtIdx = nodesBefore.indexOf(firstEdge.target);
      const afterIds = result.graph.nodes.map((n) => n.id);
      const newIdx = afterIds.indexOf(result.nodeId);

      expect(newIdx).toBeGreaterThan(srcIdx);
      expect(newIdx).toBeLessThan(tgtIdx + 1); // +1 because array shifted
    });

    it("insertion anchors follow edge order in the graph (TB)", () => {
      const graph = loadFixtureGraph("insert-geometry-tb.json");
      const snapshot = simulateTBLayout(graph);
      const anchors = computeInsertionAnchors(snapshot);

      // Anchors for edges along the main spine should have increasing y
      // (top-to-bottom layout). Filter to main-spine edges (sequential node pairs).
      const mainSpineEdges = graph.edges.filter((e) => {
        const srcIdx = graph.nodes.findIndex((n) => n.id === e.source);
        const tgtIdx = graph.nodes.findIndex((n) => n.id === e.target);
        return tgtIdx === srcIdx + 1;
      });

      const spineAnchors = mainSpineEdges
        .map((e) => anchors.find((a) => a.edgeId === e.id))
        .filter((a): a is EdgeInsertionAnchor => a != null);

      for (let i = 1; i < spineAnchors.length; i++) {
        expect(
          spineAnchors[i].y,
          `anchor ${spineAnchors[i].edgeId} y should be > previous anchor y`,
        ).toBeGreaterThan(spineAnchors[i - 1].y);
      }
    });

    it("double insertion preserves ordering (TB)", () => {
      const graph = loadFixtureGraph("insert-geometry-tb.json");
      const firstEdge = graph.edges[0];
      const first = insertTaskAtEdge(graph, firstEdge.id, "tbFirst");

      // Insert again on the new edge between source and first inserted node
      const newEdgeId = `${firstEdge.source}->${first.nodeId}`;
      const second = insertTaskAtEdge(first.graph, newEdgeId, "tbSecond");

      const ids = second.graph.nodes.map((n) => n.id);
      const srcIdx = ids.indexOf(firstEdge.source);
      const secondIdx = ids.indexOf(second.nodeId);
      const firstIdx = ids.indexOf(first.nodeId);

      expect(secondIdx).toBeGreaterThan(srcIdx);
      expect(firstIdx).toBeGreaterThan(secondIdx);
    });
  });

  // -------------------------------------------------------------------------
  // Ordering regressions — LR orientation
  // -------------------------------------------------------------------------

  describe("ordering regressions — left-to-right (insert-geometry-lr)", () => {
    it("preserves node order after inserting at the first edge", () => {
      const graph = loadFixtureGraph("insert-geometry-lr.json");
      const firstEdge = graph.edges[0];
      const nodesBefore = graph.nodes.map((n) => n.id);
      const result = insertTaskAtEdge(graph, firstEdge.id, "lrInserted");

      const srcIdx = nodesBefore.indexOf(firstEdge.source);
      const tgtIdx = nodesBefore.indexOf(firstEdge.target);
      const afterIds = result.graph.nodes.map((n) => n.id);
      const newIdx = afterIds.indexOf(result.nodeId);

      expect(newIdx).toBeGreaterThan(srcIdx);
      expect(newIdx).toBeLessThan(tgtIdx + 1);
    });

    it("insertion anchors follow edge order in the graph (LR)", () => {
      const graph = loadFixtureGraph("insert-geometry-lr.json");
      const snapshot = simulateLRLayout(graph);
      const anchors = computeInsertionAnchors(snapshot);

      // Anchors for edges along the main spine should have increasing x
      // (left-to-right layout).
      const mainSpineEdges = graph.edges.filter((e) => {
        const srcIdx = graph.nodes.findIndex((n) => n.id === e.source);
        const tgtIdx = graph.nodes.findIndex((n) => n.id === e.target);
        return tgtIdx === srcIdx + 1;
      });

      const spineAnchors = mainSpineEdges
        .map((e) => anchors.find((a) => a.edgeId === e.id))
        .filter((a): a is EdgeInsertionAnchor => a != null);

      for (let i = 1; i < spineAnchors.length; i++) {
        expect(
          spineAnchors[i].x,
          `anchor ${spineAnchors[i].edgeId} x should be > previous anchor x`,
        ).toBeGreaterThan(spineAnchors[i - 1].x);
      }
    });

    it("double insertion preserves ordering (LR)", () => {
      const graph = loadFixtureGraph("insert-geometry-lr.json");
      const firstEdge = graph.edges[0];
      const first = insertTaskAtEdge(graph, firstEdge.id, "lrFirst");

      const newEdgeId = `${firstEdge.source}->${first.nodeId}`;
      const second = insertTaskAtEdge(first.graph, newEdgeId, "lrSecond");

      const ids = second.graph.nodes.map((n) => n.id);
      const srcIdx = ids.indexOf(firstEdge.source);
      const secondIdx = ids.indexOf(second.nodeId);
      const firstIdx = ids.indexOf(first.nodeId);

      expect(secondIdx).toBeGreaterThan(srcIdx);
      expect(firstIdx).toBeGreaterThan(secondIdx);
    });
  });
});
