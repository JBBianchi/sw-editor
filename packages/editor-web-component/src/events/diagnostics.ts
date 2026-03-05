import type { DiagnosticsCollection } from "@sw-editor/editor-core";
import type { EventBridge } from "./bridge.js";

/**
 * Emits `editorDiagnosticsChanged` events via {@link EventBridge} whenever the
 * diagnostics collection changes, suppressing duplicate emissions.
 *
 * Two diagnostic collections are considered identical when their JSON
 * serializations are equal. This covers both the case of an unchanged error
 * set after successive validation passes and the common case of repeated
 * "empty" (fully valid) results.
 *
 * Intended as the single point of contact between validation callbacks
 * (live or explicit) and the event bridge, so deduplication logic is not
 * scattered across call sites.
 *
 * @example
 * ```ts
 * const emitter = new DiagnosticsEmitter(bridge);
 *
 * // Wire to live validator:
 * const liveValidator = new LiveValidator((diagnostics) => {
 *   emitter.handle(diagnostics);
 * });
 *
 * // Wire to explicit validation:
 * const diagnostics = validateWorkflow(source);
 * emitter.handle(diagnostics);
 * ```
 */
export class DiagnosticsEmitter {
  #lastSerialized: string | undefined = undefined;

  /**
   * Creates a new `DiagnosticsEmitter`.
   *
   * @param bridge - The {@link EventBridge} used to dispatch
   *   `editorDiagnosticsChanged` events on the host element.
   */
  constructor(private readonly bridge: EventBridge) {}

  /**
   * Compares the incoming diagnostics collection against the last emitted one.
   * If the collections differ, delegates to {@link EventBridge.emitDiagnosticsChanged}
   * and updates the cached serialization. Identical collections are silently
   * dropped to prevent redundant events.
   *
   * @param diagnostics - The complete diagnostics collection produced by the
   *   latest validation pass (live or explicit). Pass `[]` for a valid workflow.
   */
  handle(diagnostics: DiagnosticsCollection): void {
    const serialized = JSON.stringify(diagnostics);
    if (serialized === this.#lastSerialized) {
      return;
    }
    this.#lastSerialized = serialized;
    this.bridge.emitDiagnosticsChanged(diagnostics);
  }

  /**
   * Resets the cached diagnostics state so the next {@link handle} call will
   * always emit an event regardless of the incoming collection.
   *
   * Call this when the workflow document is replaced (e.g. after a load
   * operation) to ensure the host receives fresh diagnostics for the new
   * source even if the collection is structurally identical to the previous one.
   */
  reset(): void {
    this.#lastSerialized = undefined;
  }
}
