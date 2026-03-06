/**
 * Load API module for `@sw-editor/editor-web-component`.
 *
 * Provides {@link LoadAPI} for wiring the `loadWorkflowSource` host surface
 * method and optional `workflow-source` attribute on the web component custom
 * element.
 *
 * @module api/load
 */

import type { WorkflowGraph } from "@sw-editor/editor-core";
import { loadWorkflow, projectWorkflowToGraph, type RevisionCounter } from "@sw-editor/editor-core";
import type { LoadWorkflowSourceInput } from "@sw-editor/editor-host-client";
import { setCurrentSource } from "@sw-editor/editor-host-client";

import type { EventBridge } from "../events/bridge.js";

/**
 * Called after a successful load to notify the renderer of the new graph.
 *
 * The renderer adapter implementing this callback is responsible for applying
 * the updated graph to the visual layer (nodes and edges).
 *
 * @param graph - The projected {@link WorkflowGraph} for the loaded workflow.
 */
export type UpdateGraphCallback = (graph: WorkflowGraph) => void;

/**
 * Wires the `loadWorkflowSource` host-surface method onto the web component
 * custom element, delegating to the editor-core load command and updating the
 * visual graph on success.
 *
 * Responsibilities:
 * - Calls {@link loadWorkflow} from `editor-core` to parse and validate the
 *   incoming source.
 * - On failure, emits an `editorError` event via the {@link EventBridge} so
 *   the host can surface the problem without throwing.
 * - On success:
 *   1. Projects the parsed model to a full visual graph via
 *      {@link projectWorkflowToGraph}.
 *   2. Updates the export module's current source via {@link setCurrentSource}
 *      so subsequent `exportWorkflowSource` calls return consistent content.
 *   3. Invokes the {@link UpdateGraphCallback} so the renderer reflects the
 *      loaded workflow.
 *   4. Emits a `workflowChanged` event via the {@link EventBridge}.
 *
 * Optional declarative loading via the `workflow-source` attribute is
 * supported through {@link handleAttributeChange}. The attribute value must be
 * a JSON-encoded {@link LoadWorkflowSourceInput} object. Attribute-driven loads
 * run asynchronously and their errors are surfaced through the same
 * `editorError` event channel.
 *
 * @example
 * ```ts
 * const api = new LoadAPI({ bridge, counter, updateGraph });
 *
 * // Programmatic load from host JavaScript:
 * await api.loadWorkflowSource({ source: { format: "json", content: src } });
 *
 * // Attribute observation (call from attributeChangedCallback):
 * api.handleAttributeChange("workflow-source", attrValue);
 * ```
 */
export class LoadAPI {
  private readonly bridge: EventBridge;
  private readonly counter: RevisionCounter;
  private readonly updateGraph: UpdateGraphCallback;

  /**
   * Creates a new `LoadAPI` instance.
   *
   * @param options.bridge - The {@link EventBridge} used to emit
   *   `workflowChanged` and `editorError` events.
   * @param options.counter - The shared {@link RevisionCounter} for this
   *   editor instance. Reset and incremented on each successful load.
   * @param options.updateGraph - Callback invoked with the projected
   *   {@link WorkflowGraph} after a successful load.
   */
  constructor(options: {
    bridge: EventBridge;
    counter: RevisionCounter;
    updateGraph: UpdateGraphCallback;
  }) {
    this.bridge = options.bridge;
    this.counter = options.counter;
    this.updateGraph = options.updateGraph;
  }

  /**
   * Loads a workflow source document into the editor.
   *
   * Implements {@link HostEditorContract.loadWorkflowSource}.
   *
   * On parse or validation failure the promise resolves (not rejects) and an
   * `editorError` event is emitted via the {@link EventBridge} so the host
   * receives structured feedback without needing a try/catch.
   *
   * @param input - The source document to load.
   * @returns A promise that resolves when the editor has parsed and projected
   *   the source into the graph, or when an error has been emitted.
   */
  async loadWorkflowSource(input: LoadWorkflowSourceInput): Promise<void> {
    const result = loadWorkflow(input.source, this.counter);

    if (!result.ok) {
      const message = result.diagnostics.map((d) => d.message).join("; ");
      this.bridge.emitError("LOAD_FAILED", `Failed to load workflow: ${message}`);
      return;
    }

    // Project the parsed model to the full visual graph (T019).
    const graph = projectWorkflowToGraph(result.model);

    // Keep the export module in sync so exportWorkflowSource returns the
    // correct source and format after a load.
    setCurrentSource(input.source);

    // Notify the renderer adapter so the visual layer reflects the new graph.
    this.updateGraph(graph);

    // Emit workflowChanged so the host application can react to the load.
    this.bridge.emitWorkflowChanged(input.source);
  }

  /**
   * Handles observed attribute changes on the custom element.
   *
   * When `name` is `"workflow-source"` and `newValue` is non-null, the value
   * is parsed as a JSON-encoded {@link LoadWorkflowSourceInput} and
   * `loadWorkflowSource` is called. Parse errors emit an `editorError` event.
   *
   * Register this method in the custom element's `attributeChangedCallback`
   * and add `"workflow-source"` to `observedAttributes` to enable declarative
   * workflow loading from HTML markup.
   *
   * @param name - The name of the changed attribute.
   * @param newValue - The new attribute value, or `null` when the attribute
   *   was removed.
   */
  handleAttributeChange(name: string, newValue: string | null): void {
    if (name !== "workflow-source" || newValue === null) {
      return;
    }

    let input: LoadWorkflowSourceInput;
    try {
      input = JSON.parse(newValue) as LoadWorkflowSourceInput;
    } catch {
      this.bridge.emitError(
        "INVALID_ATTRIBUTE",
        'The "workflow-source" attribute must be a valid JSON-encoded LoadWorkflowSourceInput.',
      );
      return;
    }

    // Fire-and-forget: errors are surfaced via editorError events.
    void this.loadWorkflowSource(input);
  }
}
