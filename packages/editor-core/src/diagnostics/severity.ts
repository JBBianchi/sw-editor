import type { DiagnosticSeverity } from "./types.js";

/**
 * Numeric ordering for {@link DiagnosticSeverity} levels.
 * Higher numbers indicate greater severity.
 *
 * - `error`   → 2
 * - `warning` → 1
 * - `info`    → 0
 */
export const SEVERITY_ORDER: Readonly<Record<DiagnosticSeverity, number>> = {
  error: 2,
  warning: 1,
  info: 0,
};

/**
 * Returns the numeric severity rank for the given severity level.
 *
 * @param severity - The severity level to rank.
 * @returns A number where higher values indicate greater severity.
 */
export function severityRank(severity: DiagnosticSeverity): number {
  return SEVERITY_ORDER[severity];
}

/**
 * Compares two severity levels.
 *
 * @param a - First severity level.
 * @param b - Second severity level.
 * @returns A positive number if `a` is more severe than `b`, negative if
 *          less severe, or `0` if equal.
 */
export function compareSeverity(a: DiagnosticSeverity, b: DiagnosticSeverity): number {
  return SEVERITY_ORDER[a] - SEVERITY_ORDER[b];
}

/**
 * Returns the more severe of two severity levels.
 *
 * @param a - First severity level.
 * @param b - Second severity level.
 * @returns The severity level with the higher rank.
 */
export function maxSeverity(a: DiagnosticSeverity, b: DiagnosticSeverity): DiagnosticSeverity {
  return SEVERITY_ORDER[a] >= SEVERITY_ORDER[b] ? a : b;
}
