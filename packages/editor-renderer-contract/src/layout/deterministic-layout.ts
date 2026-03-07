/**
 * Shared deterministic dagre layout helper.
 *
 * Wraps the dagre directed-graph layout algorithm to produce repeatable,
 * deterministic node and edge positions for a given workflow graph and
 * orientation mode. Both renderer adapters delegate to this helper so
 * that layout results are consistent across backends.
 *
 * @module
 */

import dagre from "dagre";

import type {
  LayoutEdgeFrame,
  LayoutNodeFrame,
  LayoutSnapshot,
  OrientationMode,
  Point,
} from "../renderer-adapter.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Default node width used when the caller does not supply dimensions. */
export const DEFAULT_NODE_WIDTH = 172;

/** Default node height used when the caller does not supply dimensions. */
export const DEFAULT_NODE_HEIGHT = 40;

/** Default vertical separation between ranks (TB) or horizontal (LR). */
export const DEFAULT_RANK_SEP = 80;

/** Default horizontal separation between nodes in the same rank. */
export const DEFAULT_NODE_SEP = 40;

/** Default edge separation within the same rank. */
export const DEFAULT_EDGE_SEP = 20;

/**
 * Configuration options for the deterministic layout computation.
 */
export interface DeterministicLayoutOptions {
  /** Orientation mode for the layout. */
  orientation: OrientationMode;
  /** Width assigned to each node (pixels). Defaults to {@link DEFAULT_NODE_WIDTH}. */
  nodeWidth?: number;
  /** Height assigned to each node (pixels). Defaults to {@link DEFAULT_NODE_HEIGHT}. */
  nodeHeight?: number;
  /** Separation between ranks (pixels). Defaults to {@link DEFAULT_RANK_SEP}. */
  rankSep?: number;
  /** Separation between nodes in the same rank (pixels). Defaults to {@link DEFAULT_NODE_SEP}. */
  nodeSep?: number;
  /** Separation between edges (pixels). Defaults to {@link DEFAULT_EDGE_SEP}. */
  edgeSep?: number;
}

/**
 * A minimal graph node descriptor used as input to the layout helper.
 */
export interface LayoutInputNode {
  /** Unique node identifier. */
  id: string;
  /** Optional width override for this node (pixels). Falls back to {@link DeterministicLayoutOptions.nodeWidth}. */
  width?: number;
  /** Optional height override for this node (pixels). Falls back to {@link DeterministicLayoutOptions.nodeHeight}. */
  height?: number;
}

/**
 * A minimal graph edge descriptor used as input to the layout helper.
 */
export interface LayoutInputEdge {
  /** Unique edge identifier. */
  id: string;
  /** Source node identifier. */
  source: string;
  /** Target node identifier. */
  target: string;
}

// ---------------------------------------------------------------------------
// Layout computation
// ---------------------------------------------------------------------------

/**
 * Maps an {@link OrientationMode} to the dagre `rankdir` value.
 *
 * @param mode - The orientation mode.
 * @returns The dagre rank direction string.
 */
function toRankDir(mode: OrientationMode): string {
  return mode === "left-to-right" ? "LR" : "TB";
}

/**
 * Computes a deterministic layout for the given nodes and edges.
 *
 * Uses dagre's directed-graph layout algorithm with fixed configuration
 * so that identical inputs always produce identical outputs (≤1 px jitter).
 *
 * @param nodes - Array of graph nodes (only `id` is required).
 * @param edges - Array of graph edges with `id`, `source`, and `target`.
 * @param options - Layout configuration including orientation.
 * @returns A {@link LayoutSnapshot} with positioned node frames and edge paths.
 */
export function computeDeterministicLayout(
  nodes: LayoutInputNode[],
  edges: LayoutInputEdge[],
  options: DeterministicLayoutOptions,
): LayoutSnapshot {
  const defaultWidth = options.nodeWidth ?? DEFAULT_NODE_WIDTH;
  const defaultHeight = options.nodeHeight ?? DEFAULT_NODE_HEIGHT;
  const rankSep = options.rankSep ?? DEFAULT_RANK_SEP;
  const nodeSep = options.nodeSep ?? DEFAULT_NODE_SEP;
  const edgeSep = options.edgeSep ?? DEFAULT_EDGE_SEP;

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: toRankDir(options.orientation),
    ranksep: rankSep,
    nodesep: nodeSep,
    edgesep: edgeSep,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    const w = node.width ?? defaultWidth;
    const h = node.height ?? defaultHeight;
    g.setNode(node.id, { width: w, height: h });
  }

  for (const edge of edges) {
    g.setEdge(edge.source, edge.target, { id: edge.id });
  }

  dagre.layout(g);

  const layoutNodes: LayoutNodeFrame[] = nodes.map((node) => {
    const dagreNode = g.node(node.id);
    const w = node.width ?? defaultWidth;
    const h = node.height ?? defaultHeight;
    return {
      id: node.id,
      x: dagreNode.x - w / 2,
      y: dagreNode.y - h / 2,
      width: w,
      height: h,
    };
  });

  const layoutEdges: LayoutEdgeFrame[] = edges.map((edge) => {
    const dagreEdge = g.edge(edge.source, edge.target);
    const points: Point[] = dagreEdge.points ?? [];

    // Build the full path: source port → dagre waypoints → target port
    const sourceNode = g.node(edge.source);
    const targetNode = g.node(edge.target);

    const path: Point[] = [];

    if (options.orientation === "top-to-bottom") {
      path.push({ x: sourceNode.x, y: sourceNode.y + sourceNode.height / 2 });
    } else {
      path.push({ x: sourceNode.x + sourceNode.width / 2, y: sourceNode.y });
    }

    for (const pt of points) {
      path.push({ x: pt.x, y: pt.y });
    }

    if (options.orientation === "top-to-bottom") {
      path.push({ x: targetNode.x, y: targetNode.y - targetNode.height / 2 });
    } else {
      path.push({ x: targetNode.x - targetNode.width / 2, y: targetNode.y });
    }

    return {
      id: edge.id,
      sourceId: edge.source,
      targetId: edge.target,
      path,
    };
  });

  return { nodes: layoutNodes, edges: layoutEdges };
}
