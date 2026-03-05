import type { DiagnosticSeverity, DiagnosticsCollection, ValidationDiagnostic } from "./types.js";
import { compareSeverity } from "./severity.js";

/**
 * Filters a {@link DiagnosticsCollection} to only include diagnostics whose
 * severity is greater than or equal to the given minimum severity.
 *
 * @param diagnostics - Source collection to filter.
 * @param minSeverity - Minimum severity level to include.
 * @returns A new array containing only matching diagnostics.
 */
export function filterBySeverity(
  diagnostics: DiagnosticsCollection,
  minSeverity: DiagnosticSeverity,
): DiagnosticsCollection {
  return diagnostics.filter(
    (d) => compareSeverity(d.severity, minSeverity) >= 0,
  );
}

/**
 * Returns `true` if the collection contains at least one diagnostic with
 * severity `"error"`.
 *
 * @param diagnostics - Collection to inspect.
 */
export function hasErrors(diagnostics: DiagnosticsCollection): boolean {
  return diagnostics.some((d) => d.severity === "error");
}

/**
 * Serializes a {@link DiagnosticsCollection} to a JSON string.
 *
 * The resulting string is suitable for cross-boundary transmission to host
 * applications. The collection can be reconstructed with `JSON.parse`.
 *
 * @param diagnostics - Collection to serialize.
 * @returns JSON string representation.
 */
export function serializeDiagnostics(diagnostics: DiagnosticsCollection): string {
  return JSON.stringify(diagnostics);
}

/**
 * Creates a {@link ValidationDiagnostic} object, providing a convenient
 * factory with named parameters.
 *
 * @param ruleId - Identifier for the rule that produced this diagnostic.
 * @param severity - Severity level.
 * @param message - Human-readable description of the issue.
 * @param location - Pointer or path reference within the source.
 * @returns A new `ValidationDiagnostic` instance.
 */
export function createDiagnostic(
  ruleId: string,
  severity: DiagnosticSeverity,
  message: string,
  location: string,
): ValidationDiagnostic {
  return { ruleId, severity, message, location };
}
