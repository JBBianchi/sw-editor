import { createDiagnostic } from "../diagnostics/helpers.js";
import type { DiagnosticsCollection, ValidationDiagnostic } from "../diagnostics/types.js";
import { parseWorkflowSource } from "../source/parser.js";
import type { WorkflowModel, WorkflowSource } from "../source/types.js";

/**
 * Options controlling the behaviour of {@link validateWorkflow}.
 *
 * All fields are optional. Pass `undefined` or omit the parameter to use
 * the defaults.
 */
export interface ValidateWorkflowOptions {
  /**
   * When `true`, semantic checks are skipped and only schema validation is
   * performed. Defaults to `false`.
   */
  schemaOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Runs semantic checks against a successfully parsed {@link WorkflowModel}
 * and returns any resulting diagnostics.
 *
 * Semantic rules validate constraints that are not expressible in the JSON
 * Schema (e.g. uniqueness, referential integrity within the document).
 *
 * @param model - The parsed workflow model to check.
 * @returns An array of {@link ValidationDiagnostic} entries, empty when the
 *   model passes all semantic rules.
 */
function runSemanticChecks(model: WorkflowModel): ValidationDiagnostic[] {
  const diagnostics: ValidationDiagnostic[] = [];

  const tasks = model.do;
  if (Array.isArray(tasks) && tasks.length > 0) {
    const seen = new Set<string>();
    tasks.forEach((taskEntry, index) => {
      const names = Object.keys(taskEntry);
      names.forEach((name) => {
        if (seen.has(name)) {
          diagnostics.push(
            createDiagnostic(
              "semantic.duplicate-task-name",
              "error",
              `Duplicate task name '${name}' found in 'do' array.`,
              `/do/${index}/${name}`,
            ),
          );
        } else {
          seen.add(name);
        }
      });
    });
  }

  return diagnostics;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates a workflow source document and returns all diagnostics produced
 * by schema and (optionally) semantic checks.
 *
 * @remarks
 * This is the explicit, on-demand validation entry point required by the host
 * contract (`validateWorkflow`). It is independent of any live/debounced
 * validation pipeline and may be called at any time.
 *
 * - **Schema validation** delegates to the Serverless Workflow SDK. All parse
 *   errors are mapped to `ValidationDiagnostic` entries with severity
 *   `"error"` and rule-id prefix `"schema."`.
 * - **Semantic validation** applies editor-owned rules (e.g. duplicate task
 *   names) against the parsed model. These use rule-id prefix `"semantic."`.
 *
 * A valid workflow returns an empty array. An invalid workflow returns at
 * least one entry.
 *
 * @param source - The JSON or YAML workflow source document to validate.
 * @param options - Optional settings controlling which checks are run.
 * @returns A {@link DiagnosticsCollection} (i.e. `ValidationDiagnostic[]`)
 *   with all diagnostics found. Returns `[]` for a fully valid workflow.
 */
export function validateWorkflow(
  source: WorkflowSource,
  options?: ValidateWorkflowOptions,
): DiagnosticsCollection {
  const parseResult = parseWorkflowSource(source);

  if (!parseResult.ok) {
    // Map each ParseDiagnostic to a ValidationDiagnostic.
    return parseResult.diagnostics.map((pd) =>
      createDiagnostic("schema.validation", "error", pd.message, pd.path ?? "/"),
    );
  }

  if (options?.schemaOnly) {
    return [];
  }

  return runSemanticChecks(parseResult.workflow);
}
