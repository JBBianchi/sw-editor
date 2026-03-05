/**
 * @packageDocumentation
 *
 * React Flow renderer adapter for the sw-editor visual workflow editor.
 *
 * Exports the {@link ReactFlowAdapter} class which implements the shared
 * {@link RendererAdapter} contract defined in `@sw-editor/editor-renderer-contract`.
 *
 * @example
 * ```ts
 * import { ReactFlowAdapter } from "@sw-editor/editor-renderer-react-flow";
 *
 * const adapter = new ReactFlowAdapter();
 * adapter.mount(document.getElementById("editor")!, initialGraph);
 * adapter.events.onSelectionChange(event => console.log(event));
 * adapter.update(updatedGraph);
 * adapter.dispose();
 * ```
 */
export { ReactFlowAdapter } from "./react-flow-adapter.js";
