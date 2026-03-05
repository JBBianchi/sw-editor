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
import React, { useState, useLayoutEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  ReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import type {
  RendererAdapter,
  RendererCapabilitySnapshot,
  RendererEventBridge,
  RendererGraphNode,
  RendererGraphEdge,
  RendererSelectionEvent,
  RendererSelectionHandler,
  WorkflowGraph,
} from "@sw-editor/editor-renderer-contract";

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
 * Convert a {@link RendererGraphNode} to a React Flow {@link Node}.
 *
 * @param node - The renderer graph node to convert.
 * @param index - The index of the node in the ordered nodes array, used for
 *   default layout positioning.
 * @returns A React Flow node object suitable for passing to `<ReactFlow>`.
 */
function toRFNode(node: RendererGraphNode, index: number): RFNode {
  return {
    id: node.id,
    type: node.kind,
    position: nodePosition(index),
    data: {
      ...node.data,
      kind: node.kind,
      ...(node.taskReference !== undefined
        ? { taskReference: node.taskReference }
        : {}),
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
 * @param graph - The workflow graph to convert.
 * @returns An object containing the converted `nodes` and `edges` arrays.
 */
function toRFGraph(graph: WorkflowGraph): {
  nodes: RFNode[];
  edges: RFEdge[];
} {
  return {
    nodes: graph.nodes.map((n, i) => toRFNode(n, i)),
    edges: graph.edges.map((e) => toRFEdge(e)),
  };
}

// ---------------------------------------------------------------------------
// React component
// ---------------------------------------------------------------------------

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
  const [nodes, setNodes] = useState<RFNode[]>(props.initialNodes);
  const [edges, setEdges] = useState<RFEdge[]>(props.initialEdges);

  // Expose an imperative controller to the adapter immediately after mount.
  // Using useLayoutEffect ensures the controller is available before the
  // browser has painted, which prevents a race between mount() returning and
  // the first update() call arriving.
  useLayoutEffect(() => {
    props.onController({
      updateGraph(newNodes: RFNode[], newEdges: RFEdge[]): void {
        setNodes(newNodes);
        setEdges(newEdges);
      },
    });
    // The dependency array is intentionally empty: we only want to publish the
    // controller once, after the initial render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return React.createElement(
    ReactFlowProvider,
    null,
    React.createElement(ReactFlow, {
      nodes,
      edges,
      onSelectionChange: props.onSelectionChange,
      fitView: true,
      proOptions: { hideAttribution: false },
    })
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

    const { nodes, edges } = toRFGraph(graph);
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
      })
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
      throw new Error(
        "ReactFlowAdapter: update() called before mount() completed"
      );
    }

    const { nodes, edges } = toRFGraph(graph);
    this.controller.updateGraph(nodes, edges);
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
    if (this.root !== null) {
      this.root.unmount();
      this.root = null;
    }
  }
}
