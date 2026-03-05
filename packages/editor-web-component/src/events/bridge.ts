import type { DiagnosticsCollection } from "@sw-editor/editor-core";
import type {
  EditorDiagnosticsChangedPayload,
  EditorErrorPayload,
  EditorEventPayloadMap,
  EditorSelectionChangedPayload,
  WorkflowChangedPayload,
} from "@sw-editor/editor-host-client";
import { EditorEventName } from "@sw-editor/editor-host-client";
import type { EditorSelection, WorkflowSource } from "@sw-editor/editor-host-client";

/**
 * Bridges internal editor-core state changes to custom DOM events on a
 * host {@link EventTarget} (typically the web component element).
 *
 * All emitted {@link CustomEvent}s use stable, unversioned event names
 * defined by {@link EditorEventName}. Each payload includes:
 * - an explicit `version` field (SemVer of the emitting bundle), and
 * - a monotonically increasing `revision` counter scoped to this instance.
 *
 * Events are dispatched with `bubbles: true` and `composed: true` so they
 * cross Shadow DOM boundaries and reach host-application listeners.
 */
export class EventBridge {
  private revision = 0;

  /**
   * Creates a new EventBridge.
   *
   * @param target - The DOM {@link EventTarget} from which events are dispatched.
   * @param version - The contract/bundle version string (SemVer) embedded in all payloads.
   */
  constructor(
    private readonly target: EventTarget,
    private readonly version: string,
  ) {}

  /**
   * Dispatches a `workflowChanged` {@link CustomEvent} on the target.
   *
   * @param source - The updated workflow source at the time of emission.
   */
  emitWorkflowChanged(source: WorkflowSource): void {
    const payload: WorkflowChangedPayload = {
      version: this.version,
      revision: this.nextRevision(),
      source,
    };
    this.dispatch(EditorEventName.workflowChanged, payload);
  }

  /**
   * Dispatches an `editorSelectionChanged` {@link CustomEvent} on the target.
   *
   * @param selection - The current selection, or `null` for workflow-level state.
   */
  emitSelectionChanged(selection: EditorSelection | null): void {
    const payload: EditorSelectionChangedPayload = {
      version: this.version,
      revision: this.nextRevision(),
      selection,
    };
    this.dispatch(EditorEventName.editorSelectionChanged, payload);
  }

  /**
   * Dispatches an `editorDiagnosticsChanged` {@link CustomEvent} on the target.
   *
   * @param diagnostics - The complete, up-to-date diagnostics collection after the latest pass.
   */
  emitDiagnosticsChanged(diagnostics: DiagnosticsCollection): void {
    const payload: EditorDiagnosticsChangedPayload = {
      version: this.version,
      revision: this.nextRevision(),
      diagnostics,
    };
    this.dispatch(EditorEventName.editorDiagnosticsChanged, payload);
  }

  /**
   * Dispatches an `editorError` {@link CustomEvent} on the target.
   *
   * @param code - Short machine-readable error code.
   * @param message - Human-readable description of the error.
   */
  emitError(code: string, message: string): void {
    const payload: EditorErrorPayload = {
      version: this.version,
      revision: this.nextRevision(),
      code,
      message,
    };
    this.dispatch(EditorEventName.editorError, payload);
  }

  /**
   * Returns the next monotonic revision number, incrementing the internal counter.
   *
   * @returns The incremented revision number, starting at `1` for the first event.
   */
  private nextRevision(): number {
    return ++this.revision;
  }

  /**
   * Creates and dispatches a typed {@link CustomEvent} for the given name and payload.
   *
   * @param name - Stable event name from {@link EditorEventName}.
   * @param detail - The typed event payload.
   */
  private dispatch<K extends keyof EditorEventPayloadMap>(
    name: K,
    detail: EditorEventPayloadMap[K],
  ): void {
    const event = new CustomEvent(name, {
      detail,
      bubbles: true,
      composed: true,
    });
    this.target.dispatchEvent(event);
  }
}
