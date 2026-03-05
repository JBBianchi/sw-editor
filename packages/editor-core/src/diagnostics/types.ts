/**
 * Severity level of a validation diagnostic.
 *
 * Ordered from most severe to least severe:
 * `error` > `warning` > `info`
 */
export type DiagnosticSeverity = "error" | "warning" | "info";

/**
 * A single validation diagnostic produced by the editor core.
 *
 * All fields are JSON-safe primitives so the diagnostic can be serialized
 * and consumed by host applications without any transformation.
 */
export interface ValidationDiagnostic {
  /** Identifier for the rule that produced this diagnostic. */
  ruleId: string;
  /** Severity level of the diagnostic. */
  severity: DiagnosticSeverity;
  /** Human-readable description of the issue. */
  message: string;
  /**
   * Pointer or path reference indicating where in the source the issue
   * was found (e.g. a JSON Pointer string or dot-separated property path).
   */
  location: string;
}

/**
 * An ordered collection of {@link ValidationDiagnostic} entries.
 * The array is JSON-serializable as-is.
 */
export type DiagnosticsCollection = ValidationDiagnostic[];
