import type {
  DiagnosticSeverity,
  DiagnosticsCollection,
  ValidationDiagnostic,
  WorkflowGraph,
} from "@sw-editor/editor-core";

// ---------------------------------------------------------------------------
// CSS class constants
// ---------------------------------------------------------------------------

/** CSS class applied to every node-level diagnostic indicator element. */
const CLASS_INDICATOR = "sw-diagnostic-indicator";

/** CSS class applied to the global summary panel element. */
const CLASS_SUMMARY_PANEL = "sw-diagnostic-summary";

/** CSS class applied to each summary item inside the panel. */
const CLASS_SUMMARY_ITEM = "sw-diagnostic-summary__item";

/** Severity-specific CSS modifier classes for visual distinction. */
const SEVERITY_CLASS: Record<DiagnosticSeverity, string> = {
  error: "sw-diagnostic--error",
  warning: "sw-diagnostic--warning",
  info: "sw-diagnostic--info",
};

/** Accessible severity labels used in aria attributes and indicator text. */
const SEVERITY_LABEL: Record<DiagnosticSeverity, string> = {
  error: "Error",
  warning: "Warning",
  info: "Info",
};

// ---------------------------------------------------------------------------
// Location parsing
// ---------------------------------------------------------------------------

/**
 * Pattern matching locations of the form `/do/{index}/{taskName}`.
 *
 * The `taskName` capture group (index 2) is the workflow task name as it
 * appears in the `do` array. This is the stable identifier used to look up
 * the corresponding {@link GraphNode}.
 */
const DO_TASK_LOCATION_RE = /^\/do\/\d+\/([^/]+)/;

/**
 * Attempts to extract a task name from a diagnostic location string.
 *
 * Returns the task name when the location matches `/do/{index}/{taskName}`,
 * and `undefined` for any other location format (parse errors, root-level
 * issues, unknown paths, etc.).
 *
 * @param location - The `location` field of a {@link ValidationDiagnostic}.
 * @returns The task name string, or `undefined` if the location cannot be
 *   mapped to a specific task.
 */
function extractTaskName(location: string): string | undefined {
  const match = DO_TASK_LOCATION_RE.exec(location);
  return match ? match[1] : undefined;
}

/**
 * Finds the graph node whose `taskReference` matches the given task name.
 *
 * @param graph - The current workflow graph.
 * @param taskName - Task reference name to search for.
 * @returns The matching {@link import("@sw-editor/editor-core").GraphNode}, or
 *   `undefined` if no node references that task.
 */
function findNodeByTaskReference(
  graph: WorkflowGraph,
  taskName: string,
): { id: string } | undefined {
  return graph.nodes.find((n) => n.taskReference === taskName);
}

// ---------------------------------------------------------------------------
// Callback type
// ---------------------------------------------------------------------------

/**
 * Callback provided by the renderer adapter to look up the DOM element
 * representing a graph node.
 *
 * The renderer is responsible for maintaining the node-element mapping.
 * Return `null` when the node is not currently mounted in the DOM.
 *
 * @param nodeId - The stable ID of the graph node.
 * @returns The DOM element for the node, or `null` if not found.
 */
export type FindNodeElementCallback = (nodeId: string) => HTMLElement | null;

// ---------------------------------------------------------------------------
// DiagnosticsRenderer
// ---------------------------------------------------------------------------

/**
 * Renders visual diagnostic cues on graph nodes and maintains a global
 * summary panel for diagnostics that cannot be mapped to a specific node.
 *
 * **Node indicators**: When a diagnostic's location can be resolved to a
 * graph node, a small indicator element is appended to the node's DOM
 * element. Severity is conveyed via both a CSS class and an `aria-label`
 * so the information is available to screen readers.
 *
 * **Global summary panel**: Diagnostics whose location cannot be resolved
 * to any graph node are collected in an `aria-live="polite"` summary panel.
 * The panel is appended to `container` and announced to screen readers
 * whenever its content changes.
 *
 * **Clearing**: Calling {@link clear} removes all indicator elements from
 * node DOM elements and empties the summary panel.
 *
 * @example
 * ```ts
 * const renderer = new DiagnosticsRenderer({
 *   container: hostEl,
 *   findNodeElement: (id) => shadowRoot.querySelector(`[data-node-id="${id}"]`),
 * });
 *
 * // Apply fresh diagnostics after each validation pass:
 * renderer.apply(diagnostics, graph);
 *
 * // Remove all visual cues when switching documents:
 * renderer.clear();
 *
 * // Release resources when the component is destroyed:
 * renderer.dispose();
 * ```
 */
export class DiagnosticsRenderer {
  private readonly container: HTMLElement;
  private readonly findNodeElement: FindNodeElementCallback;

  /**
   * Tracks all indicator elements keyed by node ID so they can be removed
   * without querying the DOM again.
   */
  private readonly nodeIndicators = new Map<string, HTMLElement[]>();

  /**
   * The `aria-live` summary panel element, created lazily on first use and
   * reused across subsequent {@link apply} calls.
   */
  private summaryPanel: HTMLElement | null = null;

  /**
   * Creates a new `DiagnosticsRenderer`.
   *
   * @param options.container - The DOM element into which the summary panel
   *   is appended. Typically the graph host or the component's shadow root
   *   container.
   * @param options.findNodeElement - Callback that returns the DOM element
   *   for a given node ID, or `null` when the node is not in the DOM.
   */
  constructor(options: {
    container: HTMLElement;
    findNodeElement: FindNodeElementCallback;
  }) {
    this.container = options.container;
    this.findNodeElement = options.findNodeElement;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Applies a diagnostics collection to the UI.
   *
   * Clears any previous visual cues first, then:
   * - Attaches indicator elements to node DOM elements for diagnostics whose
   *   location resolves to a graph node.
   * - Lists remaining (unmapped) diagnostics in the global summary panel.
   *
   * Passing an empty array clears all visual cues and the summary panel.
   *
   * @param diagnostics - The complete diagnostics collection from the latest
   *   validation pass. Pass `[]` to clear all visual cues.
   * @param graph - The current workflow graph used to resolve diagnostic
   *   locations to graph node IDs.
   */
  apply(diagnostics: DiagnosticsCollection, graph: WorkflowGraph): void {
    this.clear();

    if (diagnostics.length === 0) {
      return;
    }

    const unmapped: ValidationDiagnostic[] = [];

    for (const diagnostic of diagnostics) {
      const taskName = extractTaskName(diagnostic.location);
      const node = taskName ? findNodeByTaskReference(graph, taskName) : undefined;
      const el = node ? this.findNodeElement(node.id) : null;

      if (el) {
        // biome-ignore lint/style/noNonNullAssertion: el is non-null only when node is non-null (see ternary guard above)
        this.attachNodeIndicator(el, node!.id, diagnostic);
      } else {
        unmapped.push(diagnostic);
      }
    }

    if (unmapped.length > 0) {
      this.renderSummaryPanel(unmapped);
    }
  }

  /**
   * Removes all diagnostic indicator elements from node DOM elements and
   * clears the global summary panel content.
   *
   * After calling `clear`, the UI is in the same state as before the first
   * {@link apply} call.
   */
  clear(): void {
    for (const [, indicators] of this.nodeIndicators) {
      for (const el of indicators) {
        el.remove();
      }
    }
    this.nodeIndicators.clear();

    if (this.summaryPanel) {
      this.summaryPanel.innerHTML = "";
      // Clear the accessible label so screen readers do not re-announce stale content.
      this.summaryPanel.removeAttribute("aria-label");
    }
  }

  /**
   * Clears all visual cues and removes the summary panel from the DOM.
   *
   * After calling `dispose`, this instance must not be used again.
   */
  dispose(): void {
    this.clear();
    this.summaryPanel?.remove();
    this.summaryPanel = null;
  }

  // ---------------------------------------------------------------------------
  // Private: node indicators
  // ---------------------------------------------------------------------------

  /**
   * Creates a severity indicator element and appends it to the node's DOM
   * element.
   *
   * The indicator carries:
   * - A severity-specific CSS class for styling.
   * - An `aria-label` for screen-reader accessibility.
   * - A `data-severity` attribute for programmatic inspection.
   * - A `data-rule-id` attribute for identification.
   * - A `role="img"` so screen readers treat it as a standalone labelled
   *   image rather than generic presentational content.
   *
   * @param nodeEl - The DOM element representing the graph node.
   * @param nodeId - Stable ID of the graph node (used for bookkeeping).
   * @param diagnostic - The diagnostic to visualise on this node.
   */
  private attachNodeIndicator(
    nodeEl: HTMLElement,
    nodeId: string,
    diagnostic: ValidationDiagnostic,
  ): void {
    const indicator = document.createElement("span");
    indicator.className = `${CLASS_INDICATOR} ${SEVERITY_CLASS[diagnostic.severity]}`;
    indicator.setAttribute("role", "img");
    indicator.setAttribute(
      "aria-label",
      `${SEVERITY_LABEL[diagnostic.severity]}: ${diagnostic.message}`,
    );
    indicator.setAttribute("data-severity", diagnostic.severity);
    indicator.setAttribute("data-rule-id", diagnostic.ruleId);

    nodeEl.appendChild(indicator);

    const existing = this.nodeIndicators.get(nodeId) ?? [];
    existing.push(indicator);
    this.nodeIndicators.set(nodeId, existing);
  }

  // ---------------------------------------------------------------------------
  // Private: summary panel
  // ---------------------------------------------------------------------------

  /**
   * Returns the summary panel element, creating it on first access.
   *
   * The panel uses `aria-live="polite"` so that screen readers announce
   * content changes without interrupting in-progress speech. It is appended
   * to {@link container} once and reused for all subsequent updates.
   *
   * @returns The summary panel {@link HTMLElement}.
   */
  private ensureSummaryPanel(): HTMLElement {
    if (!this.summaryPanel) {
      const panel = document.createElement("div");
      panel.className = CLASS_SUMMARY_PANEL;
      panel.setAttribute("aria-live", "polite");
      panel.setAttribute("aria-atomic", "true");
      this.container.appendChild(panel);
      this.summaryPanel = panel;
    }
    return this.summaryPanel;
  }

  /**
   * Populates the summary panel with a list of unmapped diagnostics.
   *
   * Each diagnostic becomes a `<p>` element carrying a severity label and
   * the diagnostic message. The panel's `aria-label` is updated to reflect
   * the count and worst severity present, giving screen readers a concise
   * summary when the region first receives focus.
   *
   * @param diagnostics - The diagnostics to display in the summary panel.
   *   Must be non-empty.
   */
  private renderSummaryPanel(diagnostics: ValidationDiagnostic[]): void {
    const panel = this.ensureSummaryPanel();
    panel.innerHTML = "";

    for (const diagnostic of diagnostics) {
      const item = document.createElement("p");
      item.className = `${CLASS_SUMMARY_ITEM} ${SEVERITY_CLASS[diagnostic.severity]}`;
      item.setAttribute("data-severity", diagnostic.severity);
      item.setAttribute("data-rule-id", diagnostic.ruleId);

      // Prefix with severity label so screen readers convey priority without
      // relying solely on colour.
      item.textContent = `${SEVERITY_LABEL[diagnostic.severity]}: ${diagnostic.message}`;

      panel.appendChild(item);
    }

    // Provide a concise accessible label for the region.
    const errorCount = diagnostics.filter((d) => d.severity === "error").length;
    const warnCount = diagnostics.filter((d) => d.severity === "warning").length;
    const parts: string[] = [];
    if (errorCount > 0) parts.push(`${errorCount} error${errorCount > 1 ? "s" : ""}`);
    if (warnCount > 0) parts.push(`${warnCount} warning${warnCount > 1 ? "s" : ""}`);
    const infoCount = diagnostics.length - errorCount - warnCount;
    if (infoCount > 0) parts.push(`${infoCount} info${infoCount > 1 ? "s" : ""}`);
    panel.setAttribute("aria-label", `Diagnostics summary: ${parts.join(", ")}`);
  }
}
