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

import { bootstrapWorkflowGraph } from "@sw-editor/editor-core";
import { ReteLitAdapter } from "@sw-editor/editor-host-client/rete-lit";

/**
 * The `sw-editor` custom element.
 *
 * Mounts a rete-lit renderer displaying a bootstrapped empty workflow graph
 * on connection and disposes it on disconnection.
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
}

customElements.define("sw-editor", SwEditorElement);
