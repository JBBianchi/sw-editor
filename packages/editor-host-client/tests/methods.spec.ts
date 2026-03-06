import { describe, expect, expectTypeOf, it } from "vitest";
import type { CapabilitySnapshot } from "../src/contracts/capabilities.js";
import type {
  ExportWorkflowSourceOptions,
  ExportWorkflowSourceResult,
  HostEditorContract,
  ValidateWorkflowOptions,
  ValidateWorkflowResult,
} from "../src/contracts/methods.js";
import type { EditorSelection, WorkflowSource } from "../src/contracts/types.js";

// ---------------------------------------------------------------------------
// Minimal stub satisfying HostEditorContract (structural typing check)
// ---------------------------------------------------------------------------

/** Minimal stub that structurally satisfies {@link HostEditorContract}. */
const stub: HostEditorContract = {
  loadWorkflowSource(_input) {
    return Promise.resolve();
  },
  exportWorkflowSource(_options?) {
    const result: ExportWorkflowSourceResult = {
      source: { format: "json", content: "{}" },
    };
    return Promise.resolve(result);
  },
  validateWorkflow(_options?) {
    const result: ValidateWorkflowResult = {
      valid: true,
      summary: { errors: 0, warnings: 0, infos: 0 },
    };
    return Promise.resolve(result);
  },
  setSelection(_selection: EditorSelection | null) {
    return Promise.resolve();
  },
  getCapabilities() {
    const snapshot: CapabilitySnapshot = {
      contractVersion: "0.1.0",
      targetVersion: "1.0",
      supportedVersions: ["1.0"],
      rendererId: "react-flow",
      rendererCapabilities: {
        rendererId: "react-flow",
        rendererVersion: "0.0.0",
        supportsNodeRendererPlugins: false,
        supportsNestedInlineProjection: false,
        supportsRouteOverlayProjection: false,
      },
    };
    return Promise.resolve(snapshot);
  },
};

// ---------------------------------------------------------------------------
// HostEditorContract — structural typing
// ---------------------------------------------------------------------------

describe("HostEditorContract — structural typing", () => {
  it("is satisfied by a minimal stub implementation", () => {
    expect(stub).toBeDefined();
    expect(typeof stub.loadWorkflowSource).toBe("function");
    expect(typeof stub.exportWorkflowSource).toBe("function");
    expect(typeof stub.validateWorkflow).toBe("function");
    expect(typeof stub.setSelection).toBe("function");
    expect(typeof stub.getCapabilities).toBe("function");
  });

  it("loadWorkflowSource returns a Promise<void>", async () => {
    const result = stub.loadWorkflowSource({ source: { format: "json", content: "{}" } });
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toBeUndefined();
  });

  it("exportWorkflowSource returns a Promise<ExportWorkflowSourceResult>", async () => {
    const result = await stub.exportWorkflowSource();
    expect(result).toHaveProperty("source");
  });

  it("validateWorkflow returns a Promise<ValidateWorkflowResult>", async () => {
    const result = await stub.validateWorkflow();
    expect(result).toHaveProperty("valid");
    expect(result).toHaveProperty("summary");
  });

  it("setSelection accepts null to clear selection", async () => {
    const result = stub.setSelection(null);
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toBeUndefined();
  });

  it("setSelection accepts a node selection", async () => {
    const result = stub.setSelection({ kind: "node", nodeId: "n1" });
    await expect(result).resolves.toBeUndefined();
  });

  it("setSelection accepts an edge selection", async () => {
    const result = stub.setSelection({ kind: "edge", edgeId: "e1" });
    await expect(result).resolves.toBeUndefined();
  });

  it("getCapabilities returns a Promise<CapabilitySnapshot>", async () => {
    const result = await stub.getCapabilities();
    expect(result).toHaveProperty("contractVersion");
    expect(result).toHaveProperty("rendererId");
  });
});

// ---------------------------------------------------------------------------
// ExportWorkflowSourceOptions — optional format field
// ---------------------------------------------------------------------------

describe("ExportWorkflowSourceOptions — optional format field", () => {
  it("accepts an object with no fields (all optional)", () => {
    const opts: ExportWorkflowSourceOptions = {};
    expect(opts).toBeDefined();
  });

  it('accepts format "json"', () => {
    const opts: ExportWorkflowSourceOptions = { format: "json" };
    expect(opts.format).toBe("json");
  });

  it('accepts format "yaml"', () => {
    const opts: ExportWorkflowSourceOptions = { format: "yaml" };
    expect(opts.format).toBe("yaml");
  });

  it("format is typed as optional string union", () => {
    expectTypeOf<ExportWorkflowSourceOptions["format"]>().toEqualTypeOf<
      "json" | "yaml" | undefined
    >();
  });
});

// ---------------------------------------------------------------------------
// ValidateWorkflowOptions — optional full boolean
// ---------------------------------------------------------------------------

describe("ValidateWorkflowOptions — optional full boolean", () => {
  it("accepts an empty object (all optional)", () => {
    const opts: ValidateWorkflowOptions = {};
    expect(opts).toBeDefined();
  });

  it("accepts full: true", () => {
    const opts: ValidateWorkflowOptions = { full: true };
    expect(opts.full).toBe(true);
  });

  it("accepts full: false", () => {
    const opts: ValidateWorkflowOptions = { full: false };
    expect(opts.full).toBe(false);
  });

  it("full is typed as optional boolean", () => {
    expectTypeOf<ValidateWorkflowOptions["full"]>().toEqualTypeOf<boolean | undefined>();
  });
});

// ---------------------------------------------------------------------------
// ValidateWorkflowResult — shape check
// ---------------------------------------------------------------------------

describe("ValidateWorkflowResult — shape", () => {
  it("contains valid: boolean", () => {
    const result: ValidateWorkflowResult = {
      valid: false,
      summary: { errors: 2, warnings: 1, infos: 0 },
    };
    expect(typeof result.valid).toBe("boolean");
  });

  it("contains summary.errors as number", () => {
    const result: ValidateWorkflowResult = {
      valid: true,
      summary: { errors: 0, warnings: 0, infos: 0 },
    };
    expect(typeof result.summary.errors).toBe("number");
  });

  it("contains summary.warnings as number", () => {
    const result: ValidateWorkflowResult = {
      valid: true,
      summary: { errors: 0, warnings: 3, infos: 0 },
    };
    expect(typeof result.summary.warnings).toBe("number");
  });

  it("contains summary.infos as number", () => {
    const result: ValidateWorkflowResult = {
      valid: true,
      summary: { errors: 0, warnings: 0, infos: 5 },
    };
    expect(typeof result.summary.infos).toBe("number");
  });

  it("valid field is typed as boolean", () => {
    expectTypeOf<ValidateWorkflowResult["valid"]>().toEqualTypeOf<boolean>();
  });

  it("summary.errors is typed as number", () => {
    expectTypeOf<ValidateWorkflowResult["summary"]["errors"]>().toEqualTypeOf<number>();
  });

  it("summary.warnings is typed as number", () => {
    expectTypeOf<ValidateWorkflowResult["summary"]["warnings"]>().toEqualTypeOf<number>();
  });

  it("summary.infos is typed as number", () => {
    expectTypeOf<ValidateWorkflowResult["summary"]["infos"]>().toEqualTypeOf<number>();
  });
});

// ---------------------------------------------------------------------------
// ExportWorkflowSourceResult — source is WorkflowSource
// ---------------------------------------------------------------------------

describe("ExportWorkflowSourceResult — source shape", () => {
  it("source satisfies WorkflowSource with format and content", () => {
    const result: ExportWorkflowSourceResult = {
      source: { format: "yaml", content: "document: v1" },
    };
    expect(result.source.format).toBe("yaml");
    expect(result.source.content).toBe("document: v1");
  });

  it('source accepts format "json"', () => {
    const result: ExportWorkflowSourceResult = {
      source: { format: "json", content: "{}" },
    };
    expect(result.source.format).toBe("json");
  });

  it("source.format is typed as WorkflowFormat", () => {
    expectTypeOf<ExportWorkflowSourceResult["source"]>().toEqualTypeOf<WorkflowSource>();
  });
});
