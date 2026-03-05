import type { WorkflowSource } from "../source/types.js";
import { parseWorkflowSource } from "../source/parser.js";
import type { DiagnosticsCollection, ValidationDiagnostic } from "../diagnostics/types.js";
import { createDiagnostic } from "../diagnostics/helpers.js";

/**
 * Callback invoked when a debounced validation run completes.
 *
 * @param diagnostics - The full set of diagnostics produced by the latest
 *   validation pass. An empty array means the workflow is currently valid.
 */
export type ValidationResultCallback = (diagnostics: DiagnosticsCollection) => void;

/**
 * Options for configuring a {@link LiveValidator} instance.
 */
export interface LiveValidatorOptions {
  /**
   * Milliseconds to wait after the last {@link LiveValidator.schedule} call
   * before running validation.
   *
   * Defaults to `500` to satisfy SC-002 (feedback within 500 ms after
   * debounce window closes).
   */
  debounceMs?: number;
}

/**
 * Maps a {@link ParseDiagnostic}-style error message and optional path into a
 * {@link ValidationDiagnostic} with a fixed rule ID.
 */
function toValidationDiagnostic(message: string, path?: string): ValidationDiagnostic {
  return createDiagnostic(
    "schema-validation",
    "error",
    message,
    path ?? "/",
  );
}

/**
 * Provides debounced live validation for a Serverless Workflow document.
 *
 * Usage:
 * 1. Create an instance, supplying an {@link ValidationResultCallback}.
 * 2. Call {@link schedule} whenever the workflow source changes (e.g. on every
 *    model mutation event).
 * 3. The validator will wait for the debounce window to elapse with no further
 *    calls, then run schema validation via the Serverless Workflow SDK and
 *    invoke the callback with the resulting {@link DiagnosticsCollection}.
 * 4. Call {@link dispose} when the editor session ends to cancel any pending
 *    timer.
 *
 * @example
 * ```ts
 * const validator = new LiveValidator((diagnostics) => {
 *   renderDiagnostics(diagnostics);
 * });
 *
 * // Call on every edit:
 * validator.schedule(currentSource);
 *
 * // Tear down:
 * validator.dispose();
 * ```
 */
export class LiveValidator {
  readonly #onResult: ValidationResultCallback;
  readonly #debounceMs: number;
  #timerId: ReturnType<typeof setTimeout> | undefined = undefined;

  /**
   * Creates a new {@link LiveValidator}.
   *
   * @param onResult - Callback invoked after each completed validation run.
   * @param options - Optional configuration; see {@link LiveValidatorOptions}.
   */
  constructor(onResult: ValidationResultCallback, options?: LiveValidatorOptions) {
    this.#onResult = onResult;
    this.#debounceMs = options?.debounceMs ?? 500;
  }

  /**
   * Schedules a validation run for the supplied source.
   *
   * Any previously scheduled run that has not yet started is cancelled before
   * the new timer is registered (debounce behaviour). The validation will fire
   * {@link LiveValidatorOptions.debounceMs} milliseconds after the most recent
   * call to this method.
   *
   * @param source - The current workflow source to validate when the debounce
   *   window closes.
   */
  schedule(source: WorkflowSource): void {
    if (this.#timerId !== undefined) {
      clearTimeout(this.#timerId);
    }

    this.#timerId = setTimeout(() => {
      this.#timerId = undefined;
      this.#run(source);
    }, this.#debounceMs);
  }

  /**
   * Cancels any pending validation timer.
   *
   * Call this when the editor session is torn down to prevent the callback
   * from being invoked after the consumer has been disposed.
   */
  dispose(): void {
    if (this.#timerId !== undefined) {
      clearTimeout(this.#timerId);
      this.#timerId = undefined;
    }
  }

  /**
   * Returns `true` if a validation run is currently pending (i.e. the timer
   * has been set but has not yet fired).
   */
  get isPending(): boolean {
    return this.#timerId !== undefined;
  }

  /**
   * Runs schema and semantic validation synchronously and invokes the result
   * callback with the produced diagnostics.
   *
   * @param source - The workflow source to validate.
   */
  #run(source: WorkflowSource): void {
    const result = parseWorkflowSource(source);
    if (result.ok) {
      this.#onResult([]);
    } else {
      const diagnostics: DiagnosticsCollection = result.diagnostics.map((d) =>
        toValidationDiagnostic(d.message, d.path),
      );
      this.#onResult(diagnostics);
    }
  }
}
