/**
 * Integration tests for US3: repeated adjacent insertions remain readable.
 *
 * Verifies that inserting 3+ tasks sequentially on the same edge region
 * produces correct node ordering, no position overlap, and preserved edge
 * connectivity throughout.
 *
 * Uses helpers from T002 ({@link insertTaskAtEdge}, {@link assertNodeOrder},
 * {@link createEmptyGraph}) and fixtures from T001 (insert-layout-linear).
 *
 * @module
 */

import {
  END_NODE_ID,
  INITIAL_EDGE_ID,
  insertTask,
  RevisionCounter,
  START_NODE_ID,
} from "@sw-editor/editor-core";
import { describe, expect, it } from "vitest";

import {
  assertNodeOrder,
  createEmptyGraph,
  insertTaskAtEdge,
  loadFixtureGraph,
} from "./insertion-layout.helpers.js";

/** Horizontal gap between nodes in the linear layout algorithm. */
const NODE_H_GAP = 200;

describe("repeated-insert-layout — US3: repeated adjacent insertions remain readable", () => {
  // -------------------------------------------------------------------------
  // Sequential insertions on the same edge region (empty graph)
  // -------------------------------------------------------------------------

  describe("sequential insertions on an empty graph", () => {
    it("inserts 3 tasks sequentially, each after the previous, maintaining correct order", () => {
      const graph = createEmptyGraph();
      const counter = new RevisionCounter();

      // Insert first task on start→end edge.
      const r1 = insertTask(graph, counter, {
        edgeId: INITIAL_EDGE_ID,
        taskReference: "seqTask1",
      });

      // Insert second task on r1→end edge.
      const edgeR1ToEnd = r1.graph.edges.find((e) => e.target === END_NODE_ID);
      expect(edgeR1ToEnd).toBeDefined();
      const r2 = insertTask(r1.graph, counter, {
        edgeId: edgeR1ToEnd?.id,
        taskReference: "seqTask2",
      });

      // Insert third task on r2→end edge.
      const edgeR2ToEnd = r2.graph.edges.find((e) => e.target === END_NODE_ID);
      expect(edgeR2ToEnd).toBeDefined();
      const r3 = insertTask(r2.graph, counter, {
        edgeId: edgeR2ToEnd?.id,
        taskReference: "seqTask3",
      });

      // Final graph: start → r1 → r2 → r3 → end
      assertNodeOrder(r3.graph, [START_NODE_ID, r1.nodeId, r2.nodeId, r3.nodeId, END_NODE_ID]);

      // Verify total counts.
      expect(r3.graph.nodes).toHaveLength(5);
      expect(r3.graph.edges).toHaveLength(4);
    });

    it("inserts 4 tasks at the beginning (before existing nodes) in sequence", () => {
      const graph = createEmptyGraph();
      const counter = new RevisionCounter();

      // Insert first task on initial edge.
      const r1 = insertTask(graph, counter, {
        edgeId: INITIAL_EDGE_ID,
        taskReference: "headTask1",
      });

      // Each subsequent insert is on the start→previous edge (inserting before).
      const edgeStartToR1 = r1.graph.edges.find((e) => e.source === START_NODE_ID);
      expect(edgeStartToR1).toBeDefined();
      const r2 = insertTask(r1.graph, counter, {
        edgeId: edgeStartToR1?.id,
        taskReference: "headTask2",
      });

      const edgeStartToR2 = r2.graph.edges.find((e) => e.source === START_NODE_ID);
      expect(edgeStartToR2).toBeDefined();
      const r3 = insertTask(r2.graph, counter, {
        edgeId: edgeStartToR2?.id,
        taskReference: "headTask3",
      });

      const edgeStartToR3 = r3.graph.edges.find((e) => e.source === START_NODE_ID);
      expect(edgeStartToR3).toBeDefined();
      const r4 = insertTask(r3.graph, counter, {
        edgeId: edgeStartToR3?.id,
        taskReference: "headTask4",
      });

      // Final graph: start → r4 → r3 → r2 → r1 → end
      // (each new task was inserted before the previous one)
      assertNodeOrder(r4.graph, [
        START_NODE_ID,
        r4.nodeId,
        r3.nodeId,
        r2.nodeId,
        r1.nodeId,
        END_NODE_ID,
      ]);

      expect(r4.graph.nodes).toHaveLength(6);
      expect(r4.graph.edges).toHaveLength(5);
    });
  });

  // -------------------------------------------------------------------------
  // Sequential insertions on a fixture workflow
  // -------------------------------------------------------------------------

  describe("sequential insertions on a linear fixture", () => {
    it("inserts 3 tasks between taskA and taskB, maintaining order and connectivity", () => {
      let graph = loadFixtureGraph("insert-layout-linear.json");

      // Fixture: start → taskA → taskB → end
      // Insert on the edge taskA→taskB three times.
      const r1 = insertTaskAtEdge(graph, "taskA->taskB", "midTask1");
      graph = r1.graph;
      // Now: start → taskA → r1 → taskB → end

      const edgeR1ToTaskB = graph.edges.find((e) => e.source === r1.nodeId && e.target === "taskB");
      expect(edgeR1ToTaskB).toBeDefined();
      const r2 = insertTaskAtEdge(graph, edgeR1ToTaskB?.id, "midTask2");
      graph = r2.graph;
      // Now: start → taskA → r1 → r2 → taskB → end

      const edgeR2ToTaskB = graph.edges.find((e) => e.source === r2.nodeId && e.target === "taskB");
      expect(edgeR2ToTaskB).toBeDefined();
      const r3 = insertTaskAtEdge(graph, edgeR2ToTaskB?.id, "midTask3");
      graph = r3.graph;

      // Final: start → taskA → r1 → r2 → r3 → taskB → end
      assertNodeOrder(graph, [
        START_NODE_ID,
        "taskA",
        r1.nodeId,
        r2.nodeId,
        r3.nodeId,
        "taskB",
        END_NODE_ID,
      ]);

      expect(graph.nodes).toHaveLength(7);
      expect(graph.edges).toHaveLength(6);
    });
  });

  // -------------------------------------------------------------------------
  // Edge connectivity preservation throughout sequential insertions
  // -------------------------------------------------------------------------

  describe("edge connectivity after repeated insertions", () => {
    it("all edges connect adjacent nodes with no gaps or duplicates after 3 insertions", () => {
      const graph = createEmptyGraph();
      const counter = new RevisionCounter();

      // Insert 3 tasks in sequence at the tail (before __end__).
      const r1 = insertTask(graph, counter, {
        edgeId: INITIAL_EDGE_ID,
        taskReference: "connTask1",
      });

      const edgeR1ToEnd = r1.graph.edges.find((e) => e.target === END_NODE_ID);
      expect(edgeR1ToEnd).toBeDefined();
      const r2 = insertTask(r1.graph, counter, {
        edgeId: edgeR1ToEnd?.id,
        taskReference: "connTask2",
      });

      const edgeR2ToEnd = r2.graph.edges.find((e) => e.target === END_NODE_ID);
      expect(edgeR2ToEnd).toBeDefined();
      const r3 = insertTask(r2.graph, counter, {
        edgeId: edgeR2ToEnd?.id,
        taskReference: "connTask3",
      });

      const finalGraph = r3.graph;
      const expectedOrder = [START_NODE_ID, r1.nodeId, r2.nodeId, r3.nodeId, END_NODE_ID];
      assertNodeOrder(finalGraph, expectedOrder);

      // Verify each consecutive pair of nodes is connected by exactly one edge.
      for (let i = 0; i < expectedOrder.length - 1; i++) {
        const src = expectedOrder[i];
        const tgt = expectedOrder[i + 1];
        const connectingEdges = finalGraph.edges.filter(
          (e) => e.source === src && e.target === tgt,
        );
        expect(connectingEdges, `expected exactly one edge from ${src} to ${tgt}`).toHaveLength(1);
      }

      // No extra edges beyond the expected chain.
      expect(finalGraph.edges).toHaveLength(expectedOrder.length - 1);
    });

    it("no stale edge IDs remain after sequential insertions", () => {
      let graph = loadFixtureGraph("insert-layout-linear.json");

      // Original edges: start→taskA, taskA→taskB, taskB→end
      const _originalEdgeIds = new Set(graph.edges.map((e) => e.id));

      const r1 = insertTaskAtEdge(graph, "taskA->taskB", "staleCheck1");
      graph = r1.graph;

      // taskA→taskB should be gone.
      const currentEdgeIds = new Set(graph.edges.map((e) => e.id));
      expect(currentEdgeIds.has("taskA->taskB")).toBe(false);

      // start→taskA and taskB→end should still exist.
      expect(currentEdgeIds.has(`${START_NODE_ID}->taskA`)).toBe(true);
      expect(currentEdgeIds.has(`taskB->${END_NODE_ID}`)).toBe(true);

      // Insert another on r1→taskB edge.
      const edgeR1ToTaskB = graph.edges.find((e) => e.source === r1.nodeId && e.target === "taskB");
      expect(edgeR1ToTaskB).toBeDefined();

      const r2 = insertTaskAtEdge(graph, edgeR1ToTaskB?.id, "staleCheck2");
      graph = r2.graph;

      // The r1→taskB edge should now be gone.
      const finalEdgeIds = new Set(graph.edges.map((e) => e.id));
      expect(finalEdgeIds.has(edgeR1ToTaskB?.id)).toBe(false);

      // All remaining edges should reference nodes that exist in the graph.
      const nodeIds = new Set(graph.nodes.map((n) => n.id));
      for (const edge of graph.edges) {
        expect(nodeIds.has(edge.source), `edge source ${edge.source} exists`).toBe(true);
        expect(nodeIds.has(edge.target), `edge target ${edge.target} exists`).toBe(true);
      }
    });
  });

  // -------------------------------------------------------------------------
  // No position overlap (layout spacing)
  // -------------------------------------------------------------------------

  describe("no position overlap after repeated insertions", () => {
    it("node positions have no overlap when using linear layout spacing", () => {
      const graph = createEmptyGraph();
      const counter = new RevisionCounter();

      // Insert 5 tasks sequentially.
      let current = graph;
      const nodeIds: string[] = [];

      // First insertion on the initial edge.
      const r1 = insertTask(current, counter, {
        edgeId: INITIAL_EDGE_ID,
        taskReference: "overlapTask1",
      });
      current = r1.graph;
      nodeIds.push(r1.nodeId);

      // Subsequent insertions at the tail.
      for (let i = 2; i <= 5; i++) {
        const edgeToEnd = current.edges.find((e) => e.target === END_NODE_ID);
        expect(edgeToEnd).toBeDefined();
        const result = insertTask(current, counter, {
          edgeId: edgeToEnd?.id,
          taskReference: `overlapTask${i}`,
        });
        current = result.graph;
        nodeIds.push(result.nodeId);
      }

      // Final graph: start → task1 → task2 → task3 → task4 → task5 → end (7 nodes)
      expect(current.nodes).toHaveLength(7);

      // Compute positions using the linear layout (index * NODE_H_GAP).
      const positions = current.nodes.map((n, idx) => ({
        id: n.id,
        x: idx * NODE_H_GAP,
      }));

      // Verify no two nodes share the same position.
      const xValues = positions.map((p) => p.x);
      const uniqueXValues = new Set(xValues);
      expect(uniqueXValues.size).toBe(xValues.length);

      // Verify positions are strictly increasing (no visual reversal).
      for (let i = 1; i < positions.length; i++) {
        expect(
          positions[i].x,
          `node ${positions[i].id} at x=${positions[i].x} must be after ${positions[i - 1].id} at x=${positions[i - 1].x}`,
        ).toBeGreaterThan(positions[i - 1].x);
      }
    });
  });
});
