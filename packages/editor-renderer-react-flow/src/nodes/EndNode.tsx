/**
 * React Flow custom node component for the `"end"` boundary node kind.
 *
 * Renders a labelled box with a single target {@link Handle} whose position
 * depends on the current orientation mode: top for top-to-bottom layouts,
 * left for left-to-right layouts.
 *
 * @module
 */

import type { OrientationMode } from "@sw-editor/editor-renderer-contract";
import { Handle, type NodeProps, Position } from "@xyflow/react";
// biome-ignore lint/style/useImportType: React is a value import required by jsx:"react" compilation
import React from "react";

/** Data shape carried by end nodes. */
export interface EndNodeData {
  /** The node kind discriminant. */
  kind: "end";
  /** The current layout orientation mode. */
  orientation: OrientationMode;
  [key: string]: unknown;
}

/**
 * Visual component for an `"end"` boundary node.
 *
 * Renders a box labelled "End" with a target handle positioned according to
 * the current orientation: {@link Position.Top} for `"top-to-bottom"` or
 * {@link Position.Left} for `"left-to-right"`.
 *
 * @param props - React Flow node props. `props.data.orientation` determines
 *   handle placement.
 * @returns A React element representing the end node.
 */
export function EndNode(props: NodeProps): React.ReactElement {
  const data = props.data as EndNodeData;
  const targetPosition = data.orientation === "left-to-right" ? Position.Left : Position.Top;
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
      <Handle type="target" position={targetPosition} />
      End
    </div>
  );
}
