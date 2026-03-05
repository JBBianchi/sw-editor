/**
 * Diagnostics UI module for `@sw-editor/editor-web-component`.
 *
 * Provides {@link DiagnosticsRenderer} for mapping validation diagnostics to
 * visual cues on graph nodes and collecting unmapped diagnostics in a global
 * summary panel.
 *
 * @module diagnostics
 */
export { DiagnosticsRenderer } from "./rendering.js";
export type { FindNodeElementCallback } from "./rendering.js";
