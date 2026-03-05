import { describe, expect, it } from "vitest";
import type { WorkflowSource } from "../../src/source/index.js";
import { parseWorkflowSource, serializeWorkflow } from "../../src/source/index.js";

/** Minimal valid workflow fixture used across multiple tests. */
const MINIMAL_WORKFLOW_JSON = JSON.stringify({
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

const MINIMAL_WORKFLOW_YAML = `\
document:
  dsl: 1.0.0
  name: test-workflow
  version: 1.0.0
  namespace: default
do:
  - step1:
      set:
        greeting: hello
`;

// ---------------------------------------------------------------------------
// parseWorkflowSource
// ---------------------------------------------------------------------------

describe("parseWorkflowSource", () => {
  describe("valid inputs", () => {
    it("parses a valid JSON source", () => {
      const source: WorkflowSource = { format: "json", content: MINIMAL_WORKFLOW_JSON };
      const result = parseWorkflowSource(source);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.workflow.document.name).toBe("test-workflow");
    });

    it("parses a valid YAML source", () => {
      const source: WorkflowSource = { format: "yaml", content: MINIMAL_WORKFLOW_YAML };
      const result = parseWorkflowSource(source);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.workflow.document.namespace).toBe("default");
    });

    it("returns a workflow model with the correct do tasks", () => {
      const source: WorkflowSource = { format: "json", content: MINIMAL_WORKFLOW_JSON };
      const result = parseWorkflowSource(source);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(Array.isArray(result.workflow.do)).toBe(true);
      expect(result.workflow.do).toHaveLength(1);
    });
  });

  describe("invalid inputs — syntax errors", () => {
    it("returns a failure for malformed JSON/YAML", () => {
      const source: WorkflowSource = { format: "json", content: "{ not valid {{{{" };
      const result = parseWorkflowSource(source);

      expect(result.ok).toBe(false);
    });

    it("does not throw on malformed input", () => {
      const source: WorkflowSource = { format: "yaml", content: "{ unclosed: [" };
      expect(() => parseWorkflowSource(source)).not.toThrow();
    });

    it("failure contains at least one diagnostic", () => {
      const source: WorkflowSource = { format: "json", content: "not json at all" };
      const result = parseWorkflowSource(source);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(typeof result.diagnostics[0].message).toBe("string");
      expect(result.diagnostics[0].message.length).toBeGreaterThan(0);
    });
  });

  describe("invalid inputs — schema errors", () => {
    it("returns a failure when required fields are missing", () => {
      const incomplete = JSON.stringify({ document: { dsl: "1.0.0", name: "x" } });
      const source: WorkflowSource = { format: "json", content: incomplete };
      const result = parseWorkflowSource(source);

      expect(result.ok).toBe(false);
    });

    it("does not throw on schema-invalid input", () => {
      const incomplete = JSON.stringify({ document: { dsl: "1.0.0" } });
      const source: WorkflowSource = { format: "json", content: incomplete };
      expect(() => parseWorkflowSource(source)).not.toThrow();
    });

    it("returns structured diagnostics for schema errors", () => {
      const incomplete = JSON.stringify({ document: { dsl: "1.0.0", name: "x" } });
      const source: WorkflowSource = { format: "json", content: incomplete };
      const result = parseWorkflowSource(source);

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(typeof result.diagnostics[0].message).toBe("string");
    });

    it("returns a failure for an empty string", () => {
      const source: WorkflowSource = { format: "yaml", content: "" };
      const result = parseWorkflowSource(source);

      expect(result.ok).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// serializeWorkflow
// ---------------------------------------------------------------------------

describe("serializeWorkflow", () => {
  it("serializes a parsed workflow back to JSON", () => {
    const source: WorkflowSource = { format: "json", content: MINIMAL_WORKFLOW_JSON };
    const parseResult = parseWorkflowSource(source);

    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const serialized = serializeWorkflow(parseResult.workflow, "json");
    expect(serialized.format).toBe("json");
    expect(typeof serialized.content).toBe("string");
    expect(serialized.content.length).toBeGreaterThan(0);
  });

  it("serializes a parsed workflow back to YAML", () => {
    const source: WorkflowSource = { format: "yaml", content: MINIMAL_WORKFLOW_YAML };
    const parseResult = parseWorkflowSource(source);

    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const serialized = serializeWorkflow(parseResult.workflow, "yaml");
    expect(serialized.format).toBe("yaml");
    expect(typeof serialized.content).toBe("string");
    expect(serialized.content).toContain("test-workflow");
  });

  it("round-trips JSON source semantically", () => {
    const source: WorkflowSource = { format: "json", content: MINIMAL_WORKFLOW_JSON };
    const parseResult = parseWorkflowSource(source);

    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const serialized = serializeWorkflow(parseResult.workflow, "json");
    const reparsed = parseWorkflowSource(serialized);

    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) return;
    expect(reparsed.workflow.document.name).toBe("test-workflow");
    expect(reparsed.workflow.document.namespace).toBe("default");
  });

  it("round-trips YAML source semantically", () => {
    const source: WorkflowSource = { format: "yaml", content: MINIMAL_WORKFLOW_YAML };
    const parseResult = parseWorkflowSource(source);

    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const serialized = serializeWorkflow(parseResult.workflow, "yaml");
    const reparsed = parseWorkflowSource(serialized);

    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) return;
    expect(reparsed.workflow.document.name).toBe("test-workflow");
  });

  it("converts JSON source to YAML and preserves semantics", () => {
    const source: WorkflowSource = { format: "json", content: MINIMAL_WORKFLOW_JSON };
    const parseResult = parseWorkflowSource(source);

    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const asYaml = serializeWorkflow(parseResult.workflow, "yaml");
    expect(asYaml.format).toBe("yaml");

    const reparsed = parseWorkflowSource(asYaml);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) return;
    expect(reparsed.workflow.document.name).toBe("test-workflow");
  });

  it("converts YAML source to JSON and preserves semantics", () => {
    const source: WorkflowSource = { format: "yaml", content: MINIMAL_WORKFLOW_YAML };
    const parseResult = parseWorkflowSource(source);

    expect(parseResult.ok).toBe(true);
    if (!parseResult.ok) return;

    const asJson = serializeWorkflow(parseResult.workflow, "json");
    expect(asJson.format).toBe("json");

    const reparsed = parseWorkflowSource(asJson);
    expect(reparsed.ok).toBe(true);
    if (!reparsed.ok) return;
    expect(reparsed.workflow.document.name).toBe("test-workflow");
  });
});
