import type {
  EditorDiagnosticsChangedPayload,
  EditorErrorPayload,
  EditorSelectionChangedPayload,
  WorkflowChangedPayload,
} from "@sw-editor/editor-host-client";

/**
 * Typed {@link CustomEvent} for the `workflowChanged` contract event.
 *
 * The `detail` property carries a {@link WorkflowChangedPayload} with the
 * updated workflow source, a contract `version` string, and a monotonic
 * `revision` counter.
 */
export type WorkflowChangedEvent = CustomEvent<WorkflowChangedPayload>;

/**
 * Typed {@link CustomEvent} for the `editorSelectionChanged` contract event.
 *
 * The `detail` property carries an {@link EditorSelectionChangedPayload}
 * with the current selection (or `null` for workflow-level state).
 */
export type EditorSelectionChangedEvent =
  CustomEvent<EditorSelectionChangedPayload>;

/**
 * Typed {@link CustomEvent} for the `editorDiagnosticsChanged` contract event.
 *
 * The `detail` property carries an {@link EditorDiagnosticsChangedPayload}
 * with the complete, up-to-date diagnostics collection.
 */
export type EditorDiagnosticsChangedEvent =
  CustomEvent<EditorDiagnosticsChangedPayload>;

/**
 * Typed {@link CustomEvent} for the `editorError` contract event.
 *
 * The `detail` property carries an {@link EditorErrorPayload} describing
 * the unrecoverable error that occurred.
 */
export type EditorErrorEvent = CustomEvent<EditorErrorPayload>;
