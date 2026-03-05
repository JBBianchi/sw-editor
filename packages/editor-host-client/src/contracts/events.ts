import type { DiagnosticsCollection } from "@sw-editor/editor-core";
import type { EditorSelection, WorkflowSource } from "./types.js";

/**
 * Stable event name constants for all host–editor contract events.
 *
 * Event names are unversioned; compatibility is maintained through explicit
 * version fields on each payload.
 */
export const EditorEventName = {
  /** Emitted whenever the workflow document changes. */
  workflowChanged: "workflowChanged",
  /** Emitted whenever the user's in-editor selection changes. */
  editorSelectionChanged: "editorSelectionChanged",
  /** Emitted after each validation pass with the current diagnostics. */
  editorDiagnosticsChanged: "editorDiagnosticsChanged",
  /** Emitted when the editor encounters an unrecoverable error. */
  editorError: "editorError",
} as const;

/** Union of all valid editor event name strings. */
export type EditorEventName = (typeof EditorEventName)[keyof typeof EditorEventName];

// ---------------------------------------------------------------------------
// Event payload types
// ---------------------------------------------------------------------------

/**
 * Base fields shared by all event payloads.
 *
 * `version` carries the contract version so hosts can detect schema drift
 * without an out-of-band handshake. `revision` is a monotonically increasing
 * counter scoped to the current editor instance; hosts may use it to detect
 * dropped or reordered events.
 */
export interface BaseEventPayload {
  /** Contract version string (SemVer) of the emitting editor bundle. */
  version: string;
  /** Monotonically increasing counter, reset to `1` when the editor mounts. */
  revision: number;
}

/**
 * Payload for the {@link EditorEventName.workflowChanged} event.
 *
 * Carries the full updated workflow source so the host does not need to call
 * `exportWorkflowSource` to obtain it.
 */
export interface WorkflowChangedPayload extends BaseEventPayload {
  /** Updated workflow source at the time the event was emitted. */
  source: WorkflowSource;
}

/**
 * Payload for the {@link EditorEventName.editorSelectionChanged} event.
 *
 * `selection` is `null` when no graph element is selected (workflow-level
 * panel state).
 */
export interface EditorSelectionChangedPayload extends BaseEventPayload {
  /** Current selection, or `null` for workflow-level state. */
  selection: EditorSelection | null;
}

/**
 * Payload for the {@link EditorEventName.editorDiagnosticsChanged} event.
 *
 * Emitted after every live-validation pass; `diagnostics` replaces the
 * previous collection in its entirety.
 */
export interface EditorDiagnosticsChangedPayload extends BaseEventPayload {
  /** Complete, up-to-date diagnostics collection after the latest pass. */
  diagnostics: DiagnosticsCollection;
}

/**
 * Payload for the {@link EditorEventName.editorError} event.
 *
 * Emitted when the editor encounters an unrecoverable internal error.
 * The editor may be in a degraded state after this event.
 */
export interface EditorErrorPayload extends BaseEventPayload {
  /** Short machine-readable error code. */
  code: string;
  /** Human-readable description of the error. */
  message: string;
}

/**
 * Discriminated map from event name to its payload type.
 *
 * Useful for typed event listener registration:
 * ```ts
 * editor.addEventListener<EditorEventPayloadMap["workflowChanged"]>(
 *   EditorEventName.workflowChanged,
 *   (payload) => { ... },
 * );
 * ```
 */
export interface EditorEventPayloadMap {
  [EditorEventName.workflowChanged]: WorkflowChangedPayload;
  [EditorEventName.editorSelectionChanged]: EditorSelectionChangedPayload;
  [EditorEventName.editorDiagnosticsChanged]: EditorDiagnosticsChangedPayload;
  [EditorEventName.editorError]: EditorErrorPayload;
}
