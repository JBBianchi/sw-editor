/**
 * Integration tests for US1: inserted task renders between predecessor and
 * successor in the graph's node ordering.
 *
 * Uses helpers from T002 ({@link insertTaskAtEdge}, {@link assertNodeOrder},
 * {@link loadFixtureGraph}) and fixtures from T001 (insert-layout-start-end,
 * insert-layout-linear, multi-task).
 *
 * @module
 */

import { END_NODE_ID, START_NODE_ID } from "@sw-editor/editor-core";
import { describe, expect, it } from "vitest";

import { assertNodeOrder, insertTaskAtEdge, loadFixtureGraph } from "./insertion-layout.helpers.js";

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
});
