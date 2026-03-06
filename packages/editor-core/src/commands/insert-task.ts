import type { GraphEdge, GraphNode, WorkflowGraph } from "../graph/types.js";
import type { RevisionCounter } from "../state/revision.js";
import type { Revision } from "../state/types.js";

/**
 * Options for the {@link insertTask} command.
 */
export interface InsertTaskOptions {
  /**
   * ID of the edge to split when inserting the new task node.
   *
   * The edge is replaced by two new edges:
   * `edge.source → newNode` and `newNode → edge.target`.
   */
  edgeId: string;

  /**
   * Optional reference to the workflow task definition associated with the
   * new node. Stored as {@link GraphNode.taskReference}.
   */
  taskReference?: string;
}

/**
 * Result returned by a successful {@link insertTask} invocation.
 */
export interface InsertTaskResult {
  /**
   * Updated workflow graph containing the new task node and re-wired edges.
   * This is always a fresh object; the original graph passed to `insertTask`
   * is not mutated.
   */
  graph: WorkflowGraph;

  /**
   * Stable ID assigned to the newly created task node.
   */
  nodeId: string;

  /**
   * Revision number after the insertion. Matches
   * `counter.currentRevision` immediately after the call.
   */
  revision: Revision;
}

/**
 * Inserts a new task node into the workflow graph by splitting an existing edge.
 *
 * @remarks
 * Given an edge `source → target`, the command:
 * 1. Removes the original edge.
 * 2. Creates a new `"task"` node with a unique stable ID.
 * 3. Adds edge `source → newNode`.
 * 4. Adds edge `newNode → target`.
 * 5. Increments the revision counter.
 *
 * The input `graph` is never mutated; a new {@link WorkflowGraph} object is
 * always returned.
 *
 * @param graph - The current workflow graph.
 * @param counter - The editor revision counter, incremented on success.
 * @param options - Insertion options including the target edge ID.
 * @returns An {@link InsertTaskResult} with the updated graph, new node ID,
 *   and incremented revision.
 * @throws {Error} If no edge with the given `edgeId` exists in `graph`.
 */
export function insertTask(
  graph: WorkflowGraph,
  counter: RevisionCounter,
  options: InsertTaskOptions,
): InsertTaskResult {
  const { edgeId, taskReference } = options;

  const targetEdge = graph.edges.find((e) => e.id === edgeId);
  if (!targetEdge) {
    throw new Error(`insertTask: edge "${edgeId}" not found in graph. Cannot insert task.`);
  }

  const nodeId = generateNodeId();

  const newNode: GraphNode = {
    id: nodeId,
    kind: "task",
    ...(taskReference !== undefined ? { taskReference } : {}),
  };

  const edgeToSource: GraphEdge = {
    id: `${targetEdge.source}->${nodeId}`,
    source: targetEdge.source,
    target: nodeId,
  };

  const edgeToTarget: GraphEdge = {
    id: `${nodeId}->${targetEdge.target}`,
    source: nodeId,
    target: targetEdge.target,
  };

  const updatedGraph: WorkflowGraph = {
    nodes: [...graph.nodes, newNode],
    edges: [...graph.edges.filter((e) => e.id !== edgeId), edgeToSource, edgeToTarget],
  };

  const revision = counter.increment();

  return { graph: updatedGraph, nodeId, revision };
}

/**
 * Generates a unique, stable node ID for a new task node.
 *
 * Combines a millisecond timestamp with two independent random segments to
 * produce a string that is unique within a session. The `"task-"` prefix
 * distinguishes task nodes from synthetic boundary nodes (`"__start__"` and
 * `"__end__"`).
 *
 * @returns A unique string suitable for use as a {@link GraphNode.id}.
 */
function generateNodeId(): string {
  const ts = Date.now().toString(36);
  const r1 = Math.random().toString(36).slice(2);
  const r2 = Math.random().toString(36).slice(2);
  return `task-${ts}-${r1}${r2}`;
}
