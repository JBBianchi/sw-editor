/**
 * Identifies the renderer backend active for an editor bundle.
 *
 * Exactly one renderer ID is active per editor bundle. Renderer selection is
 * build-time and fixed for the editor instance lifecycle.
 */
export type RendererId = "rete-lit" | "react-flow";

/**
 * A graph node as understood by the renderer layer.
 *
 * The renderer treats nodes as opaque data; semantics are owned by editor-core.
 */
export interface RendererGraphNode {
  /** Stable node identity. */
  id: string;
  /** Task kind or synthetic boundary kind (e.g. `"start"`, `"end"`, `"call"`). */
  kind: string;
  /** Task reference string for task nodes; absent for synthetic nodes. */
  taskReference?: string;
  /** Arbitrary renderer-visible metadata attached by editor-core. */
  data?: Record<string, unknown>;
}

/**
 * A graph edge as understood by the renderer layer.
 */
export interface RendererGraphEdge {
  /** Stable edge identity. */
  id: string;
  /** Identity of the source node. */
  source: string;
  /** Identity of the target node. */
  target: string;
  /** Optional label shown on the edge. */
  label?: string;
}

/**
 * The graph data passed to the renderer for initial mount and subsequent
 * update calls.
 */
export interface WorkflowGraph {
  /** Ordered list of nodes in the graph. */
  nodes: RendererGraphNode[];
  /** Ordered list of directed edges in the graph. */
  edges: RendererGraphEdge[];
}

// ---------------------------------------------------------------------------
// Selection / event bridge (renderer → core)
// ---------------------------------------------------------------------------

/**
 * A renderer-reported node selection event.
 */
export interface RendererNodeSelection {
  kind: "node";
  /** Identity of the selected node. */
  nodeId: string;
}

/**
 * A renderer-reported edge selection event.
 */
export interface RendererEdgeSelection {
  kind: "edge";
  /** Identity of the selected edge. */
  edgeId: string;
}

/**
 * A renderer-reported clear-selection event (no element selected).
 */
export interface RendererClearSelection {
  kind: "none";
}

/**
 * Discriminated union of all renderer selection events.
 *
 * Consumers should narrow on `event.kind` to determine what was selected.
 */
export type RendererSelectionEvent =
  | RendererNodeSelection
  | RendererEdgeSelection
  | RendererClearSelection;

/**
 * Callback type invoked by the renderer whenever the user selection changes.
 *
 * @param event - The selection event emitted by the renderer.
 */
export type RendererSelectionHandler = (
  event: RendererSelectionEvent
) => void;

/**
 * Normalised event bridge surface that a renderer exposes to editor-core.
 *
 * All events flow renderer → core through this bridge so that editor-core
 * never needs to know about renderer-specific event APIs.
 */
export interface RendererEventBridge {
  /**
   * Register a callback to receive selection change events.
   *
   * Only one handler is active at a time; calling this a second time replaces
   * the previous handler.
   *
   * @param handler - The callback to invoke on selection changes.
   */
  onSelectionChange(handler: RendererSelectionHandler): void;

  /**
   * Remove the registered selection-change handler, if any.
   */
  offSelectionChange(): void;
}

// ---------------------------------------------------------------------------
// Capability snapshot
// ---------------------------------------------------------------------------

/**
 * A point-in-time description of what the active renderer backend supports.
 *
 * Capabilities describe renderer backend behavior, not workflow semantics.
 * Backward-compatible capability expansion is allowed; consumers must tolerate
 * unknown boolean flags being absent (treat as `false`).
 */
export interface RendererCapabilitySnapshot {
  /** The renderer backend identified by this snapshot. */
  rendererId: RendererId;
  /** Semver string of the renderer backend package. */
  rendererVersion: string;
  /** Whether the renderer supports custom per-node renderer plugins. */
  supportsNodeRendererPlugins: boolean;
  /** Whether the renderer can project nested inline sub-workflows. */
  supportsNestedInlineProjection: boolean;
  /** Whether the renderer can project route/transition overlay annotations. */
  supportsRouteOverlayProjection: boolean;
  /**
   * Optional list of known rendering limitations for this backend.
   * Each entry is a short human-readable string.
   */
  knownLimits?: string[];
}

// ---------------------------------------------------------------------------
// Adapter interface
// ---------------------------------------------------------------------------

/**
 * The shared renderer adapter contract.
 *
 * Each renderer package (`editor-renderer-rete-lit`,
 * `editor-renderer-react-flow`) exports a class or factory that satisfies
 * this interface. Editor-core depends only on this contract and never on a
 * concrete renderer implementation.
 *
 * Lifecycle:
 * 1. `mount(container, graph)` — attach renderer to the DOM element and render
 *    the initial graph.
 * 2. `update(graph)` — re-render with an updated graph without remounting.
 * 3. `dispose()` — release all renderer resources and detach from the DOM.
 *
 * The renderer must not initiate any network calls during its lifecycle.
 */
export interface RendererAdapter {
  /**
   * The identifier of this renderer backend.
   *
   * Used for logging, telemetry, and capability lookups.
   */
  readonly rendererId: RendererId;

  /**
   * A snapshot of the capabilities this renderer instance supports.
   *
   * The snapshot is stable for the lifetime of the adapter instance.
   */
  readonly capabilities: RendererCapabilitySnapshot;

  /**
   * The event bridge surface exposed by this renderer.
   *
   * Editor-core subscribes to renderer events through this bridge rather than
   * through renderer-specific APIs.
   */
  readonly events: RendererEventBridge;

  /**
   * Attach the renderer to `container` and render the initial `graph`.
   *
   * Must be called exactly once before `update` or `dispose`.
   *
   * @param container - The DOM element to render into. The renderer owns the
   *   subtree of this element while mounted.
   * @param graph - The initial workflow graph to display.
   */
  mount(container: HTMLElement, graph: WorkflowGraph): void;

  /**
   * Re-render the graph with updated data.
   *
   * Must only be called after a successful `mount`. The renderer should apply
   * the minimum structural changes needed to reflect `graph`; full remounts
   * are not required.
   *
   * @param graph - The updated workflow graph to display.
   */
  update(graph: WorkflowGraph): void;

  /**
   * Release all renderer resources and detach from the DOM.
   *
   * After `dispose` the adapter instance must not be reused. Calling
   * `update` or `dispose` again after this point is a programming error.
   */
  dispose(): void;
}
