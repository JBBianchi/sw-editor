import type { Specification } from "@serverlessworkflow/sdk";

/** The serialization format of a workflow source document. */
export type SourceFormat = "json" | "yaml";

/**
 * A workflow source document paired with its serialization format.
 *
 * @remarks
 * This is the canonical exchange unit between the host and the editor core.
 * `content` must be a valid JSON or YAML string matching `format` before
 * any further processing is performed.
 */
export interface WorkflowSource {
  /** The serialization format of {@link content}. */
  format: SourceFormat;
  /** The raw text content of the workflow definition. */
  content: string;
}

/**
 * A single structured parse diagnostic describing one issue found during
 * parsing or schema validation of a workflow source document.
 */
export interface ParseDiagnostic {
  /** Human-readable description of the issue. */
  message: string;
  /**
   * Optional JSON Pointer (RFC 6901) path identifying the location of the
   * issue within the workflow document.
   */
  path?: string | undefined;
}

/** A workflow definition that parsed successfully. */
export type WorkflowModel = Specification.Workflow;

/** Discriminated result of a successful parse operation. */
export interface ParseSuccess {
  ok: true;
  /** The parsed workflow model. */
  workflow: WorkflowModel;
}

/** Discriminated result of a failed parse operation. */
export interface ParseFailure {
  ok: false;
  /**
   * One or more structured diagnostics describing why parsing or validation
   * failed. Always contains at least one entry.
   */
  diagnostics: [ParseDiagnostic, ...ParseDiagnostic[]];
}

/**
 * Discriminated union result of {@link parseWorkflowSource}.
 *
 * Inspect `result.ok` to branch between success and failure without catching
 * exceptions.
 */
export type ParseResult = ParseSuccess | ParseFailure;
