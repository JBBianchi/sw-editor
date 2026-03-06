/**
 * Graph UI module for `@sw-editor/editor-web-component`.
 *
 * Provides {@link InsertionUI} for rendering insertion affordances on graph
 * edges, coordinating the task type selection menu, and emitting the
 * appropriate host–editor contract events after each insertion.
 *
 * @module graph
 */

export type {
  FocusNodeCallback,
  SerializeGraphCallback,
  TaskTypeDescriptor,
} from "./insertion-ui.js";
export {
  InsertionUI,
  MVP_TASK_TYPES,
} from "./insertion-ui.js";
