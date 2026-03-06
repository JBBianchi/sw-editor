/**
 * Demo entry point — registers the `sw-editor` custom element.
 *
 * Imports the `rete-lit` renderer backend from `@sw-editor/editor-host-client`
 * and defines the `<sw-editor>` custom element. The element bootstraps an empty
 * workflow graph (start → end) and mounts the rete-lit renderer into itself on
 * connection, so that consumer pages immediately see `data-node-type="start"`
 * boundary nodes without any additional scripting.
 *
 * @module demo/main
 */

import {
  bootstrapWorkflowGraph,
  parseWorkflowSource,
  projectWorkflowToGraph,
  validateWorkflow,
} from "@sw-editor/editor-core";
import { ReteLitAdapter } from "@sw-editor/editor-host-client/rete-lit";

/**
 * The `sw-editor` custom element.
 *
 * Mounts a rete-lit renderer displaying a bootstrapped empty workflow graph
 * on connection and disposes it on disconnection.
 *
 * Exposes {@link loadSource} for programmatic YAML/JSON workflow loading,
 * used by the demo harness load button and e2e tests.
 *
 * **Usage**
 * ```html
 * <sw-editor style="width: 100%; height: 600px;"></sw-editor>
 * <script type="module" src="main.js"></script>
 * ```
 */
class SwEditorElement extends HTMLElement {
  /** Active renderer adapter, present only while the element is connected. */
  #adapter: ReteLitAdapter | null = null;

  /**
   * Called by the browser when the element is inserted into the document.
   *
   * Creates a fresh `ReteLitAdapter`, bootstraps an empty workflow graph, and
   * mounts the renderer into this element.
   */
  connectedCallback(): void {
    this.#adapter = new ReteLitAdapter();
    this.#adapter.mount(this, bootstrapWorkflowGraph());
  }

  /**
   * Called by the browser when the element is removed from the document.
   *
   * Disposes the renderer adapter and releases all associated resources.
   */
  disconnectedCallback(): void {
    this.#adapter?.dispose();
    this.#adapter = null;
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
    this.#adapter.update(graph);
    this.dataset.nodeCount = String(graph.nodes.length);
  }
}

customElements.define("sw-editor", SwEditorElement);

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

      const format =
        content.startsWith("{") || content.startsWith("[") ? "json" : "yaml";

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
