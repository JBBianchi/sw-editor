import { describe, expect, it } from "vitest";
import type { WorkflowSource } from "../../src/source/index.js";
import { validateWorkflow } from "../../src/validation/full-validator.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_WORKFLOW_JSON = JSON.stringify({
  document: {
    dsl: "1.0.0",
    name: "test-workflow",
    version: "1.0.0",
    namespace: "default",
  },
  do: [
    {
      step1: {
        set: { greeting: "hello" },
      },
    },
  ],
});

const VALID_WORKFLOW_YAML = `\
document:
  dsl: 1.0.0
  name: yaml-workflow
  version: 1.0.0
  namespace: default
do:
  - step1:
      set:
        greeting: hello
`;

const INVALID_SCHEMA_JSON = JSON.stringify({
  document: { dsl: "1.0.0", name: "incomplete" },
  // missing required fields: version, namespace, do
});

const DUPLICATE_TASKS_JSON = JSON.stringify({
  document: {
    dsl: "1.0.0",
    name: "dup-workflow",
    version: "1.0.0",
    namespace: "default",
  },
  do: [
    { stepA: { set: { x: 1 } } },
    { stepA: { set: { x: 2 } } },
  ],
});

// ---------------------------------------------------------------------------
// Valid workflow — returns empty diagnostics
// ---------------------------------------------------------------------------

describe("validateWorkflow — valid workflows", () => {
  it("returns an empty array for a valid JSON workflow", () => {
    const source: WorkflowSource = { format: "json", content: VALID_WORKFLOW_JSON };
    const diagnostics = validateWorkflow(source);
    expect(diagnostics).toEqual([]);
  });

  it("returns an empty array for a valid YAML workflow", () => {
    const source: WorkflowSource = { format: "yaml", content: VALID_WORKFLOW_YAML };
    const diagnostics = validateWorkflow(source);
    expect(diagnostics).toEqual([]);
  });

  it("returns an array (not throws) for any input", () => {
    const source: WorkflowSource = { format: "json", content: VALID_WORKFLOW_JSON };
    expect(() => validateWorkflow(source)).not.toThrow();
    expect(Array.isArray(validateWorkflow(source))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Schema-invalid workflow — returns error diagnostics
// ---------------------------------------------------------------------------

describe("validateWorkflow — schema-invalid workflows", () => {
  it("returns at least one diagnostic for a schema-invalid source", () => {
    const source: WorkflowSource = { format: "json", content: INVALID_SCHEMA_JSON };
    const diagnostics = validateWorkflow(source);
    expect(diagnostics.length).toBeGreaterThan(0);
  });

  it("returns error-severity diagnostics for schema failures", () => {
    const source: WorkflowSource = { format: "json", content: INVALID_SCHEMA_JSON };
    const diagnostics = validateWorkflow(source);
    expect(diagnostics.every((d) => d.severity === "error")).toBe(true);
  });

  it("uses rule-id prefix 'schema.' for schema errors", () => {
    const source: WorkflowSource = { format: "json", content: INVALID_SCHEMA_JSON };
    const diagnostics = validateWorkflow(source);
    expect(diagnostics.every((d) => d.ruleId.startsWith("schema."))).toBe(true);
  });

  it("returns at least one diagnostic for malformed JSON", () => {
    const source: WorkflowSource = { format: "json", content: "not json {{{{" };
    const diagnostics = validateWorkflow(source);
    expect(diagnostics.length).toBeGreaterThan(0);
  });

  it("returns at least one diagnostic for empty string", () => {
    const source: WorkflowSource = { format: "yaml", content: "" };
    const diagnostics = validateWorkflow(source);
    expect(diagnostics.length).toBeGreaterThan(0);
  });

  it("each diagnostic has a non-empty message string", () => {
    const source: WorkflowSource = { format: "json", content: INVALID_SCHEMA_JSON };
    const diagnostics = validateWorkflow(source);
    for (const d of diagnostics) {
      expect(typeof d.message).toBe("string");
      expect(d.message.length).toBeGreaterThan(0);
    }
  });

  it("each diagnostic has a location string", () => {
    const source: WorkflowSource = { format: "json", content: INVALID_SCHEMA_JSON };
    const diagnostics = validateWorkflow(source);
    for (const d of diagnostics) {
      expect(typeof d.location).toBe("string");
    }
  });
});

// ---------------------------------------------------------------------------
// Semantic checks — duplicate task names
// ---------------------------------------------------------------------------

describe("validateWorkflow — semantic checks", () => {
  it("returns a diagnostic for duplicate task names in 'do'", () => {
    const source: WorkflowSource = { format: "json", content: DUPLICATE_TASKS_JSON };
    const diagnostics = validateWorkflow(source);
    expect(diagnostics.length).toBeGreaterThan(0);
  });

  it("uses rule-id 'semantic.duplicate-task-name' for duplicate task names", () => {
    const source: WorkflowSource = { format: "json", content: DUPLICATE_TASKS_JSON };
    const diagnostics = validateWorkflow(source);
    const dup = diagnostics.find((d) => d.ruleId === "semantic.duplicate-task-name");
    expect(dup).toBeDefined();
  });

  it("reports error severity for duplicate task names", () => {
    const source: WorkflowSource = { format: "json", content: DUPLICATE_TASKS_JSON };
    const diagnostics = validateWorkflow(source);
    const dup = diagnostics.find((d) => d.ruleId === "semantic.duplicate-task-name");
    expect(dup?.severity).toBe("error");
  });

  it("includes the duplicate name in the message", () => {
    const source: WorkflowSource = { format: "json", content: DUPLICATE_TASKS_JSON };
    const diagnostics = validateWorkflow(source);
    const dup = diagnostics.find((d) => d.ruleId === "semantic.duplicate-task-name");
    expect(dup?.message).toContain("stepA");
  });
});

// ---------------------------------------------------------------------------
// Options — schemaOnly flag
// ---------------------------------------------------------------------------

describe("validateWorkflow — options.schemaOnly", () => {
  it("skips semantic checks when schemaOnly is true", () => {
    const source: WorkflowSource = { format: "json", content: DUPLICATE_TASKS_JSON };
    const diagnostics = validateWorkflow(source, { schemaOnly: true });
    // Duplicate task names would only be flagged by semantic checks
    expect(diagnostics.every((d) => !d.ruleId.startsWith("semantic."))).toBe(true);
  });

  it("still returns schema errors when schemaOnly is true", () => {
    const source: WorkflowSource = { format: "json", content: INVALID_SCHEMA_JSON };
    const diagnostics = validateWorkflow(source, { schemaOnly: true });
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.every((d) => d.ruleId.startsWith("schema."))).toBe(true);
  });

  it("returns empty array for a valid workflow when schemaOnly is true", () => {
    const source: WorkflowSource = { format: "json", content: VALID_WORKFLOW_JSON };
    const diagnostics = validateWorkflow(source, { schemaOnly: true });
    expect(diagnostics).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Independence — callable at any time
// ---------------------------------------------------------------------------

describe("validateWorkflow — callable independently", () => {
  it("can be called multiple times on the same source without side effects", () => {
    const source: WorkflowSource = { format: "json", content: VALID_WORKFLOW_JSON };
    const first = validateWorkflow(source);
    const second = validateWorkflow(source);
    expect(first).toEqual(second);
  });

  it("can be called on different sources in sequence", () => {
    const valid: WorkflowSource = { format: "json", content: VALID_WORKFLOW_JSON };
    const invalid: WorkflowSource = { format: "json", content: INVALID_SCHEMA_JSON };
    expect(validateWorkflow(valid)).toEqual([]);
    expect(validateWorkflow(invalid).length).toBeGreaterThan(0);
    // Calling valid again still returns empty — no cross-call state
    expect(validateWorkflow(valid)).toEqual([]);
  });
});
