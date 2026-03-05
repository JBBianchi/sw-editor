import type {
  EdgeSelection,
  EditorSelection,
  EditorSelectionChangedPayload,
  NodeSelection,
} from "@sw-editor/editor-host-client";
import { EditorEventName } from "@sw-editor/editor-host-client";

/**
 * Represents the workflow-level panel context (no graph element selected).
 */
export interface WorkflowPanelContext {
  kind: "workflow";
}

/**
 * Represents a node property panel context for a specific selected node.
 */
export interface NodePanelContext {
  kind: "node";
  /** Stable identifier of the selected node. */
  nodeId: string;
}

/**
 * Represents an edge property panel context for a specific selected edge.
 */
export interface EdgePanelContext {
  kind: "edge";
  /** Stable identifier of the selected edge. */
  edgeId: string;
}

/**
 * Discriminated union of all possible property panel contexts.
 *
 * - `"workflow"`: no graph element is selected; shows workflow-level properties.
 * - `"node"`: a graph node is selected; shows node-specific properties.
 * - `"edge"`: a graph edge is selected; shows edge-specific properties.
 */
export type PanelContext =
  | WorkflowPanelContext
  | NodePanelContext
  | EdgePanelContext;

/**
 * Callback invoked whenever the active panel context changes.
 *
 * @param context - The new active {@link PanelContext}.
 */
export type PanelContextChangeCallback = (context: PanelContext) => void;

/**
 * Controls which property panel is displayed based on the current editor
 * selection, implementing FR-006 (selection-driven property panel switching).
 *
 * Listens for `editorSelectionChanged` events dispatched by the event bridge
 * on the given `eventTarget` and transitions the panel context accordingly:
 *
 * - `null` selection → {@link WorkflowPanelContext} (workflow-level properties)
 * - {@link NodeSelection} → {@link NodePanelContext} (node-specific properties)
 * - {@link EdgeSelection} → {@link EdgePanelContext} (edge-specific properties)
 *
 * Transitions update only the internal state and notify subscribers — no full
 * DOM re-render is triggered. When a `liveRegion` element is provided, its
 * `textContent` is updated on each context change so screen readers can
 * announce the new panel context.
 *
 * @example
 * ```ts
 * const controller = new PanelController(editorElement, liveRegionEl);
 * const unsubscribe = controller.subscribe((ctx) => renderPanel(ctx));
 * // Later, when done:
 * unsubscribe();
 * controller.dispose();
 * ```
 */
export class PanelController {
  private context: PanelContext = { kind: "workflow" };
  private readonly listeners = new Set<PanelContextChangeCallback>();
  private readonly abortController = new AbortController();

  /**
   * Creates a new `PanelController` and begins listening for selection events.
   *
   * @param eventTarget - The DOM {@link EventTarget} (typically the web component
   *   element) on which `editorSelectionChanged` events are dispatched.
   * @param liveRegion - Optional ARIA live region element. Its `textContent` is
   *   updated on every panel context change so assistive technologies can
   *   announce the new context to users.
   */
  constructor(
    private readonly eventTarget: EventTarget,
    private readonly liveRegion?: HTMLElement,
  ) {
    this.eventTarget.addEventListener(
      EditorEventName.editorSelectionChanged,
      this.handleSelectionChanged,
      { signal: this.abortController.signal },
    );
  }

  /**
   * Returns the current active panel context.
   *
   * @returns The current {@link PanelContext}.
   */
  getContext(): PanelContext {
    return this.context;
  }

  /**
   * Registers a callback to be invoked whenever the panel context changes.
   *
   * The callback is called synchronously within the event handler; if multiple
   * subscribers are registered, they are notified in registration order.
   *
   * @param callback - The function to call with the new {@link PanelContext}.
   * @returns A dispose function that unregisters the callback when called.
   */
  subscribe(callback: PanelContextChangeCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Stops listening for `editorSelectionChanged` events and clears all
   * subscriber callbacks.
   *
   * After calling `dispose`, the controller will not respond to further
   * selection changes. Any subscriptions obtained via {@link subscribe} should
   * be treated as inactive after this call.
   */
  dispose(): void {
    this.abortController.abort();
    this.listeners.clear();
  }

  /**
   * Computes the panel context corresponding to the given editor selection.
   *
   * @param selection - The current editor selection, or `null` for
   *   workflow-level state.
   * @returns The resolved {@link PanelContext}.
   */
  private resolveContext(selection: EditorSelection | null): PanelContext {
    if (selection === null) {
      return { kind: "workflow" };
    }
    if (selection.kind === "node") {
      return { kind: "node", nodeId: (selection as NodeSelection).nodeId };
    }
    return { kind: "edge", edgeId: (selection as EdgeSelection).edgeId };
  }

  /**
   * Returns `true` if two panel contexts are structurally equivalent, allowing
   * the controller to skip redundant notifications when the same context would
   * be re-applied (e.g. re-selecting the same node).
   *
   * @param a - First context to compare.
   * @param b - Second context to compare.
   * @returns Whether `a` and `b` represent the same panel context.
   */
  private isSameContext(a: PanelContext, b: PanelContext): boolean {
    if (a.kind !== b.kind) return false;
    if (a.kind === "node" && b.kind === "node") return a.nodeId === b.nodeId;
    if (a.kind === "edge" && b.kind === "edge") return a.edgeId === b.edgeId;
    return true; // both are "workflow"
  }

  /**
   * Returns a human-readable announcement string describing the given panel
   * context, suitable for use in an ARIA live region.
   *
   * @param context - The panel context to describe.
   * @returns A short localizable announcement string.
   */
  private describeContext(context: PanelContext): string {
    switch (context.kind) {
      case "workflow":
        return "Workflow properties panel";
      case "node":
        return `Node properties panel for ${context.nodeId}`;
      case "edge":
        return `Edge properties panel for ${context.edgeId}`;
    }
  }

  /**
   * Notifies all registered subscriber callbacks with the updated context.
   *
   * @param context - The new active panel context to broadcast.
   */
  private notifyListeners(context: PanelContext): void {
    for (const cb of this.listeners) {
      cb(context);
    }
  }

  /**
   * Updates the optional ARIA live region so screen readers can announce the
   * panel context change.
   *
   * @param context - The new active panel context.
   */
  private announceContext(context: PanelContext): void {
    if (this.liveRegion) {
      this.liveRegion.textContent = this.describeContext(context);
    }
  }

  /**
   * Handles `editorSelectionChanged` DOM events by resolving the new panel
   * context, skipping no-op transitions, and notifying subscribers.
   */
  private readonly handleSelectionChanged = (event: Event): void => {
    const { selection } = (
      event as CustomEvent<EditorSelectionChangedPayload>
    ).detail;
    const next = this.resolveContext(selection);

    // Avoid unnecessary re-renders when context has not structurally changed.
    if (this.isSameContext(this.context, next)) {
      return;
    }

    this.context = next;
    this.notifyListeners(next);
    this.announceContext(next);
  };
}
