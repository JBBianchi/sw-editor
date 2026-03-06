/**
 * Smoke tests for insertion-layout integration test helpers.
 *
 * Verifies that the shared helper functions compile and behave correctly
 * with real fixtures and graph operations.
 *
 * @module
 */

import { INITIAL_EDGE_ID, START_NODE_ID, END_NODE_ID } from "@sw-editor/editor-core";
import { describe, expect, it } from "vitest";

import {
  assertNodeOrder,
  createEmptyGraph,
  createRevisionCounter,
  insertTaskAtEdge,
  loadFixtureGraph,
} from "./insertion-layout.helpers.js";

describe("insertion-layout helpers (smoke)", () => {
  it("loadFixtureGraph returns a graph with start and end nodes for simple.json", () => {
    const graph = loadFixtureGraph("simple.json");

    expect(graph.nodes.length).toBeGreaterThanOrEqual(2);
    expect(graph.nodes[0]?.id).toBe(START_NODE_ID);
    expect(graph.nodes[graph.nodes.length - 1]?.id).toBe(END_NODE_ID);
    expect(graph.edges.length).toBeGreaterThan(0);
  });

  it("loadFixtureGraph returns correct node count for multi-task.json", () => {
    const graph = loadFixtureGraph("multi-task.json");

    // multi-task has 3 tasks + start + end = 5 nodes
    expect(graph.nodes.length).toBe(5);
  });

  it("assertNodeOrder passes for correct ordering", () => {
    const graph = createEmptyGraph();

    // Should not throw
    assertNodeOrder(graph, [START_NODE_ID, END_NODE_ID]);
  });

  it("assertNodeOrder throws for incorrect ordering", () => {
    const graph = createEmptyGraph();

    expect(() => assertNodeOrder(graph, [END_NODE_ID, START_NODE_ID])).toThrow(
      "assertNodeOrder: mismatch at index 0",
    );
  });

  it("assertNodeOrder throws for wrong length", () => {
    const graph = createEmptyGraph();

    expect(() => assertNodeOrder(graph, [START_NODE_ID])).toThrow(
      "assertNodeOrder: expected 1 nodes but got 2",
    );
  });

  it("insertTaskAtEdge splits the initial edge in an empty graph", () => {
    const graph = createEmptyGraph();
    const result = insertTaskAtEdge(graph, INITIAL_EDGE_ID);

    // New graph should have 3 nodes: start, end, and the new task
    expect(result.graph.nodes.length).toBe(3);
    expect(result.nodeId).toMatch(/^task-/);
    expect(result.revision).toBe(1);

    // The initial edge should be replaced by two new edges
    expect(result.graph.edges.length).toBe(2);
    const edgeIds = result.graph.edges.map((e) => e.id);
    expect(edgeIds).toContain(`${START_NODE_ID}->${result.nodeId}`);
    expect(edgeIds).toContain(`${result.nodeId}->${END_NODE_ID}`);
  });

  it("createRevisionCounter starts at 0", () => {
    const counter = createRevisionCounter();

    expect(counter.currentRevision).toBe(0);
    expect(counter.increment()).toBe(1);
  });
});
