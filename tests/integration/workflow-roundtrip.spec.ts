/**
 * Round-trip integration tests: load → edit → export.
 *
 * Verifies that parsing a fixture source, applying a small edit to the
 * workflow model, and serializing back to JSON or YAML produces a document
 * that re-parses cleanly and preserves all semantic fields.
 *
 * Covers:
 *   - JSON → JSON round-trip (same-format)
 *   - YAML → YAML round-trip (same-format)
 *   - JSON → YAML cross-format conversion
 *   - YAML → JSON cross-format conversion
 *
 * Success criterion SC-003: ≥ 95 % of fixture scenarios must pass.
 *
 * @module
 */

import { readFileSync, readdirSync } from "node:fs";
import { resolve, extname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

import {
  parseWorkflowSource,
  serializeWorkflow,
} from "@sw-editor/editor-core";
import type { SourceFormat, WorkflowSource } from "@sw-editor/editor-core";

// ---------------------------------------------------------------------------
// Fixture discovery
// ---------------------------------------------------------------------------

const FIXTURES_DIR = resolve(
  fileURLToPath(new URL(".", import.meta.url)),
  "../fixtures/valid",
);

/**
 * A single discovered fixture with its raw content and declared format.
 */
interface Fixture {
  /** Human-readable label, e.g. `"simple.json"`. */
  name: string;
  /** Absolute path on disk. */
  path: string;
  /** Declared serialization format derived from the file extension. */
  format: SourceFormat;
  /** Raw file content. */
  content: string;
}

/**
 * Reads all `.json` and `.yaml` files from {@link FIXTURES_DIR} and returns
 * them as {@link Fixture} objects sorted by name for deterministic ordering.
 *
 * @returns Sorted array of discovered valid fixtures.
 */
function discoverFixtures(): Fixture[] {
  const files = readdirSync(FIXTURES_DIR).sort();
  const fixtures: Fixture[] = [];

  for (const file of files) {
    const ext = extname(file).toLowerCase();
    if (ext !== ".json" && ext !== ".yaml") continue;

    const format: SourceFormat = ext === ".json" ? "json" : "yaml";
    const path = resolve(FIXTURES_DIR, file);
    const content = readFileSync(path, "utf-8");

    fixtures.push({ name: file, path, format, content });
  }

  return fixtures;
}

const FIXTURES = discoverFixtures();

// ---------------------------------------------------------------------------
// Pass-rate tracking (SC-003)
// ---------------------------------------------------------------------------

/** Accumulates one entry per scenario attempted across all fixture describes. */
const scenarioResults: Array<{ fixture: string; scenario: string; passed: boolean }> = [];

/**
 * Executes `fn`, records whether it succeeded, then re-throws any error so
 * the containing `it` test still fails on a broken scenario.
 *
 * @param fixture - Fixture file name for the report label.
 * @param scenario - Short scenario label, e.g. `"json→json"`.
 * @param fn - The scenario body to run.
 */
function runScenario(fixture: string, scenario: string, fn: () => void): void {
  try {
    fn();
    scenarioResults.push({ fixture, scenario, passed: true });
  } catch (err) {
    scenarioResults.push({ fixture, scenario, passed: false });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Applies a small, semantics-preserving edit to the workflow model by adding
 * a `roundTripTestMarker` field to `document.metadata`.
 *
 * This edit tests that export operations do not corrupt sections of the
 * document that were not touched by the edit.
 *
 * @param source - The original workflow source to parse and edit.
 * @returns The edited {@link WorkflowSource} in the same format.
 */
function applySmallEdit(source: WorkflowSource): WorkflowSource {
  const parseResult = parseWorkflowSource(source);
  if (!parseResult.ok) {
    throw new Error(
      `Cannot apply edit — source failed to parse: ${parseResult.diagnostics.map((d) => d.message).join("; ")}`,
    );
  }

  const model = parseResult.workflow;

  // Add a marker to document.metadata without touching any other section.
  const docRecord = model.document as unknown as Record<string, unknown>;
  const existingMeta =
    (docRecord["metadata"] as Record<string, unknown> | undefined) ?? {};
  docRecord["metadata"] = { ...existingMeta, roundTripTestMarker: "integrated" };

  return serializeWorkflow(model, source.format);
}

/**
 * Asserts that a round-trip through load → edit → export preserves the
 * semantic identity of the workflow document.
 *
 * Verified invariants:
 * - The exported source re-parses successfully.
 * - `document.name`, `document.namespace`, `document.version`, and
 *   `document.dsl` are unchanged.
 * - The number of top-level tasks in `do` is unchanged.
 * - The `roundTripTestMarker` field added by the edit is present.
 * - Unrelated workflow sections (e.g. `input`) are not corrupted (still
 *   present when the original had them).
 *
 * @param original - The original workflow source.
 * @param exported - The edited and re-serialized source.
 * @param targetFormat - The format requested for the export.
 */
function assertRoundTripSemantics(
  original: WorkflowSource,
  exported: WorkflowSource,
  targetFormat: SourceFormat,
): void {
  // The exported content must use the requested format.
  expect(exported.format).toBe(targetFormat);
  expect(typeof exported.content).toBe("string");
  expect(exported.content.length).toBeGreaterThan(0);

  // The exported source must re-parse without errors.
  const reparsed = parseWorkflowSource(exported);
  expect(
    reparsed.ok,
    reparsed.ok
      ? "parse ok"
      : `Reparsed source failed: ${reparsed.diagnostics.map((d) => d.message).join("; ")}`,
  ).toBe(true);
  if (!reparsed.ok) return;

  // Parse the original for baseline comparison.
  const originalParsed = parseWorkflowSource(original);
  if (!originalParsed.ok) return; // Guard — already checked in applySmallEdit.

  const orig = originalParsed.workflow;
  const rep = reparsed.workflow;

  // Core document identity fields must be preserved.
  expect(rep.document.name).toBe(orig.document.name);
  expect(rep.document.namespace).toBe(orig.document.namespace);
  expect(rep.document.version).toBe(orig.document.version);
  expect(rep.document.dsl).toBe(orig.document.dsl);

  // The number of top-level tasks must be unchanged.
  const origTaskCount = Array.isArray(orig.do) ? orig.do.length : 0;
  const repTaskCount = Array.isArray(rep.do) ? rep.do.length : 0;
  expect(repTaskCount).toBe(origTaskCount);

  // The edit marker must be present after the round-trip.
  const repDoc = rep.document as unknown as Record<string, unknown>;
  const repMeta = repDoc["metadata"] as Record<string, unknown> | undefined;
  expect(repMeta?.["roundTripTestMarker"]).toBe("integrated");

  // Unrelated sections: if the original had an `input` section it must still
  // exist in the re-parsed output.
  if (orig.input !== undefined) {
    expect(rep.input).toBeDefined();
  }
}

// ---------------------------------------------------------------------------
// Per-fixture test suites
// ---------------------------------------------------------------------------

describe("Workflow round-trip integration (SC-003)", () => {
  expect(FIXTURES.length).toBeGreaterThan(0);

  for (const fixture of FIXTURES) {
    const src: WorkflowSource = { format: fixture.format, content: fixture.content };

    describe(`fixture: ${fixture.name}`, () => {
      it("parses successfully (load phase)", () => {
        runScenario(fixture.name, "load", () => {
          const result = parseWorkflowSource(src);
          expect(
            result.ok,
            result.ok
              ? "ok"
              : `Parse failed: ${result.diagnostics.map((d) => d.message).join("; ")}`,
          ).toBe(true);
        });
      });

      it(`same-format round-trip (${fixture.format}→${fixture.format})`, () => {
        runScenario(fixture.name, `${fixture.format}→${fixture.format}`, () => {
          const edited = applySmallEdit(src);
          assertRoundTripSemantics(src, edited, fixture.format);
        });
      });

      const crossFormat: SourceFormat = fixture.format === "json" ? "yaml" : "json";

      it(`cross-format round-trip (${fixture.format}→${crossFormat})`, () => {
        runScenario(fixture.name, `${fixture.format}→${crossFormat}`, () => {
          const parseResult = parseWorkflowSource(src);
          if (!parseResult.ok) {
            throw new Error(
              `Source parse failed: ${parseResult.diagnostics.map((d) => d.message).join("; ")}`,
            );
          }

          // Apply the edit then serialize to the cross format.
          const model = parseResult.workflow;
          const docRecord = model.document as unknown as Record<string, unknown>;
          const existingMeta =
            (docRecord["metadata"] as Record<string, unknown> | undefined) ?? {};
          docRecord["metadata"] = { ...existingMeta, roundTripTestMarker: "integrated" };

          const crossExport = serializeWorkflow(model, crossFormat);
          assertRoundTripSemantics(src, crossExport, crossFormat);
        });
      });
    });
  }

  // -------------------------------------------------------------------------
  // SC-003: aggregate pass-rate assertion
  // -------------------------------------------------------------------------

  describe("SC-003: aggregate pass rate", () => {
    it("≥ 95% of round-trip scenarios pass", () => {
      const total = scenarioResults.length;
      const passedCount = scenarioResults.filter((r) => r.passed).length;

      expect(total, "No scenarios were executed — fixture discovery may have failed").toBeGreaterThan(0);

      const rate = passedCount / total;
      const failLines = scenarioResults
        .filter((r) => !r.passed)
        .map((r) => `  FAIL  ${r.fixture} [${r.scenario}]`)
        .join("\n");
      const report = failLines || "  (all scenarios passed)";

      console.log(
        `\nRound-trip pass rate: ${passedCount}/${total} (${(rate * 100).toFixed(1)}%)\n${report}`,
      );

      expect(
        rate,
        `Pass rate ${(rate * 100).toFixed(1)}% is below the 95% SC-003 target.\nFailed scenarios:\n${failLines}`,
      ).toBeGreaterThanOrEqual(0.95);
    });
  });
});
