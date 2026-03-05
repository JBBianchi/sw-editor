/**
 * Host–editor contract surface types for `@sw-editor/editor-host-client`.
 *
 * This module exports all TypeScript interfaces, types, and constants that
 * define the public contract between a host application and the editor bundle.
 *
 * @module contracts
 */
export type {
  CapabilitySnapshot,
  RendererCapabilitySnapshot,
} from "./capabilities.js";
export {
  EditorEventName,
} from "./events.js";
export type {
  BaseEventPayload,
  EditorDiagnosticsChangedPayload,
  EditorErrorPayload,
  EditorEventPayloadMap,
  EditorSelectionChangedPayload,
  WorkflowChangedPayload,
} from "./events.js";
export type {
  ExportWorkflowSourceOptions,
  ExportWorkflowSourceResult,
  HostEditorContract,
  LoadWorkflowSourceInput,
  ValidateWorkflowOptions,
  ValidateWorkflowResult,
} from "./methods.js";
export type {
  EdgeSelection,
  EditorSelection,
  NodeSelection,
  RendererId,
  WorkflowFormat,
  WorkflowSource,
} from "./types.js";
