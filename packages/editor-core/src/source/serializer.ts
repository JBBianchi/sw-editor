import { Classes } from "@serverlessworkflow/sdk";

import type { SourceFormat, WorkflowModel, WorkflowSource } from "./types.js";

/**
 * Serializes a workflow model to a {@link WorkflowSource} in the requested
 * format.
 *
 * @remarks
 * The SDK normalizes the model before serialization by default. Cross-format
 * conversion (e.g. JSON→YAML or YAML→JSON) is supported: supply any `format`
 * value regardless of what the original source format was.
 *
 * @param workflow - The workflow model to serialize. Must be a structurally
 *   valid `Specification.Workflow` object.
 * @param format - The target serialization format (`"json"` or `"yaml"`).
 * @returns A {@link WorkflowSource} whose `content` is the serialized text
 *   and whose `format` matches the requested `format`.
 * @throws {Error} If the SDK rejects the model as structurally invalid during
 *   the serialization validation step. Callers that need graceful error
 *   handling should validate the model with {@link parseWorkflowSource}
 *   before serializing.
 */
export function serializeWorkflow(workflow: WorkflowModel, format: SourceFormat): WorkflowSource {
  const content = Classes.Workflow.serialize(workflow, format);
  return { format, content };
}
