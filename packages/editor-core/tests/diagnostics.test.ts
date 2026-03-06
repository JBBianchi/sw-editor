import { describe, expect, it } from "vitest";
import type { DiagnosticsCollection, ValidationDiagnostic } from "../src/diagnostics/index.js";
import {
  compareSeverity,
  createDiagnostic,
  filterBySeverity,
  hasErrors,
  maxSeverity,
  SEVERITY_ORDER,
  serializeDiagnostics,
  severityRank,
} from "../src/diagnostics/index.js";

describe("ValidationDiagnostic — type construction", () => {
  it("creates a valid diagnostic via createDiagnostic", () => {
    const d: ValidationDiagnostic = createDiagnostic(
      "required-field",
      "error",
      "Field 'name' is required",
      "/do/0/name",
    );

    expect(d.ruleId).toBe("required-field");
    expect(d.severity).toBe("error");
    expect(d.message).toBe("Field 'name' is required");
    expect(d.location).toBe("/do/0/name");
  });

  it("accepts all three severity levels", () => {
    const error = createDiagnostic("r1", "error", "msg", "/");
    const warning = createDiagnostic("r2", "warning", "msg", "/");
    const info = createDiagnostic("r3", "info", "msg", "/");

    expect(error.severity).toBe("error");
    expect(warning.severity).toBe("warning");
    expect(info.severity).toBe("info");
  });
});

describe("Severity ordering", () => {
  it("SEVERITY_ORDER assigns correct ranks", () => {
    expect(SEVERITY_ORDER.error).toBeGreaterThan(SEVERITY_ORDER.warning);
    expect(SEVERITY_ORDER.warning).toBeGreaterThan(SEVERITY_ORDER.info);
  });

  it("severityRank returns the same value as SEVERITY_ORDER", () => {
    expect(severityRank("error")).toBe(SEVERITY_ORDER.error);
    expect(severityRank("warning")).toBe(SEVERITY_ORDER.warning);
    expect(severityRank("info")).toBe(SEVERITY_ORDER.info);
  });

  it("compareSeverity returns positive when a > b", () => {
    expect(compareSeverity("error", "warning")).toBeGreaterThan(0);
    expect(compareSeverity("warning", "info")).toBeGreaterThan(0);
    expect(compareSeverity("error", "info")).toBeGreaterThan(0);
  });

  it("compareSeverity returns negative when a < b", () => {
    expect(compareSeverity("info", "warning")).toBeLessThan(0);
    expect(compareSeverity("warning", "error")).toBeLessThan(0);
  });

  it("compareSeverity returns 0 for equal severities", () => {
    expect(compareSeverity("error", "error")).toBe(0);
    expect(compareSeverity("warning", "warning")).toBe(0);
    expect(compareSeverity("info", "info")).toBe(0);
  });

  it("maxSeverity returns the higher severity", () => {
    expect(maxSeverity("error", "warning")).toBe("error");
    expect(maxSeverity("info", "warning")).toBe("warning");
    expect(maxSeverity("info", "error")).toBe("error");
    expect(maxSeverity("warning", "warning")).toBe("warning");
  });
});

describe("DiagnosticsCollection helpers", () => {
  const collection: DiagnosticsCollection = [
    createDiagnostic("r1", "error", "err msg", "/a"),
    createDiagnostic("r2", "warning", "warn msg", "/b"),
    createDiagnostic("r3", "info", "info msg", "/c"),
  ];

  it("filterBySeverity keeps only diagnostics at or above the threshold", () => {
    const errorsOnly = filterBySeverity(collection, "error");
    expect(errorsOnly).toHaveLength(1);
    expect(errorsOnly[0]?.severity).toBe("error");

    const warningsAndAbove = filterBySeverity(collection, "warning");
    expect(warningsAndAbove).toHaveLength(2);

    const all = filterBySeverity(collection, "info");
    expect(all).toHaveLength(3);
  });

  it("hasErrors returns true when collection contains an error", () => {
    expect(hasErrors(collection)).toBe(true);
    expect(hasErrors([createDiagnostic("r", "warning", "w", "/")])).toBe(false);
    expect(hasErrors([])).toBe(false);
  });

  it("does not mutate the original collection", () => {
    const copy = [...collection];
    filterBySeverity(collection, "error");
    expect(collection).toEqual(copy);
  });
});

describe("Serialization", () => {
  it("serializeDiagnostics produces valid JSON", () => {
    const collection: DiagnosticsCollection = [
      createDiagnostic("r1", "error", "Something broke", "/tasks/0"),
    ];

    const json = serializeDiagnostics(collection);
    const parsed = JSON.parse(json) as unknown;

    expect(Array.isArray(parsed)).toBe(true);
    const first = (parsed as ValidationDiagnostic[])[0];
    expect(first?.ruleId).toBe("r1");
    expect(first?.severity).toBe("error");
    expect(first?.message).toBe("Something broke");
    expect(first?.location).toBe("/tasks/0");
  });

  it("round-trips an empty collection", () => {
    const json = serializeDiagnostics([]);
    expect(JSON.parse(json)).toEqual([]);
  });

  it("round-trips a multi-diagnostic collection", () => {
    const collection: DiagnosticsCollection = [
      createDiagnostic("r1", "error", "e", "/x"),
      createDiagnostic("r2", "warning", "w", "/y"),
      createDiagnostic("r3", "info", "i", "/z"),
    ];

    const parsed = JSON.parse(serializeDiagnostics(collection)) as ValidationDiagnostic[];
    expect(parsed).toHaveLength(3);
    expect(parsed[1]?.severity).toBe("warning");
  });
});
