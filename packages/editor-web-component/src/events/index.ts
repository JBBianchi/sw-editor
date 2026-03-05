/**
 * Event bridge module for `@sw-editor/editor-web-component`.
 *
 * Provides {@link EventBridge} for emitting host–editor contract events as
 * typed {@link CustomEvent}s from the web component element, and typed event
 * aliases for use by host-application event listeners.
 *
 * @module events
 */
export { EventBridge } from "./bridge.js";
export type {
  EditorDiagnosticsChangedEvent,
  EditorErrorEvent,
  EditorSelectionChangedEvent,
  WorkflowChangedEvent,
} from "./types.js";
