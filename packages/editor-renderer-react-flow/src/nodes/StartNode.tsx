/**
 * React Flow custom node component for the `"start"` boundary node kind.
 *
 * Renders a labelled box with a single source {@link Handle} whose position
 * depends on the current orientation mode: bottom for top-to-bottom layouts,
 * right for left-to-right layouts.
 *
 * @module
 */

import type { OrientationMode } from "@sw-editor/editor-renderer-contract";
import { Handle, type NodeProps, Position } from "@xyflow/react";
// biome-ignore lint/style/useImportType: React is a value import required by jsx:"react" compilation
import React from "react";

/** Data shape carried by start nodes. */
export interface StartNodeData {
  /** The node kind discriminant. */
  kind: "start";
  /** The current layout orientation mode. */
  orientation: OrientationMode;
  [key: string]: unknown;
}

/**
 * Visual component for a `"start"` boundary node.
 *
 * Renders a box labelled "Start" with a source handle positioned according to
 * the current orientation: {@link Position.Bottom} for `"top-to-bottom"` or
 * {@link Position.Right} for `"left-to-right"`.
 *
 * @param props - React Flow node props. `props.data.orientation` determines
 *   handle placement.
 * @returns A React element representing the start node.
 */
export function StartNode(props: NodeProps): React.ReactElement {
  const data = props.data as StartNodeData;
  const sourcePosition = data.orientation === "left-to-right" ? Position.Right : Position.Bottom;
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
      <Handle type="source" position={sourcePosition} />
    </div>
  );
}
