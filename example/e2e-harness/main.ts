/**
 * Demo entry point — registers the `sw-editor` custom element.
 *
 * Imports both renderer backends from `@sw-editor/editor-host-client` and
 * defines the `<sw-editor>` custom element. The active renderer is chosen at
 * runtime via the `?renderer=` URL search parameter (values: `"react-flow"` |
 * `"rete-lit"`, default `"rete-lit"`). The element bootstraps an empty
 * workflow graph (start → end), mounts the selected renderer, and attaches
 * insertion affordance buttons for each graph edge so that Scenario 2 of the
 * quickstart can be exercised end-to-end.
 *
 * The "Create new workflow" button in the page header resets the editor to a
 * fresh bootstrapped graph by dispatching the `sw:create` custom event on the
 * `sw-editor` element.
 *
 * @module demo/main
 */

import type { WorkflowGraph } from "@sw-editor/editor-core";
import {
  bootstrapWorkflowGraph,
  insertTask,
  parseWorkflowSource,
  projectWorkflowToGraph,
  RevisionCounter,
  validateWorkflow,
} from "@sw-editor/editor-core";
import { ReactFlowAdapter } from "@sw-editor/editor-host-client/react-flow";
import type { ReteLitAdapter } from "@sw-editor/editor-host-client/rete-lit";

// ---------------------------------------------------------------------------
// Task type catalogue (mirrors InsertionUI.MVP_TASK_TYPES)
// ---------------------------------------------------------------------------

/** Minimal descriptor for a selectable task type in the insertion menu. */
interface TaskTypeDescriptor {
  /** Machine-readable identifier passed as `taskReference` to `insertTask`. */
  readonly id: string;
  /** Human-readable label rendered in the menu. */
  readonly label: string;
}

/**
 * Full set of MVP task types exposed in the insertion menu.
 *
 * Mirrors the list in `packages/editor-web-component/src/graph/insertion-ui.ts`
 * so that the demo exercises the same choices a real host would offer.
 */
const MVP_TASK_TYPES: readonly TaskTypeDescriptor[] = [
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
// SwEditorElement
// ---------------------------------------------------------------------------

/**
 * The `sw-editor` custom element.
 *
 * Mounts a rete-lit renderer displaying a bootstrapped empty workflow graph
 * on connection and disposes it on disconnection. Provides:
 *
 * - Insertion affordance buttons (`button[aria-label="Insert task"]`) for every
 *   graph edge so that the Scenario 2 quickstart step can be automated.
 * - A keyboard-navigable task type selection menu
 *   (`[role="menu"][aria-label="Select task type to insert"]`) that opens when
 *   an affordance is activated.
 * - `[data-testid="graph-node"]` markers for each inserted task node, enabling
 *   Playwright assertions to verify graph state without inspecting rete internals.
 *
 * Listen for the `sw:create` custom event on this element to reset the graph
 * to a fresh bootstrapped state (used by the "Create new workflow" button in
 * the demo header).
 *
 * Exposes {@link loadSource} for programmatic YAML/JSON workflow loading,
 * used by the demo harness load button and e2e tests.
 *
 * **Usage**
 * ```html
 * <sw-editor id="editor" style="width:100%;height:600px;position:relative;"></sw-editor>
 * <script type="module" src="main.js"></script>
 * ```
 */
class SwEditorElement extends HTMLElement {
  /** Active renderer adapter, present only while the element is connected. */
  #adapter: ReteLitAdapter | ReactFlowAdapter | null = null;

  /** Current in-memory workflow graph. */
  #graph: WorkflowGraph | null = null;

  /** Monotonic revision counter for this editor instance. */
  #counter: RevisionCounter | null = null;

  /** Unsubscribe function for the viewport-change listener. */
  #unsubViewport: (() => void) | null = null;

  /** Monotonic token to ignore obsolete deferred affordance rebuilds. */
  #affordanceSyncToken = 0;

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Called by the browser when the element is inserted into the document.
   *
   * Reads the `?renderer=` URL search parameter to select the active renderer
   * backend (`"react-flow"` or `"rete-lit"`, defaulting to `"rete-lit"`),
   * creates the renderer canvas, bootstraps the initial workflow graph, mounts
   * the renderer, and renders the first set of affordances.
   */
  async connectedCallback(): Promise<void> {
    // Create an inner div for the renderer canvas so the renderer's
    // overflow:hidden does not clip sibling elements (affordance buttons, task
    // menus) we append to `this`.
    const canvas = document.createElement("div");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    this.appendChild(canvas);

    this.#counter = new RevisionCounter();
    this.#graph = bootstrapWorkflowGraph();

    const renderer = new URLSearchParams(location.search).get("renderer");
    if (renderer === "react-flow") {
      this.#adapter = new ReactFlowAdapter();
    } else {
      const { ReteLitAdapter } = await import("@sw-editor/editor-host-client/rete-lit");
      this.#adapter = new ReteLitAdapter();
    }
    this.#adapter.mount(canvas, this.#graph);

    this.#refreshAffordancesAfterGraphUpdate();

    // Re-position affordances whenever the viewport is panned or zoomed so
    // that buttons stay aligned with the underlying edge midpoints.
    this.#unsubViewport = this.#adapter.onViewportChange(() => {
      this.#syncAffordances();
    });

    // Allow the "Create new workflow" button to reset this element's state via
    // a custom event rather than a direct method reference.
    this.addEventListener("sw:create", this.#handleCreate);
  }

  /**
   * Called by the browser when the element is removed from the document.
   *
   * Disposes the renderer adapter and releases all associated resources.
   */
  disconnectedCallback(): void {
    this.removeEventListener("sw:create", this.#handleCreate);
    this.#unsubViewport?.();
    this.#unsubViewport = null;
    this.#adapter?.dispose();
    this.#adapter = null;
    this.#graph = null;
    this.#counter = null;
  }

  // --------------------------------------------------------------------------
  // sw:create handler
  // --------------------------------------------------------------------------

  /**
   * Resets the graph to a freshly bootstrapped state.
   *
   * Triggered by the `sw:create` custom event dispatched by the "Create new
   * workflow" button in the demo header.
   */
  readonly #handleCreate = (): void => {
    if (!this.#adapter) return;
    this.#counter = new RevisionCounter();
    this.#graph = bootstrapWorkflowGraph();
    this.#adapter.update(this.#graph);
    this.#refreshAffordancesAfterGraphUpdate();
    this.#syncTaskNodes();
  };

  // --------------------------------------------------------------------------
  // Affordance management
  // --------------------------------------------------------------------------

  /**
   * Synchronises insertion affordance buttons with the current graph edges.
   *
   * Removes all existing affordance buttons and creates one new button per
   * edge using renderer-provided anchor coordinates. Buttons are appended
   * directly to `this` (the sw-editor element) with absolute positioning so
   * they appear above the rete canvas without being clipped by its
   * `overflow: hidden` style.
   */
  #syncAffordances(options?: { rebuild?: boolean }): void {
    const existingButtons = new Map<string, HTMLButtonElement>();
    for (const button of Array.from(
      this.querySelectorAll<HTMLButtonElement>(".sw-insertion-affordance"),
    )) {
      const edgeId = button.dataset.edgeId;
      if (edgeId) {
        existingButtons.set(edgeId, button);
      } else {
        button.remove();
      }
    }

    if (options?.rebuild) {
      for (const button of existingButtons.values()) {
        button.remove();
      }
      existingButtons.clear();
    }

    if (!this.#adapter) return;

    const currentEdgeIds = new Set((this.#graph?.edges ?? []).map((edge) => edge.id));
    const anchors = this.#adapter
      .getInsertionAnchors()
      .filter((anchor) => currentEdgeIds.has(anchor.edgeId));
    const anchorMap = new Map(anchors.map((anchor) => [anchor.edgeId, anchor]));

    for (const [edgeId, button] of existingButtons) {
      if (!anchorMap.has(edgeId)) {
        button.remove();
        existingButtons.delete(edgeId);
      }
    }

    for (const anchor of anchors) {
      const existing = existingButtons.get(anchor.edgeId);
      if (existing) {
        existing.style.left = `${anchor.x}px`;
        existing.style.top = `${anchor.y}px`;
      } else {
        this.#addAffordanceForEdge(anchor.edgeId, anchor.x, anchor.y);
      }
    }
  }

  /**
   * Rebuilds insertion affordances after graph-changing updates.
   *
   * Renderer adapters may apply graph/layout updates asynchronously, so this
   * method performs an immediate rebuild plus deferred rebuilds to ensure stale
   * controls are pruned and current anchors are reflected consistently.
   */
  #refreshAffordancesAfterGraphUpdate(): void {
    const token = ++this.#affordanceSyncToken;
    const syncIfCurrent = (): void => {
      if (token !== this.#affordanceSyncToken) return;
      this.#syncAffordances({ rebuild: true });
    };

    syncIfCurrent();
    queueMicrotask(syncIfCurrent);
    requestAnimationFrame(syncIfCurrent);
  }

  /**
   * Creates and appends a single insertion affordance button for the given edge.
   *
   * @param edgeId - Stable ID of the graph edge this affordance targets.
   * @param x - Horizontal pixel coordinate from the renderer anchor.
   * @param y - Vertical pixel coordinate from the renderer anchor.
   */
  #addAffordanceForEdge(edgeId: string, x: number, y: number): void {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", "Insert task");
    button.className = "sw-insertion-affordance";
    button.setAttribute("data-edge-id", edgeId);
    button.textContent = "+";

    // Position at the renderer-provided anchor point, centered on the
    // midpoint so the button sits directly on the edge.
    button.style.position = "absolute";
    button.style.left = `${x}px`;
    button.style.top = `${y}px`;
    button.style.transform = "translate(-50%, -50%)";
    button.style.zIndex = "10";
    button.style.cursor = "pointer";

    const open = (): void => this.#openMenu(edgeId);
    button.addEventListener("click", open);
    button.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open();
      }
    });

    this.appendChild(button);
  }

  // --------------------------------------------------------------------------
  // Task type menu
  // --------------------------------------------------------------------------

  /**
   * Opens the task type selection menu for the given edge, closing any
   * previously open menu first.
   *
   * The menu is appended to `this` with absolute positioning above the rete
   * canvas, and initial keyboard focus is moved to the first menu item.
   *
   * @param edgeId - The edge at which the new task will be inserted.
   */
  #openMenu(edgeId: string): void {
    // Remember the invoking affordance so focus can be restored on Escape.
    const invoker = this.querySelector<HTMLButtonElement>(
      `.sw-insertion-affordance[data-edge-id="${edgeId}"]`,
    );

    // Close any existing menu before opening a new one.
    for (const el of Array.from(this.querySelectorAll(".sw-task-menu"))) {
      el.remove();
    }

    const menu = document.createElement("div");
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", "Select task type to insert");
    menu.className = "sw-task-menu";
    menu.style.position = "absolute";
    menu.style.top = "50%";
    menu.style.left = "50%";
    menu.style.transform = "translate(-50%, -50%)";
    menu.style.zIndex = "20";
    menu.style.background = "white";
    menu.style.border = "1px solid #ccc";
    menu.style.borderRadius = "4px";
    menu.style.padding = "4px";
    menu.style.minWidth = "160px";

    for (const taskType of MVP_TASK_TYPES) {
      const item = document.createElement("button");
      item.type = "button";
      item.setAttribute("role", "menuitem");
      item.className = "sw-task-menu__item";
      item.textContent = taskType.label;
      item.style.display = "block";
      item.style.width = "100%";
      item.style.textAlign = "left";
      item.style.padding = "4px 8px";
      item.style.cursor = "pointer";

      const commit = (): void => {
        menu.remove();
        this.#commitInsertion(edgeId, taskType.id);
      };

      item.addEventListener("click", commit);
      item.addEventListener("keydown", (e: KeyboardEvent) => {
        switch (e.key) {
          case "Enter":
          case " ":
            e.preventDefault();
            commit();
            break;
          case "ArrowDown":
            e.preventDefault();
            (item.nextElementSibling as HTMLElement | null)?.focus();
            break;
          case "ArrowUp":
            e.preventDefault();
            (item.previousElementSibling as HTMLElement | null)?.focus();
            break;
          case "Escape":
            e.preventDefault();
            menu.remove();
            invoker?.focus();
            break;
        }
      });

      menu.appendChild(item);
    }

    this.appendChild(menu);
    (menu.firstElementChild as HTMLElement | null)?.focus();
  }

  // --------------------------------------------------------------------------
  // Insertion execution
  // --------------------------------------------------------------------------

  /**
   * Executes `insertTask`, updates the renderer, and refreshes affordances and
   * task node markers.  After insertion the task is considered "selected" and
   * the properties panel is populated with the inserted node's details so that
   * the panel is non-empty and therefore visible to Playwright.
   *
   * @param edgeId - The edge to split with the new task node.
   * @param taskReference - The task type identifier (e.g. `"call"`).
   */
  #commitInsertion(edgeId: string, taskReference: string): void {
    if (!this.#graph || !this.#counter || !this.#adapter) return;

    let insertedNodeId: string | undefined;
    try {
      const result = insertTask(this.#graph, this.#counter, { edgeId, taskReference });
      this.#graph = result.graph;
      insertedNodeId = result.nodeId;
    } catch {
      // Edge may have been removed; nothing to do.
      return;
    }

    this.#adapter.update(this.#graph);
    this.#refreshAffordancesAfterGraphUpdate();
    this.#syncTaskNodes();

    if (insertedNodeId !== undefined) {
      this.#showNodeInPanel(insertedNodeId, taskReference);
    }
  }

  /**
   * Populates the properties panel with basic information about the selected
   * node.  The panel becomes visible (non-zero content) so that e2e assertions
   * that call `toBeVisible()` on `[aria-label="Properties panel"]` succeed.
   *
   * @param nodeId - The stable identifier of the selected graph node.
   * @param taskReference - The task type identifier used to label the panel.
   */
  #showNodeInPanel(nodeId: string, taskReference: string): void {
    const panel = document.querySelector<HTMLElement>('[aria-label="Properties panel"]');
    if (!panel) return;

    panel.innerHTML = "";

    const heading = document.createElement("p");
    heading.style.fontWeight = "bold";
    heading.style.padding = "4px 8px";
    heading.textContent = `Task: ${taskReference}`;

    const idLine = document.createElement("p");
    idLine.style.padding = "0 8px 4px";
    idLine.style.fontSize = "0.75rem";
    idLine.style.color = "#555";
    idLine.textContent = `ID: ${nodeId}`;

    panel.appendChild(heading);
    panel.appendChild(idLine);
  }

  // --------------------------------------------------------------------------
  // Task node markers
  // --------------------------------------------------------------------------

  /**
   * Synchronises `[data-testid="graph-node"]` marker elements with the current
   * set of task nodes in {@link #graph}.
   *
   * These markers are lightweight `<span>` elements appended to `this` that
   * allow Playwright assertions (`page.locator('[data-testid="graph-node"]')`)
   * to verify that task nodes have been inserted without needing to query
   * rete-lit's internal DOM representation.
   */
  #syncTaskNodes(): void {
    for (const el of Array.from(this.querySelectorAll('[data-testid="graph-node"]'))) {
      el.remove();
    }

    if (!this.#graph) return;

    for (const node of this.#graph.nodes) {
      if (node.kind === "task") {
        const marker = document.createElement("span");
        marker.setAttribute("data-testid", "graph-node");
        marker.setAttribute("data-node-id", node.id);
        // Surface the taskReference as text content so assertions like
        // `toContainText("my-call-task")` can be exercised once the property
        // panel editing flow is implemented.
        marker.textContent = node.taskReference ?? "";
        // Position the marker visually so it is not clipped or hidden; absolute
        // positioning keeps it within the sw-editor's bounds.
        marker.style.position = "absolute";
        marker.style.bottom = "4px";
        marker.style.left = "4px";
        marker.style.fontSize = "11px";
        marker.style.color = "#555";
        marker.style.zIndex = "5";
        this.appendChild(marker);
      }
    }
  }

  /**
   * Switches the layout orientation and re-renders the graph.
   *
   * Called by the orientation select control in the toolbar. Delegates to
   * the adapter's `setOrientation`, then refreshes affordances and task
   * node markers so insert buttons re-anchor to the new layout positions.
   *
   * @param mode - `"top-to-bottom"` or `"left-to-right"`.
   */
  setOrientation(mode: "top-to-bottom" | "left-to-right"): void {
    if (!this.#adapter) return;
    this.#adapter.setOrientation(mode);
    this.#refreshAffordancesAfterGraphUpdate();
    this.#syncTaskNodes();
  }

  /**
   * Loads a YAML workflow source string into the editor.
   *
   * Parses the content, projects the parsed model to a visual graph, and
   * updates the renderer. Sets `data-node-count` on the element to the total
   * number of graph nodes (start + tasks + end) so that e2e tests can assert
   * on the rendered graph state without depending on renderer-internal DOM
   * structure.
   *
   * No-op when the adapter is not mounted or the source fails to parse.
   *
   * @param content - A YAML-formatted workflow document string.
   */
  loadSource(content: string): void {
    if (!this.#adapter) return;
    const result = parseWorkflowSource({ format: "yaml", content });
    if (!result.ok) return;
    const graph = projectWorkflowToGraph(result.workflow);
    this.#graph = graph;
    this.#adapter.update(graph);
    this.#refreshAffordancesAfterGraphUpdate();
    this.#syncTaskNodes();
    this.dataset.nodeCount = String(graph.nodes.length);
  }
}

customElements.define("sw-editor", SwEditorElement);

// ---------------------------------------------------------------------------
// Wire "Create new workflow" button
// ---------------------------------------------------------------------------

/**
 * Dispatches the `sw:create` custom event to the `sw-editor` element when the
 * "Create new workflow" button is activated via click or keyboard.
 *
 * This wiring is done at the module level (after `customElements.define`) so
 * the button can be added to the page HTML without requiring knowledge of the
 * element's internal API.
 */
function wireCreateButton(): void {
  const createBtn = document.querySelector<HTMLElement>('button[aria-label="Create new workflow"]');
  const editorEl = document.getElementById("editor");

  if (!createBtn || !editorEl) return;

  const dispatchCreate = (): void => {
    editorEl.dispatchEvent(new Event("sw:create"));
  };

  createBtn.addEventListener("click", dispatchCreate);
  createBtn.addEventListener("keydown", (e: Event) => {
    const ke = e as KeyboardEvent;
    if (ke.key === "Enter" || ke.key === " ") {
      ke.preventDefault();
      dispatchCreate();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", wireCreateButton);
} else {
  wireCreateButton();
}

// ---------------------------------------------------------------------------
// Source input + diagnostics wiring
// ---------------------------------------------------------------------------

/**
 * Debounce delay (ms) between the last keystroke in the source textarea and
 * the validation run.  Mirrors the default used by {@link LiveValidator}.
 */
const SOURCE_DEBOUNCE_MS = 500;

/**
 * Wires the source textarea to the diagnostics region.
 *
 * Reads the textarea value on each `input` event, debounces by
 * {@link SOURCE_DEBOUNCE_MS}, infers the source format (JSON when the
 * content begins with `{` or `[`, YAML otherwise), calls
 * {@link validateWorkflow}, and renders any diagnostics to the region.
 */
function wireDiagnostics(): void {
  const sourceInput = document.querySelector<HTMLTextAreaElement>(
    'textarea[aria-label="Workflow source"]',
  );
  const diagnosticsRegion = document.querySelector<HTMLElement>(
    '[data-testid="diagnostics-live-region"]',
  );

  if (!sourceInput || !diagnosticsRegion) return;

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  sourceInput.addEventListener("input", () => {
    if (debounceTimer !== null) clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      const content = sourceInput.value.trim();
      if (!content) {
        diagnosticsRegion.textContent = "";
        return;
      }

      const format = content.startsWith("{") || content.startsWith("[") ? "json" : "yaml";

      const diagnostics = validateWorkflow({ format, content });

      if (diagnostics.length === 0) {
        diagnosticsRegion.textContent = "";
      } else {
        diagnosticsRegion.textContent = diagnostics
          .map((d) => `${d.severity.toUpperCase()}: ${d.message}`)
          .join("\n");
      }
    }, SOURCE_DEBOUNCE_MS);
  });
}

wireDiagnostics();

// ---------------------------------------------------------------------------
// Renderer switcher wiring
// ---------------------------------------------------------------------------

/**
 * Wires the `#renderer-select` element so that choosing a renderer updates
 * the `?renderer=` URL search parameter and reloads the page.
 *
 * Also sets the select's initial value from the current URL parameter so the
 * control reflects the active renderer on page load.
 */
function wireRendererSelect(): void {
  const select = document.querySelector<HTMLSelectElement>("#renderer-select");
  if (!select) return;

  // Reflect the active renderer in the select on page load.
  const current = new URLSearchParams(location.search).get("renderer");
  if (current === "react-flow" || current === "rete-lit") {
    select.value = current;
  }

  select.addEventListener("change", () => {
    const params = new URLSearchParams(location.search);
    params.set("renderer", select.value);
    location.search = params.toString();
  });
}

wireRendererSelect();

// ---------------------------------------------------------------------------
// Orientation switcher wiring
// ---------------------------------------------------------------------------

/**
 * Wires the `#orientation-select` element so that choosing an orientation
 * calls `setOrientation()` on the `sw-editor` element, triggering a live
 * re-layout without a page reload.
 */
function wireOrientationSelect(): void {
  const select = document.querySelector<HTMLSelectElement>("#orientation-select");
  const editorEl = document.getElementById("editor") as SwEditorElement | null;
  if (!select || !editorEl) return;

  select.addEventListener("change", () => {
    const mode = select.value as "top-to-bottom" | "left-to-right";
    editorEl.setOrientation(mode);
  });
}

wireOrientationSelect();
