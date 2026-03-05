/**
 * Export action implementation for `@sw-editor/editor-host-client`.
 *
 * Provides {@link exportWorkflowSource} conforming to
 * {@link HostEditorContract.exportWorkflowSource}. Module-level state tracks
 * the most recently loaded workflow source so that subsequent export calls
 * know the original format and content without requiring the host to pass it
 * back in.
 *
 * @module export
 */

import { parseWorkflowSource, serializeWorkflow } from "@sw-editor/editor-core";

import type { ExportWorkflowSourceOptions, ExportWorkflowSourceResult } from "./contracts/methods.js";
import type { WorkflowFormat, WorkflowSource } from "./contracts/types.js";

/** Default output format when no source has been loaded (new workflow). */
const DEFAULT_FORMAT: WorkflowFormat = "json";

/**
 * Minimal valid Serverless Workflow 1.0 document used as the initial content
 * for new workflows that have not yet had a source loaded via
 * `loadWorkflowSource`.
 */
const DEFAULT_WORKFLOW_SOURCE: WorkflowSource = {
  format: "json",
  content: JSON.stringify(
    {
      document: {
        dsl: "1.0.0",
        namespace: "default",
        name: "new-workflow",
        version: "0.0.1",
      },
      do: [],
    },
    null,
    2,
  ),
};

/**
 * Internal mutable state holding the most recently loaded workflow source.
 *
 * `null` means the editor is in "new workflow" mode; no source has been loaded
 * via `loadWorkflowSource` yet.
 */
let _currentSource: WorkflowSource | null = null;

/**
 * Update the internal current workflow source.
 *
 * Called by the load pathway after a workflow source is successfully parsed and
 * projected. Must be called with `null` when the editor is reset to an empty
 * state.
 *
 * This function is intentionally not part of the public
 * {@link HostEditorContract} surface; it is an internal coordination point
 * between the export module and the load/command pathway.
 *
 * @param source - The successfully loaded workflow source, or `null` to reset
 *   to new-workflow mode.
 *
 * @internal
 */
export function setCurrentSource(source: WorkflowSource | null): void {
  _currentSource = source;
}

/**
 * Return the currently active workflow source, or `null` when the editor is in
 * new-workflow mode.
 *
 * Exposed for testing and for other modules that need to read the current
 * source without triggering a full export.
 *
 * @returns The current {@link WorkflowSource}, or `null`.
 *
 * @internal
 */
export function getCurrentSource(): WorkflowSource | null {
  return _currentSource;
}

/**
 * Export the current workflow as a serialized source document.
 *
 * Implements {@link HostEditorContract.exportWorkflowSource}.
 *
 * The workflow is re-parsed from the stored source and re-serialized in the
 * target format. This guarantees the exported content is structurally valid
 * and matches what the SDK considers the canonical normalized form.
 *
 * Format resolution order:
 * 1. `options.format` when explicitly provided.
 * 2. The format of the last loaded source (`setCurrentSource`).
 * 3. `"json"` for new workflows with no loaded source.
 *
 * @param options - Optional export settings.
 * @param options.format - Desired output format (`"json"` or `"yaml"`). Omit
 *   to use the format of the last loaded source, defaulting to `"json"` for
 *   new workflows.
 * @returns A promise that resolves with an {@link ExportWorkflowSourceResult}
 *   whose `source` field contains the serialized content in the requested
 *   format.
 * @throws {Error} If the current workflow source cannot be parsed, which
 *   indicates structural corruption that should not occur during normal
 *   operation.
 */
export async function exportWorkflowSource(
  options?: ExportWorkflowSourceOptions,
): Promise<ExportWorkflowSourceResult> {
  const source: WorkflowSource = _currentSource ?? DEFAULT_WORKFLOW_SOURCE;
  const targetFormat: WorkflowFormat = options?.format ?? source.format ?? DEFAULT_FORMAT;

  const parseResult = parseWorkflowSource(source);
  if (!parseResult.ok) {
    const messages = parseResult.diagnostics.map((d) => d.message).join("; ");
    throw new Error(`Export failed: current workflow source is invalid: ${messages}`);
  }

  const exported = serializeWorkflow(parseResult.workflow, targetFormat);
  return { source: exported };
}
