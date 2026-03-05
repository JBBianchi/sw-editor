/**
 * Supported workflow source format identifiers.
 */
export type WorkflowFormat = "json" | "yaml";

/**
 * Raw workflow source as provided by the host or exported by the editor.
 *
 * The `content` string must be valid JSON or YAML matching the declared
 * `format` before it is passed to the editor core for parsing.
 */
export interface WorkflowSource {
  /** Serialization format of the workflow content. */
  format: WorkflowFormat;
  /** Raw serialized workflow document. */
  content: string;
}

/**
 * Identifies the renderer backend compiled into the current editor bundle.
 *
 * The value is fixed at build time and cannot change for a running instance.
 */
export type RendererId = "rete-lit" | "react-flow";

/**
 * Selection targeting a graph node.
 */
export interface NodeSelection {
  kind: "node";
  /** Stable identifier of the selected node. */
  nodeId: string;
}

/**
 * Selection targeting a graph edge.
 */
export interface EdgeSelection {
  kind: "edge";
  /** Stable identifier of the selected edge. */
  edgeId: string;
}

/**
 * An active selection within the workflow graph.
 *
 * A `null` or absent selection means workflow-level (no element selected).
 */
export type EditorSelection = NodeSelection | EdgeSelection;
