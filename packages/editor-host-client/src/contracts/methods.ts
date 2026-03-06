import type { CapabilitySnapshot } from "./capabilities.js";
import type { EditorSelection, WorkflowSource } from "./types.js";

/**
 * Input accepted by {@link HostEditorContract.loadWorkflowSource}.
 */
export interface LoadWorkflowSourceInput {
  /** Workflow source to load into the editor. */
  source: WorkflowSource;
}

/**
 * Options accepted by {@link HostEditorContract.exportWorkflowSource}.
 */
export interface ExportWorkflowSourceOptions {
  /**
   * Desired output format. When omitted the editor uses the format of the
   * last loaded or saved source.
   */
  format?: "json" | "yaml";
}

/**
 * Result returned by {@link HostEditorContract.exportWorkflowSource}.
 */
export interface ExportWorkflowSourceResult {
  /** Exported workflow source in the requested format. */
  source: WorkflowSource;
}

/**
 * Options accepted by {@link HostEditorContract.validateWorkflow}.
 */
export interface ValidateWorkflowOptions {
  /**
   * When `true`, the editor runs a full validation pass and awaits completion
   * before resolving. When omitted or `false`, behavior is implementation-
   * defined (typically a scheduled incremental pass).
   */
  full?: boolean;
}

/**
 * Result returned by {@link HostEditorContract.validateWorkflow}.
 */
export interface ValidateWorkflowResult {
  /** `true` if the workflow has no error-severity diagnostics. */
  valid: boolean;
  /** Diagnostic count by severity after the validation pass. */
  summary: {
    errors: number;
    warnings: number;
    infos: number;
  };
}

/**
 * The synchronous/async contract surface exposed by the editor to the host.
 *
 * All method calls are logically atomic from the host's perspective: the
 * editor resolves each promise after completing the requested operation or
 * rejects it with a descriptive error.
 *
 * Method names are stable; backward-incompatible changes require a
 * `contractVersion` bump in {@link CapabilitySnapshot}.
 */
export interface HostEditorContract {
  /**
   * Load a workflow source document into the editor, replacing any current
   * content.
   *
   * @param input - The source document to load.
   * @returns A promise that resolves when the editor has parsed and projected
   *   the source into the graph.
   */
  loadWorkflowSource(input: LoadWorkflowSourceInput): Promise<void>;

  /**
   * Export the current workflow as a serialized source document.
   *
   * @param options - Optional export settings (e.g. desired format).
   * @returns A promise that resolves with the serialized source.
   */
  exportWorkflowSource(options?: ExportWorkflowSourceOptions): Promise<ExportWorkflowSourceResult>;

  /**
   * Trigger a validation pass on the current workflow.
   *
   * The editor always owns validation execution. Hosts use this method to
   * request an explicit full pass; incremental live validation runs
   * independently.
   *
   * @param options - Optional validation settings.
   * @returns A promise that resolves with the validation result summary.
   */
  validateWorkflow(options?: ValidateWorkflowOptions): Promise<ValidateWorkflowResult>;

  /**
   * Programmatically set the current in-editor selection.
   *
   * Pass `null` to clear the selection and return to workflow-level panel
   * state.
   *
   * @param selection - The element to select, or `null` to clear.
   * @returns A promise that resolves when the selection has been applied.
   */
  setSelection(selection: EditorSelection | null): Promise<void>;

  /**
   * Retrieve the capability snapshot for the current editor bundle.
   *
   * Hosts should call this method once after mount to verify contract and
   * spec version compatibility before issuing further API calls.
   *
   * @returns A promise that resolves with the capability snapshot.
   */
  getCapabilities(): Promise<CapabilitySnapshot>;
}
