/**
 * React Flow custom node component for the `"task"` node kind.
 *
 * Renders a labelled box showing the task's `taskReference` value, with
 * target and source {@link Handle} components for incoming and outgoing edges.
 *
 * @module
 */

import { Handle, type NodeProps, Position } from "@xyflow/react";
// biome-ignore lint/style/useImportType: React is a value import required by jsx:"react" compilation
import React from "react";

/** Data shape carried by task nodes. */
export interface TaskNodeData {
  /** The node kind discriminant. */
  kind: "task";
  /** The workflow task reference name displayed as the node label. */
  taskReference: string;
  [key: string]: unknown;
}

/**
 * Visual component for a `"task"` workflow node.
 *
 * Renders a box labelled with the node's `taskReference` value. A target
 * handle is placed at the top for incoming edges and a source handle at the
 * bottom for outgoing edges.
 *
 * @param props - React Flow node props. `props.data.taskReference` is used as
 *   the visible label; falls back to `"(task)"` when absent.
 * @returns A React element representing the task node.
 */
export function TaskNode(props: NodeProps): React.ReactElement {
  const data = props.data as TaskNodeData;
  const label = data.taskReference ?? "(task)";
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
      <Handle type="target" position={Position.Top} />
      {label}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
