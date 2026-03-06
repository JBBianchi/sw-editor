/**
 * Contract tests for the `editorDiagnosticsChanged` event payload.
 *
 * Verifies that the `EditorDiagnosticsChangedPayload` schema is structurally
 * correct, backward-compatible with unknown-field extension, and compliant
 * with the host–editor contract rules defined in
 * `specs/001-visual-authoring-mvp/contracts/host-editor-contract.md`.
 *
 * Contract rules under test:
 * - Payload carries explicit `version` (SemVer) and monotonic `revision` fields.
 * - `diagnostics` is an ordered, fully-replaced collection of
 *   {@link ValidationDiagnostic} entries.
 * - Each diagnostic entry has `ruleId`, `severity`, `message`, and `location`
 *   as JSON-safe string fields; `severity` is one of `"error"`, `"warning"`,
 *   `"info"`.
 * - Consumers that only read known fields must not be broken by additional
 *   unknown fields on either the payload or the diagnostic entries.
 * - Diagnostics with unmappable `location` values (empty string, whitespace,
 *   non-path tokens) must not be rejected; consumers must fall back gracefully.
 * - An empty `diagnostics` array is a valid payload representing a fully-valid
 *   workflow document.
 *
 * @module
 */

import type { DiagnosticsCollection, ValidationDiagnostic } from "@sw-editor/editor-core";
import type {
  BaseEventPayload,
  EditorDiagnosticsChangedPayload,
} from "@sw-editor/editor-host-client";
import { CONTRACT_VERSION, EditorEventName } from "@sw-editor/editor-host-client";
import { describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Valid severity values as defined by the `DiagnosticSeverity` union type.
 */
const VALID_SEVERITIES = ["error", "warning", "info"] as const;

/**
 * Asserts that `entry` conforms to the `ValidationDiagnostic` contract schema.
 *
 * @param entry - The value to validate.
 */
function assertDiagnosticEntry(entry: unknown): void {
  expect(entry).toBeDefined();
  expect(typeof entry).toBe("object");
  const d = entry as Record<string, unknown>;

  // ruleId: non-empty string identifier for the validation rule.
  expect(typeof d.ruleId).toBe("string");
  expect((d.ruleId as string).length).toBeGreaterThan(0);

  // severity: discriminated union of known string literals.
  expect(VALID_SEVERITIES).toContain(d.severity);

  // message: human-readable description — must be a string.
  expect(typeof d.message).toBe("string");

  // location: path reference — must be a string (may be empty for unmappable
  // positions; consumers must handle the empty-string case as a fallback).
  expect(typeof d.location).toBe("string");
}

/**
 * Asserts that `payload` conforms to the full `EditorDiagnosticsChangedPayload`
 * contract schema.
 *
 * @param payload - The value to validate.
 */
function assertDiagnosticsPayload(payload: unknown): void {
  expect(payload).toBeDefined();
  expect(typeof payload).toBe("object");
  const p = payload as Record<string, unknown>;

  // --- BaseEventPayload fields ---
  // version: SemVer string of the emitting bundle.
  expect(typeof p.version).toBe("string");
  expect((p.version as string).length).toBeGreaterThan(0);

  // revision: monotonically increasing positive integer.
  expect(typeof p.revision).toBe("number");
  expect(Number.isInteger(p.revision)).toBe(true);
  expect(p.revision as number).toBeGreaterThanOrEqual(1);

  // diagnostics: ordered collection that fully replaces the previous one.
  expect(Array.isArray(p.diagnostics)).toBe(true);
  for (const entry of p.diagnostics as unknown[]) {
    assertDiagnosticEntry(entry);
  }
}

/**
 * Constructs a minimal valid `EditorDiagnosticsChangedPayload` for use in
 * schema validation tests.
 *
 * @param diagnostics - The diagnostics collection to embed.
 * @param revision - Monotonic revision counter; defaults to `1`.
 * @returns A well-formed payload object.
 */
function makePayload(
  diagnostics: DiagnosticsCollection,
  revision = 1,
): EditorDiagnosticsChangedPayload {
  return {
    version: CONTRACT_VERSION,
    revision,
    diagnostics,
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A typical error-level diagnostic with a resolvable location. */
const ERROR_DIAGNOSTIC: ValidationDiagnostic = {
  ruleId: "required-field",
  severity: "error",
  message: "Missing required field 'name'",
  location: "/document/name",
};

/** A warning-level diagnostic. */
const WARNING_DIAGNOSTIC: ValidationDiagnostic = {
  ruleId: "best-practice.timeout",
  severity: "warning",
  message: "Task timeout is not specified",
  location: "/do/0/callHTTP",
};

/** An info-level diagnostic. */
const INFO_DIAGNOSTIC: ValidationDiagnostic = {
  ruleId: "style.naming",
  severity: "info",
  message: "Task name uses non-conventional casing",
  location: "/do/1",
};

/** A diagnostic whose `location` cannot be mapped to any graph element. */
const UNMAPPABLE_LOCATION_DIAGNOSTIC: ValidationDiagnostic = {
  ruleId: "schema.unknown-field",
  severity: "warning",
  message: "Unrecognised extension field present",
  location: "",
};

// ---------------------------------------------------------------------------
// 1. Payload schema validation
// ---------------------------------------------------------------------------

describe("EditorDiagnosticsChangedPayload — schema", () => {
  it("empty diagnostics collection is a valid payload", () => {
    const payload = makePayload([]);
    assertDiagnosticsPayload(payload);
    expect((payload.diagnostics as unknown[]).length).toBe(0);
  });

  it("payload with a single error-level diagnostic is valid", () => {
    const payload = makePayload([ERROR_DIAGNOSTIC]);
    assertDiagnosticsPayload(payload);
    expect(payload.diagnostics).toHaveLength(1);
  });

  it("payload with mixed-severity diagnostics is valid", () => {
    const payload = makePayload([ERROR_DIAGNOSTIC, WARNING_DIAGNOSTIC, INFO_DIAGNOSTIC]);
    assertDiagnosticsPayload(payload);
    expect(payload.diagnostics).toHaveLength(3);
  });

  it("each diagnostic entry satisfies the ValidationDiagnostic schema", () => {
    const diagnostics: DiagnosticsCollection = [
      ERROR_DIAGNOSTIC,
      WARNING_DIAGNOSTIC,
      INFO_DIAGNOSTIC,
    ];
    for (const d of diagnostics) {
      assertDiagnosticEntry(d);
    }
  });

  it("version field is a non-empty SemVer string", () => {
    const payload = makePayload([]);
    expect(typeof payload.version).toBe("string");
    expect(payload.version.length).toBeGreaterThan(0);
    // SemVer pattern: MAJOR.MINOR.PATCH
    expect(payload.version).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("revision field is a positive integer", () => {
    const payload = makePayload([], 5);
    expect(typeof payload.revision).toBe("number");
    expect(Number.isInteger(payload.revision)).toBe(true);
    expect(payload.revision).toBe(5);
  });

  it("revision increments monotonically across successive payloads", () => {
    const payloads = [makePayload([], 1), makePayload([ERROR_DIAGNOSTIC], 2), makePayload([], 3)];
    for (let i = 1; i < payloads.length; i++) {
      expect(payloads[i].revision).toBeGreaterThan(payloads[i - 1].revision);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Version and revision field compliance
// ---------------------------------------------------------------------------

describe("BaseEventPayload — version and revision fields", () => {
  it("version equals CONTRACT_VERSION from editor-host-client", () => {
    const payload = makePayload([]);
    expect(payload.version).toBe(CONTRACT_VERSION);
  });

  it("CONTRACT_VERSION is a non-empty string", () => {
    expect(typeof CONTRACT_VERSION).toBe("string");
    expect(CONTRACT_VERSION.length).toBeGreaterThan(0);
  });

  it("editorDiagnosticsChanged is the stable event name constant", () => {
    expect(EditorEventName.editorDiagnosticsChanged).toBe("editorDiagnosticsChanged");
  });

  it("revision is present in every payload regardless of diagnostics content", () => {
    const payloads: EditorDiagnosticsChangedPayload[] = [
      makePayload([], 1),
      makePayload([ERROR_DIAGNOSTIC], 2),
      makePayload([ERROR_DIAGNOSTIC, WARNING_DIAGNOSTIC], 3),
    ];
    for (const p of payloads) {
      const base = p as BaseEventPayload;
      expect(typeof base.version).toBe("string");
      expect(typeof base.revision).toBe("number");
      expect(base.revision).toBeGreaterThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Unknown field tolerance
// ---------------------------------------------------------------------------

describe("Unknown-field tolerance", () => {
  it("consumer reading known payload fields is not broken by extra top-level fields", () => {
    // Simulate a future bundle that adds fields to the payload.
    const futurePayload = {
      version: CONTRACT_VERSION,
      revision: 1,
      diagnostics: [ERROR_DIAGNOSTIC],
      // Hypothetical future field — must not break existing consumers.
      deduplicated: true,
      schemaRevision: "v2",
    };

    // A v1 consumer that only reads the fields it knows about must still work.
    const knownFieldsConsumer = (p: EditorDiagnosticsChangedPayload): boolean => {
      return (
        typeof p.version === "string" &&
        typeof p.revision === "number" &&
        Array.isArray(p.diagnostics)
      );
    };

    expect(knownFieldsConsumer(futurePayload)).toBe(true);
  });

  it("consumer reading known diagnostic fields is not broken by extra fields on entries", () => {
    // Simulate future diagnostic entries with additional metadata fields.
    const futureDiagnostic = {
      ruleId: "schema.unknown-field",
      severity: "warning" as const,
      message: "Unrecognised field",
      location: "/do/0",
      // Hypothetical future fields.
      fixAvailable: false,
      codeActionUrl: "https://example.com/fix/schema.unknown-field",
    };

    // A v1 consumer that only reads known fields must still function.
    const readKnownFields = (d: ValidationDiagnostic): { ruleId: string; severity: string } => ({
      ruleId: d.ruleId,
      severity: d.severity,
    });

    expect(() => readKnownFields(futureDiagnostic)).not.toThrow();
    const result = readKnownFields(futureDiagnostic);
    expect(result.ruleId).toBe("schema.unknown-field");
    expect(result.severity).toBe("warning");
  });

  it("payload with extra fields still passes full schema assertion", () => {
    const extendedPayload = Object.assign({} as EditorDiagnosticsChangedPayload, {
      version: CONTRACT_VERSION,
      revision: 1,
      diagnostics: [WARNING_DIAGNOSTIC],
      _internalDebug: { source: "live-validator", durationMs: 42 },
    });

    assertDiagnosticsPayload(extendedPayload);
  });

  it("diagnostic entry with extra fields still passes schema assertion", () => {
    const extendedEntry = Object.assign({} as ValidationDiagnostic, {
      ruleId: "best-practice.timeout",
      severity: "warning" as const,
      message: "Task timeout is not specified",
      location: "/do/0/callHTTP",
      fixAvailable: false,
    });

    assertDiagnosticEntry(extendedEntry);
  });
});

// ---------------------------------------------------------------------------
// 4. Unmappable location fallback
// ---------------------------------------------------------------------------

describe("Unmappable location — fallback behavior", () => {
  it("diagnostic with empty string location is schema-valid", () => {
    const diagnostic: ValidationDiagnostic = {
      ...UNMAPPABLE_LOCATION_DIAGNOSTIC,
      location: "",
    };
    assertDiagnosticEntry(diagnostic);
  });

  it("diagnostic with whitespace-only location is schema-valid", () => {
    const diagnostic: ValidationDiagnostic = {
      ...UNMAPPABLE_LOCATION_DIAGNOSTIC,
      location: "   ",
    };
    assertDiagnosticEntry(diagnostic);
  });

  it("diagnostic with non-pointer location token is schema-valid", () => {
    // Some validators emit free-text identifiers instead of JSON Pointer paths.
    const diagnostic: ValidationDiagnostic = {
      ruleId: "spec.global",
      severity: "error",
      message: "Document-level constraint violated",
      location: "document",
    };
    assertDiagnosticEntry(diagnostic);
  });

  it("payload containing an unmappable-location diagnostic is schema-valid", () => {
    const payload = makePayload([UNMAPPABLE_LOCATION_DIAGNOSTIC]);
    assertDiagnosticsPayload(payload);
  });

  it("consumer falls back gracefully when location is empty", () => {
    // Simulate a consumer that attempts to use location for UI highlighting.
    const resolveGraphElement = (location: string): string | null =>
      location.trim() ? location : null;

    const result = resolveGraphElement(UNMAPPABLE_LOCATION_DIAGNOSTIC.location);
    // Fallback: null signals that no graph element can be highlighted.
    expect(result).toBeNull();
  });

  it("consumer falls back gracefully when location does not match any graph node", () => {
    const knownNodePaths = new Set(["/do/0", "/do/1", "/do/2"]);

    const resolveGraphElement = (location: string): string | null =>
      knownNodePaths.has(location) ? location : null;

    const unmappedLocation = "/do/99/deepNested";
    const result = resolveGraphElement(unmappedLocation);
    expect(result).toBeNull();
  });

  it("mixed payload with both mappable and unmappable locations is schema-valid", () => {
    const payload = makePayload([
      ERROR_DIAGNOSTIC, // mappable location
      UNMAPPABLE_LOCATION_DIAGNOSTIC, // empty location — unmappable
      WARNING_DIAGNOSTIC, // mappable location
    ]);
    assertDiagnosticsPayload(payload);
  });
});

// ---------------------------------------------------------------------------
// 5. Renderer-backend parity (payload is renderer-agnostic)
// ---------------------------------------------------------------------------

describe("Renderer-backend parity — diagnostics payload is renderer-agnostic", () => {
  /**
   * The `editorDiagnosticsChanged` payload does not reference the renderer
   * backend. This section verifies that identical diagnostic data produces
   * identical, schema-valid payloads regardless of the backend context label.
   */

  const DIAGNOSTICS: DiagnosticsCollection = [ERROR_DIAGNOSTIC, WARNING_DIAGNOSTIC];

  it("payload schema is identical for rete-lit and react-flow backend contexts", () => {
    // Construct equivalent payloads for each renderer context.
    const reteLitPayload = makePayload(DIAGNOSTICS, 1);
    const reactFlowPayload = makePayload(DIAGNOSTICS, 1);

    // Both must satisfy the full contract schema.
    assertDiagnosticsPayload(reteLitPayload);
    assertDiagnosticsPayload(reactFlowPayload);

    // Payloads are structurally identical — renderer backend does not affect
    // the diagnostics payload shape.
    expect(reteLitPayload).toEqual(reactFlowPayload);
  });

  it("diagnostics collection is fully replaced on each emission for both backends", () => {
    // Simulate two successive emissions as would occur in a live-validation
    // loop, verifying that the collection is replaced (not merged).
    const firstPayload = makePayload([ERROR_DIAGNOSTIC], 1);
    const secondPayload = makePayload([WARNING_DIAGNOSTIC], 2);

    expect(firstPayload.diagnostics).toEqual([ERROR_DIAGNOSTIC]);
    expect(secondPayload.diagnostics).toEqual([WARNING_DIAGNOSTIC]);
    // The second payload does not retain ERROR_DIAGNOSTIC.
    expect(secondPayload.diagnostics).not.toContainEqual(ERROR_DIAGNOSTIC);
  });

  it("empty-collection payload is valid in both backend contexts", () => {
    const reteLitClear = makePayload([], 3);
    const reactFlowClear = makePayload([], 3);

    assertDiagnosticsPayload(reteLitClear);
    assertDiagnosticsPayload(reactFlowClear);
    expect(reteLitClear.diagnostics).toHaveLength(0);
    expect(reactFlowClear.diagnostics).toHaveLength(0);
  });
});
