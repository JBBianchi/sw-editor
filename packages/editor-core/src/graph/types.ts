/**
 * Discriminated kind of a graph node.
 *
 * - `"start"` and `"end"` are synthetic boundary nodes automatically inserted
 *   when a new workflow graph is bootstrapped.
 * - `"task"` represents a real workflow task step.
 */
export type GraphNodeKind = "start" | "end" | "task";

/**
 * A single node in the workflow graph.
 *
 * @remarks
 * `id` is stable across non-destructive edits. Synthetic boundary nodes use
 * the reserved IDs `"__start__"` and `"__end__"`.
 */
export interface GraphNode {
  /** Stable unique identifier for this node within the graph. */
  id: string;
  /** Discriminated kind describing the role of this node. */
  kind: GraphNodeKind;
  /**
   * Reference to the workflow task definition for `"task"` kind nodes.
   * Absent for synthetic boundary nodes.
   */
  taskReference?: string;
}

/**
 * A directed edge connecting two nodes in the workflow graph.
 *
 * @remarks
 * `source` and `target` must each reference the `id` of an existing
 * {@link GraphNode} in the same {@link WorkflowGraph}.
 */
export interface GraphEdge {
  /** Stable unique identifier for this edge within the graph. */
  id: string;
  /** `id` of the source node. */
  source: string;
  /** `id` of the target node. */
  target: string;
}

/**
 * The complete in-memory graph representation of a workflow.
 *
 * @remarks
 * - A new graph must always contain at least the synthetic start and end nodes
 *   connected by an edge (see {@link bootstrapWorkflowGraph}).
 * - Insert operations must preserve graph connectivity.
 */
export interface WorkflowGraph {
  /** Ordered list of graph nodes. */
  nodes: GraphNode[];
  /** Ordered list of directed edges between nodes. */
  edges: GraphEdge[];
}
