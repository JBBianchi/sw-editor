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
  RendererAdapter,
  RendererCapabilitySnapshot,
  RendererEventBridge,
  RendererSelectionEvent,
  RendererSelectionHandler,
  WorkflowGraph,
} from "@sw-editor/editor-renderer-contract";
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

    this.mounted = { editor, area };

    void this.applyGraph(graph);
  }

  /**
   * Re-render the graph with updated data.
   *
   * Clears the current Rete editor state and repopulates it from the supplied
   * `graph`. Node positions are reset to a simple horizontal layout on each
   * update; a diff-based approach can replace this when incremental update
   * performance becomes a requirement.
   *
   * @param graph - The updated workflow graph to display.
   * @throws If called before {@link mount}.
   */
  update(graph: WorkflowGraph): void {
    if (this.mounted === null) {
      throw new Error("ReteLitAdapter: update() called before mount().");
    }
    void this.applyGraph(graph);
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
    this.mounted.area.destroy();
    this.bridge.offSelectionChange();
    this.reteNodeToGraphId.clear();
    this.reteConnToGraphId.clear();
    this.mounted = null;
  }

  /**
   * Synchronise the Rete editor to the supplied graph snapshot.
   *
   * Clears all existing nodes and connections, then adds nodes and edges from
   * `graph`. Nodes are laid out in a simple left-to-right sequence with a
   * fixed horizontal gap. The viewport is adjusted to fit all nodes after
   * population.
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

    const { editor, area } = state;

    await editor.clear();

    this.reteNodeToGraphId.clear();
    this.reteConnToGraphId.clear();

    const socket = new ClassicPreset.Socket("workflow");
    const reteNodeMap = new Map<string, ClassicPreset.Node>();

    /** Horizontal spacing between nodes in the default layout (pixels). */
    const NODE_GAP = 220;
    let xOffset = 0;

    for (const graphNode of graph.nodes) {
      const node = new ClassicPreset.Node(graphNode.kind);
      node.addOutput("out", new ClassicPreset.Output(socket));
      node.addInput("in", new ClassicPreset.Input(socket));

      await editor.addNode(node);
      await area.translate(node.id, { x: xOffset, y: 0 });

      xOffset += NODE_GAP;

      this.reteNodeToGraphId.set(node.id, graphNode.id);
      reteNodeMap.set(graphNode.id, node);
    }

    for (const graphEdge of graph.edges) {
      const sourceNode = reteNodeMap.get(graphEdge.source);
      const targetNode = reteNodeMap.get(graphEdge.target);

      if (sourceNode === undefined || targetNode === undefined) continue;

      const conn = new ClassicPreset.Connection(sourceNode, "out", targetNode, "in");
      await editor.addConnection(conn);
      this.reteConnToGraphId.set(conn.id, graphEdge.id);
    }

    void AreaExtensions.zoomAt(area, editor.getNodes());
  }
}
