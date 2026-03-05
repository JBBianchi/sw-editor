import { bootstrapWorkflowGraph } from "../graph/bootstrap.js";
import type { WorkflowGraph } from "../graph/types.js";
import { parseWorkflowSource } from "../source/parser.js";
import type { ParseDiagnostic, WorkflowModel, WorkflowSource } from "../source/types.js";
import type { RevisionCounter } from "../state/revision.js";
import type { Revision } from "../state/types.js";

/**
 * Discriminated result of a successful {@link loadWorkflow} invocation.
 *
 * The parsed model and bootstrapped graph are both present so the caller can
 * update editor state atomically before emitting the `workflowChanged` event.
 */
export interface LoadWorkflowSuccess {
  ok: true;
  /** The parsed and validated workflow model. */
  model: WorkflowModel;
  /**
   * Initial graph for the loaded workflow.
   *
   * A bootstrapped start/end graph is returned. Full model-to-graph projection
   * is performed by the separate `projectWorkflowModel` utility (T019).
   */
  graph: WorkflowGraph;
  /**
   * Revision number after the load. Always `1` because the counter is reset
   * before the first increment on each load.
   */
  revision: Revision;
}

/**
 * Discriminated result of a failed {@link loadWorkflow} invocation.
 *
 * Editor state is not modified when `ok` is `false`.
 */
export interface LoadWorkflowFailure {
  ok: false;
  /**
   * One or more structured diagnostics describing why parsing or validation
   * failed. Always contains at least one entry.
   */
  diagnostics: [ParseDiagnostic, ...ParseDiagnostic[]];
}

/**
 * Discriminated union result of {@link loadWorkflow}.
 *
 * Inspect `result.ok` to branch between success and failure without catching
 * exceptions.
 */
export type LoadWorkflowResult = LoadWorkflowSuccess | LoadWorkflowFailure;

/**
 * Loads a workflow from a {@link WorkflowSource}, initializing editor state
 * with the parsed model.
 *
 * @remarks
 * On success:
 * 1. The source is parsed and validated via the source service.
 * 2. A fresh bootstrapped graph is created for the loaded workflow.
 * 3. The revision counter is reset to `0` and incremented to `1`.
 *
 * On failure, the diagnostics are returned and editor state is left unchanged.
 * The caller is responsible for emitting the `workflowChanged` event after a
 * successful load using the returned `source` and `revision`.
 *
 * @param source - The JSON or YAML workflow source document to load.
 * @param counter - The editor revision counter. Reset and incremented on success.
 * @returns A {@link LoadWorkflowResult} discriminated by `ok`.
 */
export function loadWorkflow(source: WorkflowSource, counter: RevisionCounter): LoadWorkflowResult {
  const parseResult = parseWorkflowSource(source);

  if (!parseResult.ok) {
    return { ok: false, diagnostics: parseResult.diagnostics };
  }

  const graph = bootstrapWorkflowGraph();
  counter.reset();
  const revision = counter.increment();

  return { ok: true, model: parseResult.workflow, graph, revision };
}
