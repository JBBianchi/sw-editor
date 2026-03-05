import { Classes } from "@serverlessworkflow/sdk";

import type { ParseDiagnostic, ParseFailure, ParseResult, WorkflowSource } from "./types.js";

/**
 * Extracts structured diagnostics from an error thrown by the SDK.
 *
 * The SDK raises plain `Error` instances whose `message` field already
 * contains human-readable detail (including JSON Pointer paths for schema
 * errors). This helper normalises those messages into the editor-core
 * diagnostic format.
 *
 * @param err - The value caught from the SDK `deserialize` call.
 * @returns A non-empty array of {@link ParseDiagnostic} entries.
 */
function toDiagnostics(err: unknown): [ParseDiagnostic, ...ParseDiagnostic[]] {
  const message = err instanceof Error ? err.message : String(err);

  // The SDK's schema validation message format embeds one rule per line:
  //   'Workflow' is invalid:\n-  | #/path | description | params\n...
  // Parse each validation line into a separate diagnostic when present.
  const lines = message.split("\n").filter((l) => l.trim().startsWith("-"));
  if (lines.length > 0) {
    const diagnostics = lines.map((line): ParseDiagnostic => {
      // Columns: leading "- " | path | human message | params JSON
      const parts = line
        .replace(/^-\s+\|\s*/, "")
        .split(/\s+\|\s+/)
        .map((p) => p.trim());
      const path = parts[0] !== undefined && parts[0] !== "" ? parts[0] : undefined;
      const msg =
        parts[1] !== undefined && parts[1] !== "" ? parts[1] : (message.split("\n")[0] ?? message);
      return { message: msg, path };
    });
    return diagnostics as [ParseDiagnostic, ...ParseDiagnostic[]];
  }

  return [{ message }];
}

/**
 * Parses a {@link WorkflowSource} into a validated workflow model.
 *
 * @remarks
 * Parsing is format-agnostic: both JSON and YAML content are accepted
 * regardless of the declared `format` field, which is only used for
 * round-trip serialization. Parse and schema-validation errors are
 * returned as structured {@link ParseDiagnostic} entries rather than
 * thrown exceptions.
 *
 * @param source - The workflow source document to parse.
 * @returns A {@link ParseResult} discriminated by `ok`. On success
 *   `result.workflow` contains the parsed model; on failure
 *   `result.diagnostics` contains at least one diagnostic entry.
 */
export function parseWorkflowSource(source: WorkflowSource): ParseResult {
  try {
    const workflow = Classes.Workflow.deserialize(source.content);
    return { ok: true, workflow };
  } catch (err) {
    const failure: ParseFailure = { ok: false, diagnostics: toDiagnostics(err) };
    return failure;
  }
}
