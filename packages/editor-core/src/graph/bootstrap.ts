import type { GraphEdge, GraphNode, WorkflowGraph } from "./types.js";

/**
 * Stable ID reserved for the synthetic start boundary node.
 *
 * This ID must not be used for any task node and will remain constant across
 * the lifetime of an editor session.
 */
export const START_NODE_ID = "__start__";

/**
 * Stable ID reserved for the synthetic end boundary node.
 *
 * This ID must not be used for any task node and will remain constant across
 * the lifetime of an editor session.
 */
export const END_NODE_ID = "__end__";

/**
 * Stable ID reserved for the initial edge connecting the start node to the
 * end node in a freshly bootstrapped graph.
 */
export const INITIAL_EDGE_ID = "__start__->__end__";

/**
 * Creates the initial {@link WorkflowGraph} for a blank workflow.
 *
 * @remarks
 * The returned graph satisfies the data-model rule that a new graph must start
 * with synthetic start and end boundary nodes connected by an edge:
 *
 * ```
 * [__start__] ──► [__end__]
 * ```
 *
 * - Both nodes have `kind` set to the appropriate synthetic boundary kind
 *   (`"start"` and `"end"`).
 * - Node and edge IDs are stable constants defined by {@link START_NODE_ID},
 *   {@link END_NODE_ID}, and {@link INITIAL_EDGE_ID}.
 * - The returned graph object is a fresh value; callers may mutate it without
 *   affecting subsequent calls.
 *
 * @returns A {@link WorkflowGraph} containing exactly 2 nodes and 1 edge.
 */
export function bootstrapWorkflowGraph(): WorkflowGraph {
  const startNode: GraphNode = {
    id: START_NODE_ID,
    kind: "start",
  };

  const endNode: GraphNode = {
    id: END_NODE_ID,
    kind: "end",
  };

  const initialEdge: GraphEdge = {
    id: INITIAL_EDGE_ID,
    source: START_NODE_ID,
    target: END_NODE_ID,
  };

  return {
    nodes: [startNode, endNode],
    edges: [initialEdge],
  };
}
