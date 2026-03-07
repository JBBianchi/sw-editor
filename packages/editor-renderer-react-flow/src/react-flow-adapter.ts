/**
 * React Flow renderer adapter implementing the shared {@link RendererAdapter} contract.
 *
 * This module bridges the editor-core renderer contract to the @xyflow/react
 * library. It mounts a React Flow graph into a provided DOM container, keeps
 * the rendered graph in sync with {@link WorkflowGraph} updates, bridges
 * React Flow selection events to the normalised {@link RendererSelectionEvent}
 * format, and exposes an accurate {@link RendererCapabilitySnapshot}.
 *
 * @module
 */

import "@xyflow/react/dist/style.css";

import type {
  EdgeInsertionAnchor,
  FocusTarget,
  LayoutSnapshot,
  OrientationMode,
  RendererAdapter,
  RendererCapabilitySnapshot,
  RendererEdgeAnchor,
  RendererEventBridge,
  RendererGraphEdge,
  RendererGraphNode,
  RendererSelectionEvent,
  RendererSelectionHandler,
  WorkflowGraph,
} from "@sw-editor/editor-renderer-contract";
import {
  type Edge,
  type Node,
  type NodeTypes,
  type OnSelectionChangeParams,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import React, { useLayoutEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { EndNode } from "./nodes/EndNode.js";
import { StartNode } from "./nodes/StartNode.js";
import { TaskNode } from "./nodes/TaskNode.js";

// ---------------------------------------------------------------------------
// Node type registry
// ---------------------------------------------------------------------------

/**
 * Mapping from workflow node kind strings to their React Flow custom component.
 *
 * Passed to the `<ReactFlow>` component so that it renders the correct visual
 * representation for each node in the graph instead of the built-in default
 * node shape.
 */
const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  task: TaskNode,
};

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** React Flow node with required position coordinates. */
type RFNode = Node;
/** React Flow edge. */
type RFEdge = Edge;

/**
 * Imperative handle exposed by {@link WorkflowFlowApp} to the adapter so
 * that graph state can be updated without re-mounting the React tree.
 */
interface FlowController {
  /**
   * Replace the current nodes and edges in the rendered React Flow graph.
   *
   * @param nodes - The updated array of React Flow nodes.
   * @param edges - The updated array of React Flow edges.
   */
  updateGraph(nodes: RFNode[], edges: RFEdge[]): void;

  /**
   * Retrieve a rendered node by its ID.
   *
   * @param id - The node ID to look up.
   * @returns The node object, or `undefined` if not found.
   */
  getNode(id: string): RFNode | undefined;

  /**
   * Retrieve a rendered edge by its ID.
   *
   * @param id - The edge ID to look up.
   * @returns The edge object, or `undefined` if not found.
   */
  getEdge(id: string): RFEdge | undefined;

  /**
   * Center the viewport on the given coordinates.
   *
   * @param x - The x coordinate to center on.
   * @param y - The y coordinate to center on.
   * @param options - Optional zoom and duration settings.
   */
  setCenter(x: number, y: number, options?: { zoom?: number; duration?: number }): void;
}

/** Props for the internal {@link WorkflowFlowApp} component. */
interface WorkflowFlowAppProps {
  /** Initial React Flow nodes to display on first render. */
  initialNodes: RFNode[];
  /** Initial React Flow edges to display on first render. */
  initialEdges: RFEdge[];
  /**
   * Callback invoked by React Flow whenever the user selection changes.
   *
   * @param params - Selected nodes and edges at the time of the event.
   */
  onSelectionChange: (params: OnSelectionChangeParams) => void;
  /**
   * Called once after initial render with an imperative controller that
   * the adapter uses to push graph updates into React state.
   *
   * @param controller - The imperative controller for this component instance.
   */
  onController: (controller: FlowController) => void;
}

// ---------------------------------------------------------------------------
// Graph conversion helpers
// ---------------------------------------------------------------------------

/** Horizontal gap between nodes when arranging in a simple linear layout. */
const NODE_H_GAP = 200;
/** Vertical position used for all nodes in the default layout. */
const NODE_Y = 0;

/**
 * Derive a simple left-to-right layout position for each node based on its
 * index in the ordered nodes array.
 *
 * The layout is intentionally minimal: React Flow handles interactive
 * repositioning once the graph is rendered. A more sophisticated auto-layout
 * can be layered on top in future capability expansions.
 *
 * @param index - Zero-based position of the node in the nodes array.
 * @returns The `{x, y}` coordinates for the node.
 */
function nodePosition(index: number): { x: number; y: number } {
  return { x: index * NODE_H_GAP, y: NODE_Y };
}

/**
 * Compute layout positions for all nodes in a graph, keyed by node ID.
 *
 * Produces a fresh position map every time it is called so that repeated
 * insertions always receive recalculated, non-overlapping coordinates.
 * Each node is assigned a unique horizontal slot based on its array index,
 * guaranteeing that no two nodes share the same position regardless of
 * how many insertions have occurred.
 *
 * @param graph - The workflow graph whose nodes need layout positions.
 * @returns A map from node ID to `{x, y}` coordinates.
 */
function computeLayoutPositions(graph: WorkflowGraph): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  for (let i = 0; i < graph.nodes.length; i++) {
    const node = graph.nodes[i];
    if (!node) continue;
    positions.set(node.id, nodePosition(i));
  }
  return positions;
}

/**
 * Convert a {@link RendererGraphNode} to a React Flow {@link Node}.
 *
 * @param node - The renderer graph node to convert.
 * @param position - The pre-computed layout position for this node.
 * @returns A React Flow node object suitable for passing to `<ReactFlow>`.
 */
function toRFNode(node: RendererGraphNode, position: { x: number; y: number }): RFNode {
  return {
    id: node.id,
    type: node.kind,
    position,
    data: {
      ...node.data,
      kind: node.kind,
      ...(node.taskReference !== undefined ? { taskReference: node.taskReference } : {}),
    },
  };
}

/**
 * Convert a {@link RendererGraphEdge} to a React Flow {@link Edge}.
 *
 * @param edge - The renderer graph edge to convert.
 * @returns A React Flow edge object suitable for passing to `<ReactFlow>`.
 */
function toRFEdge(edge: RendererGraphEdge): RFEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    ...(edge.label !== undefined ? { label: edge.label } : {}),
  };
}

/**
 * Convert a {@link WorkflowGraph} to separate React Flow nodes and edges arrays.
 *
 * Recalculates layout positions for every node on each call so that repeated
 * insertions always produce non-overlapping coordinates. The position map is
 * returned alongside the converted arrays so the caller can cache it for
 * subsequent edge-anchor queries.
 *
 * @param graph - The workflow graph to convert.
 * @returns An object containing the converted `nodes`, `edges`, and a
 *   `positions` map keyed by node ID.
 */
function toRFGraph(graph: WorkflowGraph): {
  nodes: RFNode[];
  edges: RFEdge[];
  positions: Map<string, { x: number; y: number }>;
} {
  const positions = computeLayoutPositions(graph);
  return {
    nodes: graph.nodes.map((n) => toRFNode(n, positions.get(n.id) ?? { x: 0, y: 0 })),
    edges: graph.edges.map((e) => toRFEdge(e)),
    positions,
  };
}

// ---------------------------------------------------------------------------
// React component
// ---------------------------------------------------------------------------

/**
 * Inner component rendered inside {@link ReactFlowProvider} so that the
 * `useReactFlow` hook is available. Exposes an imperative controller back
 * to the adapter.
 *
 * @param props - Component properties.
 * @returns A React element containing the React Flow canvas.
 */
function WorkflowFlowInner(props: WorkflowFlowAppProps): React.ReactElement {
  const [nodes, setNodes] = useState<RFNode[]>(props.initialNodes);
  const [edges, setEdges] = useState<RFEdge[]>(props.initialEdges);
  const reactFlowInstance = useReactFlow();

  // biome-ignore lint/correctness/useExhaustiveDependencies: empty deps array is intentional; controller is published once on mount
  useLayoutEffect(() => {
    props.onController({
      updateGraph(newNodes: RFNode[], newEdges: RFEdge[]): void {
        setNodes(newNodes);
        setEdges(newEdges);
      },
      getNode(id: string): RFNode | undefined {
        return reactFlowInstance.getNode(id);
      },
      getEdge(id: string): RFEdge | undefined {
        return reactFlowInstance.getEdge(id);
      },
      setCenter(x: number, y: number, options?: { zoom?: number; duration?: number }): void {
        reactFlowInstance.setCenter(x, y, options);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return React.createElement(ReactFlow, {
    nodes,
    edges,
    nodeTypes,
    onSelectionChange: props.onSelectionChange,
    fitView: true,
    proOptions: { hideAttribution: false },
  });
}

/**
 * Internal React component that renders the React Flow canvas.
 *
 * The component maintains its own nodes/edges state and exposes an imperative
 * {@link FlowController} handle via `onController` so that the
 * {@link ReactFlowAdapter} can push graph updates without re-mounting.
 *
 * @param props - Component properties.
 * @returns A React element containing the React Flow canvas wrapped in a provider.
 */
function WorkflowFlowApp(props: WorkflowFlowAppProps): React.ReactElement {
  return React.createElement(
    ReactFlowProvider,
    null,
    React.createElement(WorkflowFlowInner, props),
  );
}

// ---------------------------------------------------------------------------
// Event bridge implementation
// ---------------------------------------------------------------------------

/**
 * Implementation of {@link RendererEventBridge} that stores a single
 * selection-change handler and allows it to be replaced or removed.
 */
class ReactFlowEventBridge implements RendererEventBridge {
  /** The currently registered selection handler, or `undefined` if none. */
  private selectionHandler: RendererSelectionHandler | undefined;

  /**
   * Register a callback to receive normalised selection change events.
   *
   * Replaces any previously registered handler.
   *
   * @param handler - The callback to invoke on selection changes.
   */
  onSelectionChange(handler: RendererSelectionHandler): void {
    this.selectionHandler = handler;
  }

  /**
   * Remove the currently registered selection-change handler, if any.
   */
  offSelectionChange(): void {
    this.selectionHandler = undefined;
  }

  /**
   * Translate a raw React Flow selection event into a {@link RendererSelectionEvent}
   * and dispatch it to the registered handler.
   *
   * When exactly one node is selected and no edges are selected the event is
   * {@link RendererNodeSelection}. When exactly one edge is selected and no
   * nodes are selected the event is {@link RendererEdgeSelection}. All other
   * combinations (multi-select, empty selection) produce
   * {@link RendererClearSelection}.
   *
   * @param params - The raw selection params from React Flow.
   */
  handleRFSelection(params: OnSelectionChangeParams): void {
    if (this.selectionHandler === undefined) {
      return;
    }

    const { nodes: selectedNodes, edges: selectedEdges } = params;

    let event: RendererSelectionEvent;

    if (selectedNodes.length === 1 && selectedEdges.length === 0) {
      const node = selectedNodes[0];
      if (node === undefined) {
        event = { kind: "none" };
      } else {
        event = { kind: "node", nodeId: node.id };
      }
    } else if (selectedEdges.length === 1 && selectedNodes.length === 0) {
      const edge = selectedEdges[0];
      if (edge === undefined) {
        event = { kind: "none" };
      } else {
        event = { kind: "edge", edgeId: edge.id };
      }
    } else {
      event = { kind: "none" };
    }

    this.selectionHandler(event);
  }
}

// ---------------------------------------------------------------------------
// Adapter implementation
// ---------------------------------------------------------------------------

/**
 * React Flow renderer adapter implementing the shared {@link RendererAdapter}
 * contract.
 *
 * Lifecycle:
 * 1. Construct the adapter — sets up capability snapshot and event bridge.
 * 2. Call {@link mount} with a container element and initial graph — mounts a
 *    React root and renders the React Flow canvas.
 * 3. Call {@link update} with new graph data — pushes the update into React
 *    state without re-mounting.
 * 4. Call {@link dispose} — unmounts the React root and releases resources.
 *
 * The adapter must not initiate any network calls during its lifecycle.
 *
 * @example
 * ```ts
 * const adapter = new ReactFlowAdapter();
 * adapter.mount(containerElement, initialGraph);
 * adapter.events.onSelectionChange(event => console.log(event));
 * adapter.update(updatedGraph);
 * adapter.dispose();
 * ```
 */
export class ReactFlowAdapter implements RendererAdapter {
  /** @inheritdoc */
  readonly rendererId = "react-flow" as const;

  /** @inheritdoc */
  readonly capabilities: RendererCapabilitySnapshot = {
    rendererId: "react-flow",
    rendererVersion: "12.x",
    supportsNodeRendererPlugins: true,
    supportsNestedInlineProjection: false,
    supportsRouteOverlayProjection: false,
    knownLimits: [
      "Nested inline sub-workflow projection is not supported in this release.",
      "Route/transition overlay annotations are not supported in this release.",
    ],
  };

  /** @inheritdoc */
  readonly events: ReactFlowEventBridge = new ReactFlowEventBridge();

  /** The React DOM root created during {@link mount}; `null` before mount and after dispose. */
  private root: Root | null = null;

  /** Imperative controller used to push graph updates into React state without re-mounting. */
  private controller: FlowController | null = null;

  /** Whether {@link dispose} has been called. */
  private disposed = false;

  /** The most recently rendered workflow graph, used for edge lookups. */
  private lastGraph: WorkflowGraph | null = null;

  /**
   * Cached layout positions keyed by node ID, computed during {@link mount} and
   * {@link update}. Kept in sync with {@link lastGraph} so that
   * {@link getEdgeAnchor} returns correct midpoints immediately after an
   * insertion without needing to wait for a React render cycle.
   */
  private layoutPositions: Map<string, { x: number; y: number }> = new Map();

  /** The current graph orientation mode. */
  private orientation: OrientationMode = "top-to-bottom";

  /** The currently registered viewport-change callback, if any. */
  private viewportChangeCallback: (() => void) | undefined;

  /**
   * Attach the React Flow renderer to `container` and render the initial graph.
   *
   * Creates a React DOM root and mounts the internal {@link WorkflowFlowApp}
   * component. The adapter registers itself as the imperative controller so
   * that subsequent {@link update} calls can push data into React state.
   *
   * Must be called exactly once before {@link update} or {@link dispose}.
   *
   * @param container - The DOM element to render into. The adapter takes
   *   ownership of this element's subtree while mounted.
   * @param graph - The initial workflow graph to display.
   * @throws {Error} If called after {@link dispose}.
   */
  mount(container: HTMLElement, graph: WorkflowGraph): void {
    if (this.disposed) {
      throw new Error("ReactFlowAdapter: mount() called after dispose()");
    }

    this.lastGraph = graph;
    const { nodes, edges, positions } = toRFGraph(graph);
    this.layoutPositions = positions;
    this.root = createRoot(container);

    const bridge = this.events;

    this.root.render(
      React.createElement(WorkflowFlowApp, {
        initialNodes: nodes,
        initialEdges: edges,
        onSelectionChange: (params: OnSelectionChangeParams) => {
          bridge.handleRFSelection(params);
        },
        onController: (controller: FlowController) => {
          this.controller = controller;
        },
      }),
    );
  }

  /**
   * Re-render the React Flow graph with updated data.
   *
   * Pushes new nodes and edges into the React component state via the
   * imperative controller. React Flow applies the minimal structural changes
   * needed to reflect the new graph; a full remount is not performed.
   *
   * Must be called after a successful {@link mount}.
   *
   * @param graph - The updated workflow graph to display.
   * @throws {Error} If called before {@link mount} or after {@link dispose}.
   */
  update(graph: WorkflowGraph): void {
    if (this.disposed) {
      throw new Error("ReactFlowAdapter: update() called after dispose()");
    }
    if (this.controller === null) {
      throw new Error("ReactFlowAdapter: update() called before mount() completed");
    }

    this.lastGraph = graph;
    const { nodes, edges, positions } = toRFGraph(graph);
    this.layoutPositions = positions;
    this.controller.updateGraph(nodes, edges);
  }

  /**
   * Retrieve the visual anchor point for the given edge.
   *
   * Computes the geometric midpoint between the source and target node
   * positions using the cached layout computed during the most recent
   * {@link mount} or {@link update} call. Because the layout cache is
   * updated synchronously before React re-renders, anchors for newly
   * created edges are available immediately after insertion — no render
   * cycle delay.
   *
   * Returns `null` if the edge is not found in the current graph or the
   * adapter is not mounted.
   *
   * @param edgeId - The identity of the edge to query.
   * @returns The edge anchor with midpoint coordinates, or `null` if unavailable.
   */
  getEdgeAnchor(edgeId: string): RendererEdgeAnchor | null {
    if (this.disposed || this.controller === null || this.lastGraph === null) {
      return null;
    }

    const edge = this.lastGraph.edges.find((e) => e.id === edgeId);
    if (!edge) {
      return null;
    }

    const sourcePos = this.layoutPositions.get(edge.source);
    const targetPos = this.layoutPositions.get(edge.target);
    if (sourcePos === undefined || targetPos === undefined) {
      return null;
    }

    return {
      edgeId,
      sourceNodeId: edge.source,
      targetNodeId: edge.target,
      x: (sourcePos.x + targetPos.x) / 2,
      y: (sourcePos.y + targetPos.y) / 2,
    };
  }

  /**
   * Bring a node into view in the renderer viewport.
   *
   * Scrolls and zooms the viewport to center the target node. If the node
   * is not found or the adapter is not mounted, this is a no-op.
   *
   * @param target - Describes which node to focus and the desired behavior.
   */
  focusNode(target: FocusTarget): void {
    if (this.disposed || this.controller === null) {
      return;
    }

    const pos = this.layoutPositions.get(target.nodeId);
    if (pos === undefined) {
      return;
    }

    this.controller.setCenter(pos.x, pos.y, { duration: 200 });
  }

  /**
   * Return a point-in-time snapshot of all node and edge positions in the
   * current layout.
   *
   * Node frames are derived from the cached layout positions computed during
   * the most recent {@link mount} or {@link update} call. Edge frames use
   * the source and target node positions as a two-point path.
   *
   * @returns The layout snapshot.
   */
  getLayoutSnapshot(): LayoutSnapshot {
    if (this.lastGraph === null) {
      return { nodes: [], edges: [] };
    }

    const nodeFrames = this.lastGraph.nodes.map((n) => {
      const pos = this.layoutPositions.get(n.id) ?? { x: 0, y: 0 };
      return { id: n.id, x: pos.x, y: pos.y, width: 150, height: 40 };
    });

    const edgeFrames = this.lastGraph.edges.map((e) => {
      const srcPos = this.layoutPositions.get(e.source) ?? { x: 0, y: 0 };
      const tgtPos = this.layoutPositions.get(e.target) ?? { x: 0, y: 0 };
      return {
        id: e.id,
        sourceId: e.source,
        targetId: e.target,
        path: [
          { x: srcPos.x, y: srcPos.y },
          { x: tgtPos.x, y: tgtPos.y },
        ],
      };
    });

    return { nodes: nodeFrames, edges: edgeFrames };
  }

  /**
   * Return insertion anchor points for all currently rendered edges.
   *
   * Each anchor represents the midpoint of an edge where an inline "add
   * task" control can be positioned. Midpoints are computed from cached
   * layout positions.
   *
   * @returns An array of edge insertion anchors.
   */
  getInsertionAnchors(): EdgeInsertionAnchor[] {
    if (this.lastGraph === null) {
      return [];
    }

    return this.lastGraph.edges.flatMap((e) => {
      const srcPos = this.layoutPositions.get(e.source);
      const tgtPos = this.layoutPositions.get(e.target);
      if (srcPos === undefined || tgtPos === undefined) {
        return [];
      }
      return [
        {
          edgeId: e.id,
          x: (srcPos.x + tgtPos.x) / 2,
          y: (srcPos.y + tgtPos.y) / 2,
        },
      ];
    });
  }

  /**
   * Set the flow direction of the graph layout.
   *
   * Stores the requested orientation for future layout calculations.
   * Currently the adapter uses a simple linear layout; full orientation
   * support will be implemented when the layout engine is expanded.
   *
   * @param mode - The desired orientation mode.
   */
  setOrientation(mode: OrientationMode): void {
    this.orientation = mode;
    if (this.lastGraph !== null) {
      const { nodes, edges, positions } = toRFGraph(this.lastGraph);
      this.layoutPositions = positions;
      this.controller?.updateGraph(nodes, edges);
    }
  }

  /**
   * Register a callback invoked whenever the renderer viewport changes
   * (scroll, zoom, resize).
   *
   * The current implementation returns a no-op unsubscribe function.
   * Full viewport change tracking will be added when React Flow's
   * `onViewportChange` callback is wired through the component tree.
   *
   * @param callback - The function to call on viewport changes.
   * @returns A function that removes the subscription.
   */
  onViewportChange(callback: () => void): () => void {
    this.viewportChangeCallback = callback;
    return () => {
      if (this.viewportChangeCallback === callback) {
        this.viewportChangeCallback = undefined;
      }
    };
  }

  /**
   * Release all renderer resources and detach from the DOM.
   *
   * Unmounts the React root and clears internal references. After `dispose`
   * the adapter instance must not be reused; calling {@link update} or
   * {@link dispose} again is a programming error.
   */
  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.events.offSelectionChange();
    this.controller = null;
    this.lastGraph = null;
    this.layoutPositions.clear();
    if (this.root !== null) {
      this.root.unmount();
      this.root = null;
    }
  }
}
