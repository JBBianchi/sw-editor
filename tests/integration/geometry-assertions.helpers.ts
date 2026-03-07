/**
 * Shared geometry assertion helpers for integration tests.
 *
 * Provides utilities to verify spatial relationships in rendered workflow
 * layouts: anchor proximity, bounding-box overlap, port placement, and
 * deterministic positioning.
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Geometry types
// ---------------------------------------------------------------------------

/**
 * A 2-D point in pixel space.
 */
export interface Point {
  /** Horizontal coordinate in pixels. */
  x: number;
  /** Vertical coordinate in pixels. */
  y: number;
}

/**
 * An axis-aligned bounding box describing a node's rendered frame.
 */
export interface NodeFrame {
  /** Unique identifier of the node this frame belongs to. */
  id: string;
  /** Left edge x-coordinate in pixels. */
  x: number;
  /** Top edge y-coordinate in pixels. */
  y: number;
  /** Width of the node in pixels. */
  width: number;
  /** Height of the node in pixels. */
  height: number;
}

/**
 * An ordered sequence of 2-D points forming an edge path.
 */
export type EdgePath = Point[];

/**
 * The side of a node where a port is placed.
 */
export type PortSide = "top" | "right" | "bottom" | "left";

/**
 * Layout orientation for port-side validation.
 *
 * - `"horizontal"` — flow runs left-to-right; input ports on the left, output
 *   ports on the right.
 * - `"vertical"` — flow runs top-to-bottom; input ports on top, output ports
 *   on the bottom.
 */
export type Orientation = "horizontal" | "vertical";

/**
 * Describes a port attached to a node, with its position and role.
 */
export interface PortDescriptor {
  /** Absolute position of the port center in pixels. */
  position: Point;
  /** Which side of the node the port is placed on. */
  side: PortSide;
  /** Whether this port receives (`"input"`) or emits (`"output"`) connections. */
  role: "input" | "output";
}

/**
 * A node with its associated port descriptors, used for port-side assertions.
 */
export interface NodeWithPorts {
  /** The rendered frame of the node. */
  frame: NodeFrame;
  /** Ports attached to this node. */
  ports: PortDescriptor[];
}

/**
 * A snapshot of node positions used for deterministic-layout comparison.
 *
 * Maps node IDs to their rendered center positions.
 */
export type LayoutSnapshot = Map<string, Point>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Computes the Euclidean distance between two points.
 *
 * @param a - First point.
 * @param b - Second point.
 * @returns Distance in pixels.
 */
function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Computes the midpoint of an edge path.
 *
 * For paths with an even number of segments the midpoint is interpolated at
 * the halfway mark along the total path length.
 *
 * @param path - Ordered list of points forming the edge path.
 * @returns The point at the exact midpoint of the path's total length.
 * @throws If the path contains fewer than two points.
 */
function edgeMidpoint(path: EdgePath): Point {
  if (path.length < 2) {
    throw new Error("edgeMidpoint: path must contain at least two points.");
  }

  // Compute cumulative segment lengths.
  const segmentLengths: number[] = [];
  let totalLength = 0;
  for (let i = 1; i < path.length; i++) {
    const len = distance(path[i - 1], path[i]);
    segmentLengths.push(len);
    totalLength += len;
  }

  const halfLength = totalLength / 2;
  let accumulated = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i];
    if (accumulated + segLen >= halfLength) {
      const t = segLen === 0 ? 0 : (halfLength - accumulated) / segLen;
      return {
        x: path[i].x + t * (path[i + 1].x - path[i].x),
        y: path[i].y + t * (path[i + 1].y - path[i].y),
      };
    }
    accumulated += segLen;
  }

  // Fallback: return the last point (shouldn't normally reach here).
  return path[path.length - 1];
}

// ---------------------------------------------------------------------------
// Assertion functions
// ---------------------------------------------------------------------------

/**
 * Asserts that an anchor point is within a given tolerance of the edge
 * path's midpoint.
 *
 * Computes the midpoint of {@link edgePath} by walking its cumulative
 * segment lengths and checks that the Euclidean distance from
 * {@link anchor} to that midpoint is at most {@link tolerancePx} pixels.
 *
 * @param anchor - The point to verify (e.g. a label anchor position).
 * @param edgePath - The rendered edge path as an ordered list of points.
 * @param tolerancePx - Maximum allowed distance in pixels (must be >= 0).
 * @throws If the anchor is farther than {@link tolerancePx} from the
 *   edge midpoint.
 */
export function assertMidpointWithinTolerance(
  anchor: Point,
  edgePath: EdgePath,
  tolerancePx: number,
): void {
  const mid = edgeMidpoint(edgePath);
  const dist = distance(anchor, mid);

  if (dist > tolerancePx) {
    throw new Error(
      `assertMidpointWithinTolerance: anchor (${anchor.x}, ${anchor.y}) is ${dist.toFixed(2)}px ` +
        `from edge midpoint (${mid.x.toFixed(2)}, ${mid.y.toFixed(2)}), ` +
        `which exceeds the tolerance of ${tolerancePx}px.`,
    );
  }
}

/**
 * Asserts that no two node frames overlap.
 *
 * Performs pairwise axis-aligned bounding-box intersection checks across all
 * provided {@link nodeFrames}. Two frames overlap when their x-ranges and
 * y-ranges both intersect.
 *
 * @param nodeFrames - Array of node bounding boxes to check.
 * @throws If any pair of node frames overlap, naming both node IDs.
 */
export function assertNoOverlap(nodeFrames: NodeFrame[]): void {
  for (let i = 0; i < nodeFrames.length; i++) {
    for (let j = i + 1; j < nodeFrames.length; j++) {
      const a = nodeFrames[i];
      const b = nodeFrames[j];

      const xOverlap = a.x < b.x + b.width && b.x < a.x + a.width;
      const yOverlap = a.y < b.y + b.height && b.y < a.y + a.height;

      if (xOverlap && yOverlap) {
        throw new Error(
          `assertNoOverlap: nodes "${a.id}" and "${b.id}" overlap.\n` +
            `  "${a.id}": x=${a.x}, y=${a.y}, w=${a.width}, h=${a.height}\n` +
            `  "${b.id}": x=${b.x}, y=${b.y}, w=${b.width}, h=${b.height}`,
        );
      }
    }
  }
}

/**
 * Asserts that all ports on a node are placed on the correct side given
 * the layout orientation.
 *
 * For `"horizontal"` orientation, input ports must be on the `"left"` side
 * and output ports on the `"right"` side. For `"vertical"` orientation,
 * input ports must be on `"top"` and output ports on `"bottom"`.
 *
 * @param node - The node with its port descriptors.
 * @param orientation - The expected layout orientation.
 * @throws If any port is placed on an incorrect side for its role and the
 *   given orientation.
 */
export function assertPortSideCorrect(node: NodeWithPorts, orientation: Orientation): void {
  const expectedSides: Record<Orientation, Record<"input" | "output", PortSide>> = {
    horizontal: { input: "left", output: "right" },
    vertical: { input: "top", output: "bottom" },
  };

  for (const port of node.ports) {
    const expected = expectedSides[orientation][port.role];
    if (port.side !== expected) {
      throw new Error(
        `assertPortSideCorrect: node "${node.frame.id}" has ${port.role} port on ` +
          `"${port.side}" side, expected "${expected}" for "${orientation}" orientation.`,
      );
    }
  }
}

/**
 * Asserts that two layout snapshots are deterministic — that is, the
 * positions of all nodes match within a maximum per-node deviation.
 *
 * Both snapshots must contain the same set of node IDs. For each node the
 * Euclidean distance between its position in {@link snapshotA} and
 * {@link snapshotB} must not exceed {@link maxDeviationPx}.
 *
 * @param snapshotA - First layout snapshot (node ID → center position).
 * @param snapshotB - Second layout snapshot (node ID → center position).
 * @param maxDeviationPx - Maximum allowed positional deviation per node
 *   in pixels (must be >= 0).
 * @throws If the snapshots have different node sets or any node exceeds
 *   the allowed deviation.
 */
export function assertDeterministicLayout(
  snapshotA: LayoutSnapshot,
  snapshotB: LayoutSnapshot,
  maxDeviationPx: number,
): void {
  const keysA = new Set(snapshotA.keys());
  const keysB = new Set(snapshotB.keys());

  // Check for missing nodes in either direction.
  for (const id of keysA) {
    if (!keysB.has(id)) {
      throw new Error(
        `assertDeterministicLayout: node "${id}" exists in snapshotA but not in snapshotB.`,
      );
    }
  }
  for (const id of keysB) {
    if (!keysA.has(id)) {
      throw new Error(
        `assertDeterministicLayout: node "${id}" exists in snapshotB but not in snapshotA.`,
      );
    }
  }

  // Check positional deviation for each node.
  for (const [id, posA] of snapshotA) {
    // Safe: we verified above that snapshotB contains all keys from snapshotA.
    const posB = snapshotB.get(id) as Point;
    const dev = distance(posA, posB);

    if (dev > maxDeviationPx) {
      throw new Error(
        `assertDeterministicLayout: node "${id}" deviated by ${dev.toFixed(2)}px ` +
          `(max allowed: ${maxDeviationPx}px).\n` +
          `  snapshotA: (${posA.x}, ${posA.y})\n` +
          `  snapshotB: (${posB.x}, ${posB.y})`,
      );
    }
  }
}
