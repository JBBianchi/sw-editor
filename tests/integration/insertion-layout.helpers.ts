/**
 * Shared test helpers for insertion-layout integration tests.
 *
 * Provides utilities to load fixture workflows, build graphs, insert tasks,
 * and assert node ordering — used across multiple insertion-layout test files.
 *
 * @module
 */

import { readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  bootstrapWorkflowGraph,
  type InsertTaskResult,
  insertTask,
  parseWorkflowSource,
  projectWorkflowToGraph,
  RevisionCounter,
  type WorkflowGraph,
  type WorkflowSource,
} from "@sw-editor/editor-core";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FIXTURES_DIR = resolve(fileURLToPath(new URL(".", import.meta.url)), "../fixtures/valid");

// ---------------------------------------------------------------------------
// Fixture loading
// ---------------------------------------------------------------------------

/**
 * Loads a fixture file by name, parses it into a workflow model, and projects
 * it to a {@link WorkflowGraph}.
 *
 * @param fixtureName - File name relative to the `tests/fixtures/valid/`
 *   directory (e.g. `"simple.json"` or `"multi-task.yaml"`).
 * @returns The projected {@link WorkflowGraph} for the fixture.
 * @throws If the fixture cannot be read, parsed, or projected.
 */
export function loadFixtureGraph(fixtureName: string): WorkflowGraph {
  const filePath = resolve(FIXTURES_DIR, fixtureName);
  const content = readFileSync(filePath, "utf-8");

  const ext = extname(fixtureName).toLowerCase();
  const format: "json" | "yaml" = ext === ".json" ? "json" : "yaml";

  const source: WorkflowSource = { format, content };
  const parseResult = parseWorkflowSource(source);

  if (!parseResult.ok) {
    const messages = parseResult.diagnostics.map((d) => d.message).join("; ");
    throw new Error(`loadFixtureGraph: fixture "${fixtureName}" failed to parse: ${messages}`);
  }

  return projectWorkflowToGraph(parseResult.workflow);
}

// ---------------------------------------------------------------------------
// Node ordering assertion
// ---------------------------------------------------------------------------

/**
 * Asserts that the node IDs in a graph appear in the expected order.
 *
 * Compares only the `id` field of each node in the graph's `nodes` array
 * against the provided expected IDs. The comparison is order-sensitive and
 * the arrays must have the same length.
 *
 * @param graph - The workflow graph to inspect.
 * @param expectedIds - Expected node IDs in their expected order.
 * @throws If the actual node IDs do not match the expected IDs in order.
 */
export function assertNodeOrder(graph: WorkflowGraph, expectedIds: string[]): void {
  const actualIds = graph.nodes.map((n) => n.id);
  if (actualIds.length !== expectedIds.length) {
    throw new Error(
      `assertNodeOrder: expected ${expectedIds.length} nodes but got ${actualIds.length}.\n` +
        `  Expected: [${expectedIds.join(", ")}]\n` +
        `  Actual:   [${actualIds.join(", ")}]`,
    );
  }
  for (let i = 0; i < expectedIds.length; i++) {
    if (actualIds[i] !== expectedIds[i]) {
      throw new Error(
        `assertNodeOrder: mismatch at index ${i}.\n` +
          `  Expected: "${expectedIds[i]}"\n` +
          `  Actual:   "${actualIds[i]}"\n` +
          `  Full expected: [${expectedIds.join(", ")}]\n` +
          `  Full actual:   [${actualIds.join(", ")}]`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Insert task helper
// ---------------------------------------------------------------------------

/**
 * Inserts a task at the specified edge in the graph and returns the result.
 *
 * Creates a fresh {@link RevisionCounter} for each invocation so callers
 * do not need to manage counter state.
 *
 * @param graph - The current workflow graph.
 * @param edgeId - The ID of the edge to split for insertion.
 * @param taskReference - Optional task reference for the new node.
 * @returns The {@link InsertTaskResult} containing the updated graph, new
 *   node ID, and revision number.
 */
export function insertTaskAtEdge(
  graph: WorkflowGraph,
  edgeId: string,
  taskReference?: string,
): InsertTaskResult {
  const counter = new RevisionCounter();
  return insertTask(graph, counter, { edgeId, taskReference });
}

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

/**
 * Creates a fresh bootstrapped workflow graph (start → end) suitable for
 * test setup.
 *
 * @returns A new {@link WorkflowGraph} with only the synthetic start and end
 *   nodes connected by the initial edge.
 */
export function createEmptyGraph(): WorkflowGraph {
  return bootstrapWorkflowGraph();
}

/**
 * Creates a new {@link RevisionCounter} starting at revision 0.
 *
 * @returns A fresh revision counter.
 */
export function createRevisionCounter(): RevisionCounter {
  return new RevisionCounter();
}
