/**
 * React Flow custom node component for the `"end"` boundary node kind.
 *
 * Renders a labelled box with a single target {@link Handle} at the top,
 * representing the terminal point of a workflow graph.
 *
 * @module
 */

import { Handle, type NodeProps, Position } from "@xyflow/react";
// biome-ignore lint/style/useImportType: React is a value import required by jsx:"react" compilation
import React from "react";

/** Data shape carried by end nodes. */
export interface EndNodeData {
  /** The node kind discriminant. */
  kind: "end";
  [key: string]: unknown;
}

/**
 * Visual component for an `"end"` boundary node.
 *
 * Renders a box labelled "End" with a target handle at the top so that
 * React Flow can draw incoming edges to this node.
 *
 * @param _props - React Flow node props (position, selection state, etc.).
 *   Data fields are not used for rendering at MVP quality.
 * @returns A React element representing the end node.
 */
export function EndNode(_props: NodeProps): React.ReactElement {
  return (
    <div
      style={{
        padding: "8px 16px",
        border: "2px solid #ef4444",
        borderRadius: "4px",
        background: "#fef2f2",
        fontWeight: "bold",
        textAlign: "center",
        minWidth: "80px",
      }}
    >
      <Handle type="target" position={Position.Top} />
      End
    </div>
  );
}
