import type { Specification } from "@serverlessworkflow/sdk";

import { END_NODE_ID, START_NODE_ID } from "./bootstrap.js";
import type { GraphEdge, GraphNode, WorkflowGraph } from "./types.js";

/**
 * Maps a parsed {@link Specification.Workflow} model to a {@link WorkflowGraph}
 * suitable for visual rendering.
 *
 * @remarks
 * The projection applies the following rules:
 *
 * - Synthetic `"start"` and `"end"` boundary nodes are always present.
 * - Each top-level task in `workflow.do` becomes a `"task"` graph node whose
 *   `id` and `taskReference` are both set to the task name, preserving
 *   round-trip fidelity.
 * - Edges are derived from the `then` flow directive on each task:
 *   - `undefined` or `"continue"` → advance to the next task (or `__end__`
 *     when the task is last).
 *   - `"end"` or `"exit"` → connect directly to `__end__`.
 *   - Any other string → treated as a named task reference; if the named task
 *     exists in the top-level list an edge is drawn to it, otherwise the edge
 *     falls back to `__end__` gracefully.
 * - If the workflow has no tasks the graph contains only the synthetic boundary
 *   nodes connected by a single edge (equivalent to a bootstrapped blank graph).
 * - Nested task lists (inside `do`, `for`, `try`, etc.) are intentionally not
 *   recursed into; only the top-level task sequence is projected.
 *
 * @param workflow - The validated workflow model to project.
 * @returns A {@link WorkflowGraph} with synthetic boundary nodes and one node
 *   per top-level task.
 */
export function projectWorkflowToGraph(workflow: Specification.Workflow): WorkflowGraph {
  const startNode: GraphNode = { id: START_NODE_ID, kind: "start" };
  const endNode: GraphNode = { id: END_NODE_ID, kind: "end" };

  // Extract ordered list of [taskName, taskDefinition] pairs from the task list.
  const taskEntries = extractTaskEntries(workflow.do);

  if (taskEntries.length === 0) {
    return {
      nodes: [startNode, endNode],
      edges: [
        { id: `${START_NODE_ID}->${END_NODE_ID}`, source: START_NODE_ID, target: END_NODE_ID },
      ],
    };
  }

  // Build a lookup map from task name to array index for transition resolution.
  const taskIndexByName = new Map<string, number>(
    taskEntries.map(([name], index) => [name, index]),
  );

  // Build task nodes.
  const taskNodes: GraphNode[] = taskEntries.map(([name]) => ({
    id: name,
    kind: "task",
    taskReference: name,
  }));

  // Build edges.
  const edges: GraphEdge[] = [];

  // __start__ → first task.
  // biome-ignore lint/style/noNonNullAssertion: taskEntries.length > 0 is guaranteed by the early-return guard above
  const firstTaskName = taskEntries[0]![0];
  edges.push({
    id: `${START_NODE_ID}->${firstTaskName}`,
    source: START_NODE_ID,
    target: firstTaskName,
  });

  // Inter-task and task-to-end edges.
  for (let i = 0; i < taskEntries.length; i++) {
    // biome-ignore lint/style/noNonNullAssertion: i is bounded by taskEntries.length; element is guaranteed to exist
    const [name, task] = taskEntries[i]!;
    const then = (task as { then?: string }).then;

    let targetId: string;

    if (then === undefined || then === "continue") {
      // Default: advance sequentially.
      const nextEntry = taskEntries[i + 1];
      targetId = nextEntry !== undefined ? nextEntry[0] : END_NODE_ID;
    } else if (then === "end" || then === "exit") {
      targetId = END_NODE_ID;
    } else {
      // Named task reference.
      const namedIndex = taskIndexByName.get(then);
      if (namedIndex !== undefined) {
        // biome-ignore lint/style/noNonNullAssertion: namedIndex was retrieved from taskIndexByName which maps task names to valid indices
        targetId = taskEntries[namedIndex]![0];
      } else {
        // Graceful fallback: unknown target resolves to end.
        targetId = END_NODE_ID;
      }
    }

    // Skip self-loops (a task that `then`-s to itself would not advance).
    if (targetId !== name) {
      edges.push({
        id: `${name}->${targetId}`,
        source: name,
        target: targetId,
      });
    }
  }

  return {
    nodes: [startNode, ...taskNodes, endNode],
    edges,
  };
}

/**
 * Extracts an ordered array of `[taskName, task]` pairs from a
 * {@link Specification.TaskList}.
 *
 * Each {@link Specification.TaskItem} is a single-key record where the key is
 * the task name and the value is the task definition. This helper normalises
 * that structure into a stable ordered list.
 *
 * @param taskList - The top-level task list from the workflow definition.
 * @returns An ordered array of `[name, task]` tuples. Empty array when the
 *   list is absent or empty.
 */
function extractTaskEntries(
  taskList: Specification.TaskList | undefined,
): [string, Specification.Task][] {
  if (!taskList || taskList.length === 0) {
    return [];
  }

  const result: [string, Specification.Task][] = [];

  for (const item of taskList) {
    const keys = Object.keys(item);
    for (const key of keys) {
      const task = (item as Record<string, Specification.Task>)[key];
      if (task !== undefined) {
        result.push([key, task]);
      }
    }
  }

  return result;
}
