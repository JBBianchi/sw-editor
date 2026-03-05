import type { Revision } from "./types.js";

/**
 * Tracks a monotonically increasing revision counter for a single editor
 * instance.
 *
 * Each call to {@link RevisionCounter.increment} advances the counter by
 * exactly one. The counter is local to the instance — it is never shared
 * across editor instances, and callers must not compare revisions from
 * different instances.
 *
 * @example
 * ```ts
 * const counter = new RevisionCounter();
 * counter.currentRevision; // 0 — no mutations yet
 * counter.increment();
 * counter.currentRevision; // 1
 * counter.increment();
 * counter.currentRevision; // 2
 * ```
 */
export class RevisionCounter {
  #revision: Revision = 0;

  /**
   * The current revision value.
   *
   * Starts at `0` before any mutation. Increases by `1` for every call to
   * {@link increment}.
   */
  get currentRevision(): Revision {
    return this.#revision;
  }

  /**
   * Advances the revision counter by one and returns the new revision value.
   *
   * @returns The new revision number after the increment.
   */
  increment(): Revision {
    this.#revision += 1;
    return this.#revision;
  }

  /**
   * Resets the revision counter back to `0`.
   *
   * Use this when initializing a fresh editor state, such as when loading a
   * new workflow document. After calling `reset`, the next call to
   * {@link increment} will return `1`.
   */
  reset(): void {
    this.#revision = 0;
  }
}
