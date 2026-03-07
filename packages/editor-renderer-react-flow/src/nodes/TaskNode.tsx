/**
 * React Flow custom node component for the `"task"` node kind.
 *
 * Renders a labelled box showing the task's `taskReference` value, with
 * target and source {@link Handle} components whose positions depend on the
 * current orientation mode.
 *
 * @module
 */

import { Handle, type NodeProps, Position } from "@xyflow/react";
// biome-ignore lint/style/useImportType: React is a value import required by jsx:"react" compilation
import React from "react";

import type { OrientationMode } from "@sw-editor/editor-renderer-contract";

/** Data shape carried by task nodes. */
export interface TaskNodeData {
  /** The node kind discriminant. */
  kind: "task";
  /** The workflow task reference name displayed as the node label. */
  taskReference: string;
  /** The current layout orientation mode. */
  orientation: OrientationMode;
  [key: string]: unknown;
}

/**
 * Visual component for a `"task"` workflow node.
 *
 * Renders a box labelled with the node's `taskReference` value. Handle
 * positions are determined by orientation: target on top / source on bottom
 * for `"top-to-bottom"`, or target on left / source on right for
 * `"left-to-right"`.
 *
 * @param props - React Flow node props. `props.data.taskReference` is used as
 *   the visible label; falls back to `"(task)"` when absent.
 *   `props.data.orientation` determines handle placement.
 * @returns A React element representing the task node.
 */
export function TaskNode(props: NodeProps): React.ReactElement {
  const data = props.data as TaskNodeData;
  const label = data.taskReference ?? "(task)";
  const isLR = data.orientation === "left-to-right";
  const targetPosition = isLR ? Position.Left : Position.Top;
  const sourcePosition = isLR ? Position.Right : Position.Bottom;
  return (
    <div
      style={{
        padding: "8px 16px",
        border: "2px solid #3b82f6",
        borderRadius: "4px",
        background: "#eff6ff",
        textAlign: "center",
        minWidth: "100px",
      }}
    >
      <Handle type="target" position={targetPosition} />
      {label}
      <Handle type="source" position={sourcePosition} />
    </div>
  );
}
