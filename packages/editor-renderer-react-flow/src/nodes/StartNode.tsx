/**
 * React Flow custom node component for the `"start"` boundary node kind.
 *
 * Renders a labelled box with a single source {@link Handle} at the bottom,
 * representing the entry point of a workflow graph.
 *
 * @module
 */

import { Handle, type NodeProps, Position } from "@xyflow/react";
// biome-ignore lint/style/useImportType: React is a value import required by jsx:"react" compilation
import React from "react";

/** Data shape carried by start nodes. */
export interface StartNodeData {
  /** The node kind discriminant. */
  kind: "start";
  [key: string]: unknown;
}

/**
 * Visual component for a `"start"` boundary node.
 *
 * Renders a box labelled "Start" with a source handle at the bottom so that
 * React Flow can draw outgoing edges from this node.
 *
 * @param _props - React Flow node props (position, selection state, etc.).
 *   Data fields are not used for rendering at MVP quality.
 * @returns A React element representing the start node.
 */
export function StartNode(_props: NodeProps): React.ReactElement {
  return (
    <div
      style={{
        padding: "8px 16px",
        border: "2px solid #22c55e",
        borderRadius: "4px",
        background: "#f0fdf4",
        fontWeight: "bold",
        textAlign: "center",
        minWidth: "80px",
      }}
    >
      Start
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
