/**
 * Source parse/serialize service for editor-core.
 *
 * Converts between raw JSON/YAML workflow source text and the internal
 * workflow model using the Serverless Workflow TypeScript SDK.
 *
 * @module source
 */

export { parseWorkflowSource } from "./parser.js";
export { serializeWorkflow } from "./serializer.js";
export type {
  ParseDiagnostic,
  ParseFailure,
  ParseResult,
  ParseSuccess,
  SourceFormat,
  WorkflowModel,
  WorkflowSource,
} from "./types.js";
