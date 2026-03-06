import {
  type InsertTaskOptions,
  type InsertTaskResult,
  insertTask,
} from "@sw-editor/editor-core";
import type { WorkflowGraph } from "@sw-editor/editor-core";
import type { WorkflowSource } from "@sw-editor/editor-host-client";
import type { RevisionCounter } from "@sw-editor/editor-core";
import type { EventBridge } from "../events/bridge.js";

// ---------------------------------------------------------------------------
// Task type descriptors
// ---------------------------------------------------------------------------

/**
 * Describes a single selectable task type in the insertion menu.
 */
export interface TaskTypeDescriptor {
  /** Machine-readable task type identifier, used as {@link InsertTaskOptions.taskReference}. */
  id: string;
  /** Human-readable label displayed in the insertion menu. */
  label: string;
}

/**
 * The full set of task types exposed in the MVP insertion menu, covering all
 * Serverless Workflow DSL task kinds.
 *
 * This list satisfies FR-004 (full supported task insertion menu for MVP).
 */
export const MVP_TASK_TYPES: readonly TaskTypeDescriptor[] = [
  { id: "call", label: "Call Task" },
  { id: "do", label: "Do Task" },
  { id: "fork", label: "Fork Task" },
  { id: "emit", label: "Emit Task" },
  { id: "listen", label: "Listen Task" },
  { id: "run", label: "Run Task" },
  { id: "set", label: "Set Task" },
  { id: "switch", label: "Switch Task" },
  { id: "try", label: "Try Task" },
  { id: "wait", label: "Wait Task" },
] as const;

// ---------------------------------------------------------------------------
// Callbacks
// ---------------------------------------------------------------------------

/**
 * Called after a successful insertion to convert the updated {@link WorkflowGraph}
 * into a serialized {@link WorkflowSource} for event emission.
 *
 * @param graph - The updated workflow graph returned by {@link insertTask}.
 * @returns The serialized workflow source at the current format.
 */
export type SerializeGraphCallback = (graph: WorkflowGraph) => WorkflowSource;

/**
 * Called by {@link InsertionUI} to move keyboard focus to the newly inserted
 * node. The renderer adapter implementing this callback is responsible for
 * bringing the node into view and setting DOM focus.
 *
 * @param nodeId - Stable ID of the newly inserted node.
 */
export type FocusNodeCallback = (nodeId: string) => void;

// ---------------------------------------------------------------------------
// InsertionUI
// ---------------------------------------------------------------------------

/**
 * Manages the visual insertion affordance and keyboard-accessible task type
 * selection flow in the web component graph layer.
 *
 * Responsibilities:
 * - Renders a "+" affordance {@link HTMLButtonElement} for each registered edge.
 * - Shows a keyboard-navigable task type menu when an affordance is activated.
 * - Calls {@link insertTask} with the selected task type after confirmation.
 * - Emits `workflowChanged` and `editorSelectionChanged` events through the
 *   {@link EventBridge} after a successful insertion.
 * - Invokes an optional {@link FocusNodeCallback} so the renderer can move DOM
 *   focus to the newly inserted node (FR-005).
 *
 * **Accessibility**: All interactive elements use `role="menu"` / `role="menuitem"`,
 * support `Enter`, `Space`, `Escape`, `ArrowUp`, and `ArrowDown` keyboard
 * interactions, and carry descriptive `aria-label` attributes.
 *
 * @example
 * ```ts
 * const ui = new InsertionUI({
 *   container: graphContainerEl,
 *   bridge,
 *   graphState,
 *   counter,
 *   serializeGraph: (g) => serialize(g),
 *   focusNode: (id) => renderer.focusNode(id),
 * });
 *
 * // Called by the renderer whenever an edge element is mounted:
 * const detach = ui.attachToEdge("edge-1", edgeEl);
 *
 * // Later, when the edge is removed:
 * detach();
 *
 * // Cleanup on unmount:
 * ui.dispose();
 * ```
 */
export class InsertionUI {
  private readonly container: HTMLElement;
  private readonly bridge: EventBridge;
  private readonly counter: RevisionCounter;
  private readonly serializeGraph: SerializeGraphCallback;
  private readonly focusNode: FocusNodeCallback | undefined;

  /** Live graph reference; must be kept current by the host. */
  private graph: WorkflowGraph;

  /** Tracks affordance buttons keyed by edgeId for cleanup. */
  private readonly affordances = new Map<string, HTMLButtonElement>();

  /** Currently open task-type menu element, if any. */
  private activeMenu: HTMLElement | null = null;

  /** AbortController used to remove all event listeners at once on dispose. */
  private readonly abortController = new AbortController();

  /**
   * Creates a new `InsertionUI` instance.
   *
   * @param options.container - The DOM element inside which affordance menus
   *   are appended (typically the graph host element or its shadow root container).
   * @param options.bridge - The {@link EventBridge} used to emit
   *   `workflowChanged` and `editorSelectionChanged` events.
   * @param options.graph - Initial {@link WorkflowGraph} state. Update via
   *   {@link updateGraph} whenever the graph changes.
   * @param options.counter - The shared {@link RevisionCounter} for this
   *   editor instance.
   * @param options.serializeGraph - Callback that converts an updated graph
   *   to a {@link WorkflowSource} for the `workflowChanged` event payload.
   * @param options.focusNode - Optional renderer callback that moves DOM focus
   *   to the node with the given ID.
   */
  constructor(options: {
    container: HTMLElement;
    bridge: EventBridge;
    graph: WorkflowGraph;
    counter: RevisionCounter;
    serializeGraph: SerializeGraphCallback;
    focusNode?: FocusNodeCallback;
  }) {
    this.container = options.container;
    this.bridge = options.bridge;
    this.graph = options.graph;
    this.counter = options.counter;
    this.serializeGraph = options.serializeGraph;
    this.focusNode = options.focusNode;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Attaches an insertion affordance ("+" button) to the given anchor element
   * for the specified edge.
   *
   * The affordance is appended as a child of `anchor`. When the user activates
   * it (click, `Enter`, or `Space`), the task type selection menu opens.
   *
   * @param edgeId - Stable ID of the graph edge this affordance represents.
   * @param anchor - The DOM element associated with the edge (provided by the
   *   renderer adapter).
   * @returns A dispose function that removes the affordance button and cleans
   *   up its event listeners. Call this when the corresponding edge is removed.
   */
  attachToEdge(edgeId: string, anchor: HTMLElement): () => void {
    // Remove any stale affordance for this edge before creating a new one.
    this.detachFromEdge(edgeId);

    const button = this.createAffordanceButton(edgeId);
    anchor.appendChild(button);
    this.affordances.set(edgeId, button);

    return () => this.detachFromEdge(edgeId);
  }

  /**
   * Programmatically opens the task type selection menu for the given edge.
   *
   * Useful for keyboard shortcuts that bypass the affordance button click.
   *
   * @param edgeId - Stable ID of the graph edge at which to insert.
   */
  activateInsertion(edgeId: string): void {
    this.openTaskMenu(edgeId);
  }

  /**
   * Replaces the current graph reference with an updated one.
   *
   * Call this whenever the graph changes (e.g., after a prior insertion) so
   * that subsequent insertions operate on the latest state.
   *
   * @param graph - The updated {@link WorkflowGraph}.
   */
  updateGraph(graph: WorkflowGraph): void {
    this.graph = graph;
  }

  /**
   * Removes all affordance buttons, closes any open menu, and stops all
   * internal event listeners.
   *
   * After calling `dispose`, this instance must not be used again.
   */
  dispose(): void {
    this.abortController.abort();
    this.closeTaskMenu();
    for (const [edgeId] of this.affordances) {
      this.detachFromEdge(edgeId);
    }
  }

  // ---------------------------------------------------------------------------
  // Private: affordance button
  // ---------------------------------------------------------------------------

  /**
   * Creates the "+" affordance {@link HTMLButtonElement} for the given edge.
   *
   * @param edgeId - The edge ID whose insertion this button triggers.
   * @returns A fully configured affordance button.
   */
  private createAffordanceButton(edgeId: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sw-insertion-affordance";
    button.setAttribute("aria-label", "Insert task");
    button.setAttribute("data-edge-id", edgeId);
    button.textContent = "+";

    const { signal } = this.abortController;

    button.addEventListener(
      "click",
      (e) => {
        e.stopPropagation();
        this.openTaskMenu(edgeId);
      },
      { signal },
    );

    button.addEventListener(
      "keydown",
      (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.openTaskMenu(edgeId);
        }
      },
      { signal },
    );

    return button;
  }

  /**
   * Removes the affordance button for the given edge and clears its map entry.
   *
   * @param edgeId - The edge ID whose affordance should be removed.
   */
  private detachFromEdge(edgeId: string): void {
    const button = this.affordances.get(edgeId);
    if (button) {
      button.remove();
      this.affordances.delete(edgeId);
    }
  }

  // ---------------------------------------------------------------------------
  // Private: task type menu
  // ---------------------------------------------------------------------------

  /**
   * Opens the task type selection menu for the specified edge, closing any
   * previously open menu first.
   *
   * @param edgeId - The edge ID at which the task will be inserted.
   */
  private openTaskMenu(edgeId: string): void {
    this.closeTaskMenu();

    const menu = this.createTaskMenu(edgeId);
    this.container.appendChild(menu);
    this.activeMenu = menu;

    // Move focus to the first menu item so keyboard navigation starts immediately.
    const firstItem = menu.querySelector<HTMLElement>('[role="menuitem"]');
    firstItem?.focus();

    // Close the menu when the user clicks outside it. Deferred by one
    // microtask to prevent the current click from immediately closing it.
    const onOutsideClick = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        this.closeTaskMenu();
        document.removeEventListener("click", onOutsideClick);
      }
    };
    queueMicrotask(() => {
      document.addEventListener("click", onOutsideClick);
    });
  }

  /**
   * Builds and returns the task type selection menu element.
   *
   * The menu contains one `role="menuitem"` button per {@link MVP_TASK_TYPES}
   * entry and supports `ArrowUp`, `ArrowDown`, `Enter`, `Space`, and `Escape`
   * keyboard interactions.
   *
   * @param edgeId - The edge ID passed through to {@link commitInsertion}.
   * @returns The constructed menu container element.
   */
  private createTaskMenu(edgeId: string): HTMLElement {
    const menu = document.createElement("div");
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Select task type to insert");
    menu.className = "sw-task-menu";

    for (const taskType of MVP_TASK_TYPES) {
      const item = document.createElement("button");
      item.type = "button";
      item.setAttribute("role", "menuitem");
      item.className = "sw-task-menu__item";
      item.textContent = taskType.label;
      item.dataset["taskTypeId"] = taskType.id;

      item.addEventListener("click", () => {
        this.closeTaskMenu();
        this.commitInsertion(edgeId, taskType);
      });

      item.addEventListener("keydown", (e) => {
        switch (e.key) {
          case "Enter":
          case " ":
            e.preventDefault();
            this.closeTaskMenu();
            this.commitInsertion(edgeId, taskType);
            break;
          case "Escape":
            e.preventDefault();
            this.closeTaskMenu();
            // Return focus to the affordance button for the edge.
            this.affordances.get(edgeId)?.focus();
            break;
          case "ArrowDown": {
            e.preventDefault();
            const next = item.nextElementSibling as HTMLElement | null;
            next?.focus();
            break;
          }
          case "ArrowUp": {
            e.preventDefault();
            const prev = item.previousElementSibling as HTMLElement | null;
            prev?.focus();
            break;
          }
          case "Home": {
            e.preventDefault();
            (menu.firstElementChild as HTMLElement | null)?.focus();
            break;
          }
          case "End": {
            e.preventDefault();
            (menu.lastElementChild as HTMLElement | null)?.focus();
            break;
          }
        }
      });

      menu.appendChild(item);
    }

    return menu;
  }

  /**
   * Removes the active task type menu from the DOM.
   */
  private closeTaskMenu(): void {
    this.activeMenu?.remove();
    this.activeMenu = null;
  }

  // ---------------------------------------------------------------------------
  // Private: insertion execution
  // ---------------------------------------------------------------------------

  /**
   * Executes the insertion command, then emits `workflowChanged` and
   * `editorSelectionChanged` events and triggers node focus.
   *
   * Implements the post-insertion auto-focus behavior required by FR-005.
   *
   * @param edgeId - The edge to split.
   * @param taskType - The selected task type descriptor.
   */
  private commitInsertion(edgeId: string, taskType: TaskTypeDescriptor): void {
    let result: InsertTaskResult;
    try {
      result = insertTask(this.graph, this.counter, {
        edgeId,
        taskReference: taskType.id,
      });
    } catch {
      // Edge may have been removed from the graph since the menu was opened.
      // Nothing to do; the affordance will be removed by the renderer on its
      // next update cycle.
      return;
    }

    // Keep our local graph reference current so subsequent insertions are
    // consistent without requiring an external updateGraph() call.
    this.graph = result.graph;

    // Serialize the updated graph and emit workflowChanged (FR-003, FR-005).
    const source = this.serializeGraph(result.graph);
    this.bridge.emitWorkflowChanged(source);

    // Select the newly inserted node so the property panel switches (FR-006).
    this.bridge.emitSelectionChanged({ kind: "node", nodeId: result.nodeId });

    // Move DOM focus to the new node so the user can immediately edit it
    // without lifting their hands from the keyboard (FR-005).
    this.focusNode?.(result.nodeId);
  }
}
