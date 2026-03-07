/**
 * Rete.js + Lit renderer adapter for the sw-editor project.
 *
 * Implements the shared {@link RendererAdapter} contract using Rete.js v2 and
 * the `@retejs/lit-plugin` for Lit-based node and connection rendering.
 *
 * @module
 */

import type { LitArea2D } from "@retejs/lit-plugin";
import { LitPlugin, Presets } from "@retejs/lit-plugin";
import type {
  EdgeInsertionAnchor,
  FocusTarget,
  LayoutSnapshot,
  OrientationMode,
  Point,
  RendererAdapter,
  RendererCapabilitySnapshot,
  RendererEdgeAnchor,
  RendererEventBridge,
  RendererSelectionEvent,
  RendererSelectionHandler,
  WorkflowGraph,
} from "@sw-editor/editor-renderer-contract";
import { computeDeterministicLayout } from "@sw-editor/editor-renderer-contract";
import type { GetSchemes } from "rete";
import { ClassicPreset, NodeEditor } from "rete";
import { AreaExtensions, AreaPlugin } from "rete-area-plugin";
import { ConnectionPlugin, Presets as ConnectionPresets } from "rete-connection-plugin";

// ---------------------------------------------------------------------------
// Rete.js type definitions
// ---------------------------------------------------------------------------

type Schemes = GetSchemes<
  ClassicPreset.Node,
  ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>
>;

type AreaExtra = LitArea2D<Schemes>;

// ---------------------------------------------------------------------------
// Capabilities
// ---------------------------------------------------------------------------

/**
 * Capability snapshot for the `rete-lit` renderer backend.
 *
 * This value is a module-level constant because it does not vary between
 * adapter instances; it reflects the capabilities of the installed backend
 * packages and is stable for the lifetime of any {@link ReteLitAdapter}.
 */
const CAPABILITIES: RendererCapabilitySnapshot = {
  rendererId: "rete-lit",
  rendererVersion: "0.0.0",
  supportsNodeRendererPlugins: true,
  supportsNestedInlineProjection: false,
  supportsRouteOverlayProjection: false,
  knownLimits: [
    "Nested inline sub-workflow projection is not supported in this release",
    "Route/transition overlay annotations are not supported in this release",
  ],
};

// ---------------------------------------------------------------------------
// Event bridge
// ---------------------------------------------------------------------------

/**
 * Concrete {@link RendererEventBridge} implementation.
 *
 * Collects a single selection-change handler and exposes an internal
 * {@link emit} method that the adapter uses to push events.
 */
class ReteLitEventBridge implements RendererEventBridge {
  private handler: RendererSelectionHandler | null = null;

  /**
   * Register a callback to receive selection change events.
   *
   * Replaces any previously registered handler.
   *
   * @param handler - The callback to invoke on selection changes.
   */
  onSelectionChange(handler: RendererSelectionHandler): void {
    this.handler = handler;
  }

  /**
   * Remove the registered selection-change handler, if any.
   */
  offSelectionChange(): void {
    this.handler = null;
  }

  /**
   * Emit a selection event to the registered handler.
   *
   * No-op when no handler is registered.
   *
   * @param event - The normalised selection event to dispatch.
   */
  emit(event: RendererSelectionEvent): void {
    this.handler?.(event);
  }
}

// ---------------------------------------------------------------------------
// Selection tracking via Selector subclass
// ---------------------------------------------------------------------------

/**
 * Minimal representation of a selectable entity as understood by the
 * rete-area-plugin's `Selector` base class.
 *
 * The shape matches the `SelectorEntity` interface from
 * `rete-area-plugin/_types/extensions/selectable`. It is defined here to
 * avoid a deep-path import that may not be available before the package is
 * installed.
 */
interface SelectorEntity {
  readonly id: string;
  readonly label: string;
  translate(dx: number, dy: number): void;
  unselect(): void;
}

/**
 * Extended {@link AreaExtensions.Selector} that translates Rete selection
 * state changes into normalised {@link RendererSelectionEvent}s emitted
 * through the adapter's event bridge.
 *
 * Selection emissions are scheduled as microtasks to coalesce the burst of
 * `remove` → `add` calls that occurs when a non-accumulating selection
 * replaces the previous one.
 */
class TrackingSelector extends AreaExtensions.Selector<SelectorEntity> {
  /** Tracks the currently selected entities, keyed by `"label:id"`. */
  private readonly selected = new Map<string, SelectorEntity>();
  private emitScheduled = false;

  /**
   * @param bridge - The event bridge through which selection events are emitted.
   * @param reteNodeToGraphId - Live map from Rete node id to workflow graph node id.
   * @param reteConnToGraphId - Live map from Rete connection id to workflow graph edge id.
   */
  constructor(
    private readonly bridge: ReteLitEventBridge,
    private readonly reteNodeToGraphId: Map<string, string>,
    private readonly reteConnToGraphId: Map<string, string>,
  ) {
    super();
  }

  /**
   * Adds an entity to the selection.
   *
   * When `accumulate` is `false` the existing selection is replaced.
   *
   * @param entity - The entity to add.
   * @param accumulate - Whether to keep existing selections.
   */
  override async add(entity: SelectorEntity, accumulate: boolean): Promise<void> {
    if (!accumulate) {
      this.selected.clear();
    }
    await super.add(entity, accumulate);
    this.selected.set(this.entityKey(entity), entity);
    this.scheduleEmit();
  }

  /**
   * Removes an entity from the selection.
   *
   * @param entity - The entity to remove.
   */
  override async remove(entity: Pick<SelectorEntity, "id" | "label">): Promise<void> {
    await super.remove(entity);
    this.selected.delete(this.entityKey(entity));
    this.scheduleEmit();
  }

  private entityKey(entity: Pick<SelectorEntity, "id" | "label">): string {
    return `${entity.label}:${entity.id}`;
  }

  /**
   * Schedules a selection emission as a microtask so that a sequence of
   * `remove` + `add` calls (non-accumulating replace) produces a single event.
   */
  private scheduleEmit(): void {
    if (this.emitScheduled) return;
    this.emitScheduled = true;
    queueMicrotask(() => {
      this.emitScheduled = false;
      this.emitCurrentSelection();
    });
  }

  /**
   * Derives and emits a {@link RendererSelectionEvent} that reflects the
   * current selection state.
   *
   * Rules:
   * - Exactly one node selected → `{ kind: "node" }`
   * - Exactly one connection selected → `{ kind: "edge" }`
   * - Empty selection → `{ kind: "none" }`
   * - Multi-selection or unmapped entity → `{ kind: "none" }` (simplifies consumer logic)
   */
  private emitCurrentSelection(): void {
    const nodes = [...this.selected.values()].filter((e) => e.label === "node");
    const conns = [...this.selected.values()].filter((e) => e.label === "connection");

    if (nodes.length === 1 && conns.length === 0) {
      const node = nodes[0];
      if (node !== undefined) {
        const graphId = this.reteNodeToGraphId.get(node.id);
        if (graphId !== undefined) {
          this.bridge.emit({ kind: "node", nodeId: graphId });
          return;
        }
      }
    }

    if (conns.length === 1 && nodes.length === 0) {
      const conn = conns[0];
      if (conn !== undefined) {
        const graphId = this.reteConnToGraphId.get(conn.id);
        if (graphId !== undefined) {
          this.bridge.emit({ kind: "edge", edgeId: graphId });
          return;
        }
      }
    }

    this.bridge.emit({ kind: "none" });
  }
}

// ---------------------------------------------------------------------------
// Path midpoint helper
// ---------------------------------------------------------------------------

/**
 * Compute the midpoint of an edge path by walking cumulative segment lengths.
 *
 * Interpolates the point at exactly half the total path length, handling
 * both straight and multi-segment (curved/routed) paths.
 *
 * @param path - Ordered list of points forming the edge path.
 * @returns The point at the midpoint of the path's total length.
 */
function pathMidpoint(path: Point[]): Point {
  if (path.length < 2) {
    return path[0] ?? { x: 0, y: 0 };
  }

  let totalLength = 0;
  const segmentLengths: number[] = [];
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1] as Point;
    const curr = path[i] as Point;
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segmentLengths.push(len);
    totalLength += len;
  }

  const halfLength = totalLength / 2;
  let accumulated = 0;

  for (let i = 0; i < segmentLengths.length; i++) {
    const segLen = segmentLengths[i] as number;
    if (accumulated + segLen >= halfLength) {
      const from = path[i] as Point;
      const to = path[i + 1] as Point;
      const t = segLen === 0 ? 0 : (halfLength - accumulated) / segLen;
      return {
        x: from.x + t * (to.x - from.x),
        y: from.y + t * (to.y - from.y),
      };
    }
    accumulated += segLen;
  }

  // Fallback: return the last point (should not normally be reached).
  return path[path.length - 1] as Point;
}

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

/**
 * Live state held while the adapter is mounted.
 *
 * Destroyed by {@link ReteLitAdapter.dispose}.
 */
interface MountedState {
  readonly editor: NodeEditor<Schemes>;
  readonly area: AreaPlugin<Schemes, AreaExtra>;
  readonly container: HTMLElement;
}

/**
 * Rete.js + Lit renderer adapter implementing the shared
 * {@link RendererAdapter} contract.
 *
 * **Lifecycle**
 *
 * 1. {@link mount} — attaches the Rete editor to the supplied `HTMLElement`
 *    and renders the initial graph.
 * 2. {@link update} — synchronises the rendered view with an updated graph
 *    snapshot without remounting.
 * 3. {@link dispose} — destroys the Rete area, releases event listeners, and
 *    frees internal state.
 *
 * After {@link dispose} the adapter instance must not be reused.
 *
 * The adapter does not initiate any network calls during its lifecycle.
 */
export class ReteLitAdapter implements RendererAdapter {
  /**
   * The identifier of this renderer backend.
   *
   * @inheritdoc
   */
  readonly rendererId = "rete-lit" as const;

  /**
   * Capability snapshot for this backend instance.
   *
   * @inheritdoc
   */
  readonly capabilities: RendererCapabilitySnapshot = CAPABILITIES;

  /**
   * Event bridge surface through which editor-core subscribes to renderer
   * events.
   *
   * @inheritdoc
   */
  readonly events: RendererEventBridge;

  private readonly bridge: ReteLitEventBridge;
  private mounted: MountedState | null = null;

  /**
   * The most recently applied workflow graph, used for synchronous position
   * lookups in {@link getEdgeAnchor} when node views are not yet available.
   */
  private lastGraph: WorkflowGraph | null = null;

  /**
   * Monotonically increasing generation counter used to cancel stale
   * {@link applyGraph} operations when rapid repeated insertions occur.
   */
  private applyGeneration = 0;

  /**
   * Maps a Rete node id to the corresponding workflow graph node id.
   *
   * Rebuilt on every {@link applyGraph} call so that it always reflects the
   * current graph snapshot.
   */
  private readonly reteNodeToGraphId = new Map<string, string>();

  /**
   * Maps a Rete connection id to the corresponding workflow graph edge id.
   *
   * Rebuilt on every {@link applyGraph} call so that it always reflects the
   * current graph snapshot.
   */
  private readonly reteConnToGraphId = new Map<string, string>();

  /**
   * Maps a workflow graph node id to the corresponding Rete node id.
   *
   * Inverse of {@link reteNodeToGraphId}; rebuilt on every {@link applyGraph} call.
   */
  private readonly graphIdToReteNode = new Map<string, string>();

  /**
   * Maps a workflow graph edge id to the corresponding Rete connection id.
   *
   * Inverse of {@link reteConnToGraphId}; rebuilt on every {@link applyGraph} call.
   */
  private readonly graphIdToReteConn = new Map<string, string>();

  /** The current graph orientation mode. */
  private orientation: OrientationMode = "top-to-bottom";

  /**
   * Cached dagre layout snapshot computed during {@link applyGraph}.
   * Kept in sync with {@link lastGraph} so that {@link getEdgeAnchor},
   * {@link getLayoutSnapshot}, and {@link getInsertionAnchors} return
   * correct positions immediately after an update.
   */
  private cachedLayout: LayoutSnapshot = { nodes: [], edges: [] };

  /**
   * Whether cached insertion anchors need recomputation.
   *
   * Set to `true` on viewport change; cleared when {@link getInsertionAnchors}
   * recomputes the layout.
   */
  private anchorsDirty = false;

  /** The currently registered viewport-change callback, if any. */
  private viewportChangeCallback: (() => void) | undefined;

  /**
   * Whether cached insertion anchors need recomputation.
   *
   * Set to `true` on viewport change; cleared when {@link getInsertionAnchors}
   * recomputes the anchors.
   */
  private anchorsDirty = false;

  /** Cached insertion anchors from the last {@link getInsertionAnchors} call. */
  private cachedInsertionAnchors: EdgeInsertionAnchor[] = [];

  constructor() {
    this.bridge = new ReteLitEventBridge();
    this.events = this.bridge;
  }

  /**
   * Attach the renderer to `container` and render the initial `graph`.
   *
   * Creates the Rete `NodeEditor`, `AreaPlugin`, `LitPlugin`, and
   * `ConnectionPlugin`, wires them together, and populates the editor with
   * the supplied graph. The graph population runs asynchronously; the Rete
   * area is immediately attached to the DOM.
   *
   * @param container - The DOM element to render into.
   * @param graph - The initial workflow graph to display.
   * @throws If called while already mounted (call {@link dispose} first).
   */
  mount(container: HTMLElement, graph: WorkflowGraph): void {
    if (this.mounted !== null) {
      throw new Error(
        "ReteLitAdapter: mount() called while already mounted. " + "Call dispose() first.",
      );
    }

    const editor = new NodeEditor<Schemes>();
    const area = new AreaPlugin<Schemes, AreaExtra>(container);
    const render = new LitPlugin<Schemes, AreaExtra>();
    const connection = new ConnectionPlugin<Schemes, AreaExtra>();

    render.addPreset(Presets.classic.setup());
    connection.addPreset(ConnectionPresets.classic.setup());

    editor.use(area);
    area.use(render);
    area.use(connection);

    const selector = new TrackingSelector(
      this.bridge,
      this.reteNodeToGraphId,
      this.reteConnToGraphId,
    );

    AreaExtensions.selectableNodes(area, selector, {
      accumulating: AreaExtensions.accumulateOnCtrl(),
    });
    AreaExtensions.simpleNodesOrder(area);

    // Listen for viewport changes (pan/zoom) to invalidate cached anchors.
    area.addPipe((context) => {
      if (
        context.type === "translated" ||
        context.type === "zoomed" ||
        context.type === "resized"
      ) {
        this.anchorsDirty = true;
        this.viewportChangeCallback?.();
      }
      return context;
    });

    this.mounted = { editor, area, container };
    this.lastGraph = graph;

    void this.applyGraph(graph);
  }

  /**
   * Re-render the graph with updated data.
   *
   * Clears the current Rete editor state and repopulates it from the supplied
   * `graph`. Node positions are recomputed using the deterministic dagre
   * layout on each update; a diff-based approach can replace this when
   * incremental update performance becomes a requirement.
   *
   * @param graph - The updated workflow graph to display.
   * @throws If called before {@link mount}.
   */
  update(graph: WorkflowGraph): void {
    if (this.mounted === null) {
      throw new Error("ReteLitAdapter: update() called before mount().");
    }
    this.lastGraph = graph;
    this.anchorsDirty = true;
    this.cachedInsertionAnchors = [];
    void this.applyGraph(graph);
  }

  /**
   * Retrieve the visual anchor point for the given edge.
   *
   * Computes the geometric midpoint of the edge path from the cached dagre
   * layout. Because the layout cache is updated synchronously in
   * {@link applyGraph}, anchors for newly created edges are available
   * immediately after an {@link update} call.
   *
   * Returns `null` if the edge is not found in the cached layout or the
   * adapter is not mounted.
   *
   * @param edgeId - The workflow graph edge identity to query.
   * @returns The edge anchor with midpoint coordinates, or `null` if unavailable.
   */
  getEdgeAnchor(edgeId: string): RendererEdgeAnchor | null {
    const edgeFrame = this.cachedLayout.edges.find((e) => e.id === edgeId);
    if (!edgeFrame || edgeFrame.path.length < 2) {
      return null;
    }

    const mid = pathMidpoint(edgeFrame.path);

    return {
      edgeId,
      sourceNodeId: edgeFrame.sourceId,
      targetNodeId: edgeFrame.targetId,
      x: mid.x,
      y: mid.y,
    };
  }

  /**
   * Compute an edge insertion anchor from the rendered SVG path element.
   *
   * Queries the mounted container for the SVG `<path>` element that
   * corresponds to the given edge and computes its geometric midpoint
   * using the SVG DOM API. This produces accurate viewport-space
   * coordinates for both curved (Bézier) and straight edge paths.
   *
   * Returns `null` when the adapter is not mounted, the edge is unknown,
   * or the SVG path element is not present in the DOM (e.g., before the
   * render plugin has painted the connection or in headless environments).
   *
   * @param edgeId - The workflow graph edge identity to query.
   * @returns The insertion anchor at the path midpoint, or `null` if unavailable.
   */
  private getAnchorFromRenderedPath(edgeId: string): EdgeInsertionAnchor | null {
    if (this.mounted === null) return null;

    const reteConnId = this.graphIdToReteConn.get(edgeId);
    if (reteConnId === undefined) return null;

    const pathEl = this.findConnectionPathElement(reteConnId);
    if (pathEl === null) return null;

    try {
      const totalLength = pathEl.getTotalLength();
      const midpoint = pathEl.getPointAtLength(totalLength / 2);

      // The SVG path coordinates produced by the Rete connection renderer
      // are in the same coordinate space as node positions (area space).
      // When a getScreenCTM is available we use it together with the
      // container's bounding rect to derive precise viewport-relative
      // coordinates; otherwise we return the raw SVG coordinates which are
      // already in area space.
      const ownerSvg = pathEl.ownerSVGElement;
      const screenCTM = pathEl.getScreenCTM();
      if (ownerSvg !== null && screenCTM !== null) {
        const svgPt = ownerSvg.createSVGPoint();
        svgPt.x = midpoint.x;
        svgPt.y = midpoint.y;
        const screenPt = svgPt.matrixTransform(screenCTM);

        const containerRect = this.mounted.container.getBoundingClientRect();
        return {
          edgeId,
          x: screenPt.x - containerRect.left,
          y: screenPt.y - containerRect.top,
        };
      }

      return { edgeId, x: midpoint.x, y: midpoint.y };
    } catch {
      // SVG geometry API unavailable (e.g., JSDOM without SVG support).
      return null;
    }
  }

  /**
   * Locate the SVG `<path>` element rendered for a Rete connection.
   *
   * Searches the mounted container for known selector patterns used by the
   * Rete area plugin and render plugins to wrap connection elements.
   *
   * @param reteConnId - The Rete-internal connection identity.
   * @returns The SVG path element, or `null` if not found.
   */
  private findConnectionPathElement(reteConnId: string): SVGPathElement | null {
    if (this.mounted === null) return null;

    const { container } = this.mounted;

    // Rete area plugin / render plugins use data-testid on connection wrappers.
    const selectors = [
      `[data-testid="connection-${reteConnId}"] path`,
      `[data-connection-id="${reteConnId}"] path`,
    ];

    for (const selector of selectors) {
      const el = container.querySelector<SVGPathElement>(selector);
      if (el !== null && typeof el.getTotalLength === "function") {
        return el;
      }
    }

    return null;
  }

  /**
   * Bring a node into view in the renderer viewport.
   *
   * Scrolls and zooms the viewport to center the target node using
   * {@link AreaExtensions.zoomAt}, then attempts to set DOM focus on the
   * node's rendered element.
   *
   * @param target - Describes which node to focus and the desired behavior.
   */
  focusNode(target: FocusTarget): void {
    if (this.mounted === null) return;

    const reteNodeId = this.graphIdToReteNode.get(target.nodeId);
    if (reteNodeId === undefined) return;

    const { editor, area } = this.mounted;
    const node = editor.getNode(reteNodeId);
    if (node === undefined) return;

    void AreaExtensions.zoomAt(area, [node]);

    const nodeView = area.nodeViews.get(reteNodeId);
    if (nodeView?.element) {
      nodeView.element.focus();
    }
  }

  /**
   * Return a point-in-time snapshot of all node and edge positions in the
   * current layout.
   *
   * Returns the cached dagre layout computed during the most recent
   * {@link applyGraph} call.
   *
   * @returns The layout snapshot.
   */
  getLayoutSnapshot(): LayoutSnapshot {
    return this.cachedLayout;
  }

  /**
   * Return insertion anchor points for all currently rendered edges.
   *
   * Each anchor represents the midpoint of an edge where an inline "add
   * task" control can be positioned. When the adapter is mounted and SVG
   * path elements are available in the DOM, the midpoint is computed from
   * the actual rendered path using the SVG DOM API. Falls back to the
   * cached dagre layout edge paths for midpoint computation.
   *
   * @returns An array of edge insertion anchors.
   */
  getInsertionAnchors(): EdgeInsertionAnchor[] {
    if (this.anchorsDirty && this.lastGraph !== null) {
      this.cachedLayout = computeDeterministicLayout(
        this.lastGraph.nodes.map((n) => ({ id: n.id })),
        this.lastGraph.edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
        { orientation: this.orientation },
      );
      this.anchorsDirty = false;
    }

    if (this.lastGraph === null) {
      return [];
    }

    if (!this.anchorsDirty && this.cachedInsertionAnchors.length > 0) {
      return this.cachedInsertionAnchors;
    }

    this.cachedInsertionAnchors = this.lastGraph.edges.flatMap((e) => {
      const svgAnchor = this.getAnchorFromRenderedPath(e.id);
      if (svgAnchor !== null) {
        return [svgAnchor];
      }
      const edgeFrame = this.cachedLayout.edges.find((f) => f.id === e.id);
      if (!edgeFrame || edgeFrame.path.length < 2) {
        return [];
      }
      const mid = pathMidpoint(edgeFrame.path);
      return [{ edgeId: e.id, x: mid.x, y: mid.y }];
    });
    this.anchorsDirty = false;

    return this.cachedInsertionAnchors;
  }

  /**
   * Set the flow direction of the graph layout.
   *
   * Stores the requested orientation for future layout calculations.
   * Re-applies the current graph to trigger a re-layout.
   *
   * @param mode - The desired orientation mode.
   */
  setOrientation(mode: OrientationMode): void {
    this.orientation = mode;
    if (this.lastGraph !== null) {
      void this.applyGraph(this.lastGraph);
    }
  }

  /**
   * Register a callback invoked whenever the renderer viewport changes
   * (scroll, zoom, resize).
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
   * Destroys the Rete `AreaPlugin`, clears the selection handler, and resets
   * internal state. After this call the instance must not be reused.
   *
   * @inheritdoc
   */
  dispose(): void {
    if (this.mounted === null) {
      return;
    }
    this.applyGeneration += 1;
    this.mounted.area.destroy();
    this.bridge.offSelectionChange();
    this.viewportChangeCallback = undefined;
    this.reteNodeToGraphId.clear();
    this.reteConnToGraphId.clear();
    this.graphIdToReteNode.clear();
    this.graphIdToReteConn.clear();
    this.cachedInsertionAnchors = [];
    this.lastGraph = null;
    this.cachedLayout = { nodes: [], edges: [] };
    this.mounted = null;
  }

  /**
   * Synchronise the Rete editor to the supplied graph snapshot.
   *
   * Clears all existing nodes and connections, then adds nodes and edges from
   * `graph`. Node positions are computed by the shared dagre-based
   * deterministic layout helper using the current orientation mode. The
   * viewport is adjusted to fit all nodes after population.
   *
   * If the adapter is disposed before this async operation completes (e.g.
   * because the consumer called {@link dispose} immediately after
   * {@link mount}), the method exits early without touching the destroyed
   * editor.
   *
   * @param graph - The graph snapshot to apply.
   */
  private async applyGraph(graph: WorkflowGraph): Promise<void> {
    const state = this.mounted;
    if (state === null) return;

    const generation = ++this.applyGeneration;
    const { editor, area } = state;

    await editor.clear();

    // Bail out if a newer applyGraph call has started (rapid repeated insertions).
    if (generation !== this.applyGeneration) return;

    this.reteNodeToGraphId.clear();
    this.reteConnToGraphId.clear();
    this.graphIdToReteNode.clear();
    this.graphIdToReteConn.clear();

    // Compute deterministic dagre layout before adding nodes to the editor.
    const layout = computeDeterministicLayout(
      graph.nodes.map((n) => ({ id: n.id })),
      graph.edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      { orientation: this.orientation },
    );
    this.cachedLayout = layout;
    this.anchorsDirty = false;

    const positionMap = new Map<string, { x: number; y: number }>();
    for (const frame of layout.nodes) {
      positionMap.set(frame.id, { x: frame.x, y: frame.y });
    }

    const socket = new ClassicPreset.Socket("workflow");
    const reteNodeMap = new Map<string, ClassicPreset.Node>();

    for (const graphNode of graph.nodes) {
      if (generation !== this.applyGeneration) return;

      const node = new ClassicPreset.Node(graphNode.kind);
      node.addOutput("out", new ClassicPreset.Output(socket));
      node.addInput("in", new ClassicPreset.Input(socket));

      await editor.addNode(node);
      const pos = positionMap.get(graphNode.id) ?? { x: 0, y: 0 };
      await area.translate(node.id, pos);

      this.reteNodeToGraphId.set(node.id, graphNode.id);
      this.graphIdToReteNode.set(graphNode.id, node.id);
      reteNodeMap.set(graphNode.id, node);
    }

    for (const graphEdge of graph.edges) {
      if (generation !== this.applyGeneration) return;

      const sourceNode = reteNodeMap.get(graphEdge.source);
      const targetNode = reteNodeMap.get(graphEdge.target);

      if (sourceNode === undefined || targetNode === undefined) continue;

      const conn = new ClassicPreset.Connection(sourceNode, "out", targetNode, "in");
      await editor.addConnection(conn);
      this.reteConnToGraphId.set(conn.id, graphEdge.id);
      this.graphIdToReteConn.set(graphEdge.id, conn.id);
    }

    // Only zoom if this is still the latest generation.
    if (generation === this.applyGeneration) {
      void AreaExtensions.zoomAt(area, editor.getNodes());
    }
  }
}
