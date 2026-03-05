/**
 * A monotonically increasing integer that identifies a specific revision of
 * editor state within a single editor instance.
 *
 * Revision counters start at `1` after the first mutation and only increase.
 * A value of `0` means the editor has not yet processed any state mutation.
 * Revision values must never be compared across different editor instances.
 */
export type Revision = number;

/**
 * Base shape mixed into every event payload emitted by the editor core.
 *
 * Including `revision` in all payloads lets host applications detect missed
 * events and maintain a consistent view of editor state without polling.
 */
export interface RevisionedPayload {
  /**
   * Monotonically increasing revision number of the editor state at the time
   * the event was emitted.
   */
  revision: Revision;
}
