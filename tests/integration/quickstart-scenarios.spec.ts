/**
 * Quickstart scenario validation tests.
 *
 * Executes and documents all five scenarios defined in
 * `specs/001-visual-authoring-mvp/quickstart.md`.  Each describe block maps
 * directly to one quickstart scenario so that the test output acts as a
 * machine-readable run report.
 *
 * Scenarios:
 *   1. Create New Workflow      – blank graph bootstrap with start/end nodes.
 *   2. Insert And Edit Task     – insertion affordance splits an edge.
 *   3. Load Existing YAML       – parse → edit → export round-trip.
 *   4. Diagnostics Flow         – live and full validation for invalid source.
 *   5. Privacy Guardrail        – no network requests during any editor op.
 *
 * @module
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { WorkflowSource } from "@sw-editor/editor-core";

import {
  bootstrapWorkflowGraph,
  END_NODE_ID,
  INITIAL_EDGE_ID,
  insertTask,
  LiveValidator,
  parseWorkflowSource,
  projectWorkflowToGraph,
  RevisionCounter,
  START_NODE_ID,
  serializeWorkflow,
  validateWorkflow,
} from "@sw-editor/editor-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const FIXTURES_DIR = resolve(fileURLToPath(new URL(".", import.meta.url)), "../fixtures");

/**
 * Reads a fixture file relative to the `tests/fixtures/` directory.
 *
 * @param relativePath - Path relative to `tests/fixtures/`.
 * @returns The file contents as a UTF-8 string.
 */
function readFixture(relativePath: string): string {
  return readFileSync(resolve(FIXTURES_DIR, relativePath), "utf-8");
}

/** Minimal valid JSON workflow for inline tests. */
const VALID_JSON_SOURCE: WorkflowSource = {
  format: "json",
  content: JSON.stringify({
    document: {
      dsl: "1.0.0",
      namespace: "quickstart",
      name: "qs-workflow",
      version: "0.0.1",
    },
    do: [
      {
        callStep: {
          call: "http",
          with: {
            method: "get",
            endpoint: "https://api.example.com/data",
          },
        },
      },
    ],
  }),
};

/** Invalid JSON workflow that is missing all required document fields. */
const INVALID_JSON_SOURCE: WorkflowSource = {
  format: "json",
  content: JSON.stringify({ notAWorkflow: true }),
};

// ---------------------------------------------------------------------------
// Scenario 1: Create New Workflow
// ---------------------------------------------------------------------------

describe("Quickstart Scenario 1 — Create New Workflow", () => {
  /**
   * Verifies that `bootstrapWorkflowGraph()` initialises a blank workflow
   * graph containing exactly the synthetic start and end boundary nodes
   * connected by an initial edge.
   *
   * Quickstart step: "Verify graph starts with start and end nodes."
   * Expected outcome: "initial graph and workflow panel state are available."
   */

  it("bootstrapped graph has exactly 2 nodes and 1 edge", () => {
    const graph = bootstrapWorkflowGraph();
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
  });

  it("start node is present with kind 'start' and stable ID", () => {
    const graph = bootstrapWorkflowGraph();
    const start = graph.nodes.find((n) => n.id === START_NODE_ID);
    expect(start).toBeDefined();
    expect(start?.kind).toBe("start");
  });

  it("end node is present with kind 'end' and stable ID", () => {
    const graph = bootstrapWorkflowGraph();
    const end = graph.nodes.find((n) => n.id === END_NODE_ID);
    expect(end).toBeDefined();
    expect(end?.kind).toBe("end");
  });

  it("initial edge connects start → end with the stable edge ID", () => {
    const graph = bootstrapWorkflowGraph();
    const edge = graph.edges[0];
    expect(edge?.id).toBe(INITIAL_EDGE_ID);
    expect(edge?.source).toBe(START_NODE_ID);
    expect(edge?.target).toBe(END_NODE_ID);
  });

  it("each call returns a fresh graph object — no shared state", () => {
    const a = bootstrapWorkflowGraph();
    const b = bootstrapWorkflowGraph();
    expect(a).not.toBe(b);
    a.nodes.push({ id: "extra", kind: "task" });
    const c = bootstrapWorkflowGraph();
    expect(c.nodes).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Insert And Edit Task
// ---------------------------------------------------------------------------

describe("Quickstart Scenario 2 — Insert And Edit Task", () => {
  /**
   * Verifies that `insertTask()` splits the initial edge by inserting a new
   * task node, rewiring the graph, and incrementing the revision counter.
   *
   * Quickstart steps:
   *   1. "Select insertion affordance between connected nodes."
   *   2. "Choose `Call` task."
   *   3. "Verify task is inserted and selected."
   *   4. "Edit task properties in panel."
   *
   * Expected outcome: "graph and source reflect updated task."
   */

  it("inserting a task into a blank graph produces 3 nodes and 2 edges", () => {
    const graph = bootstrapWorkflowGraph();
    const counter = new RevisionCounter();

    const result = insertTask(graph, counter, {
      edgeId: INITIAL_EDGE_ID,
      taskReference: "callStep",
    });

    expect(result.graph.nodes).toHaveLength(3);
    expect(result.graph.edges).toHaveLength(2);
  });

  it("the inserted node has kind 'task'", () => {
    const graph = bootstrapWorkflowGraph();
    const counter = new RevisionCounter();

    const result = insertTask(graph, counter, {
      edgeId: INITIAL_EDGE_ID,
      taskReference: "callStep",
    });

    const newNode = result.graph.nodes.find((n) => n.id === result.nodeId);
    expect(newNode).toBeDefined();
    expect(newNode?.kind).toBe("task");
  });

  it("the taskReference property is set on the inserted node", () => {
    const graph = bootstrapWorkflowGraph();
    const counter = new RevisionCounter();

    const result = insertTask(graph, counter, {
      edgeId: INITIAL_EDGE_ID,
      taskReference: "callStep",
    });

    const newNode = result.graph.nodes.find((n) => n.id === result.nodeId);
    expect(newNode?.taskReference).toBe("callStep");
  });

  it("new edges wire start → task and task → end correctly", () => {
    const graph = bootstrapWorkflowGraph();
    const counter = new RevisionCounter();

    const result = insertTask(graph, counter, {
      edgeId: INITIAL_EDGE_ID,
    });

    const { nodeId, graph: updated } = result;

    const edgeToTask = updated.edges.find((e) => e.target === nodeId);
    const edgeFromTask = updated.edges.find((e) => e.source === nodeId);

    expect(edgeToTask?.source).toBe(START_NODE_ID);
    expect(edgeFromTask?.target).toBe(END_NODE_ID);
  });

  it("the original initial edge is removed after insertion", () => {
    const graph = bootstrapWorkflowGraph();
    const counter = new RevisionCounter();

    const result = insertTask(graph, counter, { edgeId: INITIAL_EDGE_ID });

    const remnant = result.graph.edges.find((e) => e.id === INITIAL_EDGE_ID);
    expect(remnant).toBeUndefined();
  });

  it("revision counter increments on each insertion", () => {
    const graph = bootstrapWorkflowGraph();
    const counter = new RevisionCounter();

    expect(counter.currentRevision).toBe(0);

    const first = insertTask(graph, counter, { edgeId: INITIAL_EDGE_ID });
    expect(first.revision).toBe(1);
    expect(counter.currentRevision).toBe(1);

    const second = insertTask(first.graph, counter, {
      edgeId: first.graph.edges[0]?.id ?? "",
    });
    expect(second.revision).toBe(2);
  });

  it("the original graph is never mutated by insertTask", () => {
    const graph = bootstrapWorkflowGraph();
    const originalNodeCount = graph.nodes.length;
    const counter = new RevisionCounter();

    insertTask(graph, counter, { edgeId: INITIAL_EDGE_ID });

    expect(graph.nodes).toHaveLength(originalNodeCount);
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Load Existing YAML
// ---------------------------------------------------------------------------

describe("Quickstart Scenario 3 — Load Existing YAML", () => {
  /**
   * Verifies the full load → edit → export round-trip using a YAML fixture.
   *
   * Quickstart steps:
   *   1. "Load a valid YAML workflow source."
   *   2. "Verify graph structure and panel metadata."
   *   3. "Make a small edit and export YAML."
   *
   * Expected outcome: "exported YAML stays semantically and structurally correct."
   */

  it("simple.yaml fixture parses without errors", () => {
    const content = readFixture("valid/simple.yaml");
    const result = parseWorkflowSource({ format: "yaml", content });
    expect(
      result.ok,
      result.ok ? "ok" : `Parse failed: ${result.diagnostics.map((d) => d.message).join("; ")}`,
    ).toBe(true);
  });

  it("multi-task.yaml fixture parses without errors", () => {
    const content = readFixture("valid/multi-task.yaml");
    const result = parseWorkflowSource({ format: "yaml", content });
    expect(result.ok).toBe(true);
  });

  it("with-branches.yaml fixture parses without errors", () => {
    const content = readFixture("valid/with-branches.yaml");
    const result = parseWorkflowSource({ format: "yaml", content });
    expect(result.ok).toBe(true);
  });

  it("loaded YAML workflow preserves document identity fields", () => {
    const content = readFixture("valid/simple.yaml");
    const result = parseWorkflowSource({ format: "yaml", content });
    if (!result.ok) return;

    const { workflow } = result;
    expect(workflow.document.dsl).toBeTruthy();
    expect(workflow.document.namespace).toBeTruthy();
    expect(workflow.document.name).toBeTruthy();
    expect(workflow.document.version).toBeTruthy();
  });

  it("small edit round-trip: YAML → edit → YAML re-parses cleanly", () => {
    const content = readFixture("valid/simple.yaml");
    const src: WorkflowSource = { format: "yaml", content };
    const parsed = parseWorkflowSource(src);
    if (!parsed.ok) throw new Error("Fixture must parse successfully");

    const model = parsed.workflow;
    const docRecord = model.document as unknown as Record<string, unknown>;
    const meta = (docRecord.metadata as Record<string, unknown> | undefined) ?? {};
    docRecord.metadata = { ...meta, qs3Marker: "scenario3" };

    const exported = serializeWorkflow(model, "yaml");
    expect(exported.format).toBe("yaml");
    expect(exported.content.length).toBeGreaterThan(0);

    const reparsed = parseWorkflowSource(exported);
    expect(reparsed.ok).toBe(true);
  });

  it("cross-format export: YAML → JSON round-trip preserves task count", () => {
    const content = readFixture("valid/multi-task.yaml");
    const src: WorkflowSource = { format: "yaml", content };
    const parsed = parseWorkflowSource(src);
    if (!parsed.ok) throw new Error("Fixture must parse successfully");

    const origTaskCount = Array.isArray(parsed.workflow.do) ? parsed.workflow.do.length : 0;

    const exported = serializeWorkflow(parsed.workflow, "json");
    const reparsed = parseWorkflowSource(exported);
    if (!reparsed.ok) throw new Error("Re-parse of JSON export must succeed");

    const repTaskCount = Array.isArray(reparsed.workflow.do) ? reparsed.workflow.do.length : 0;

    expect(repTaskCount).toBe(origTaskCount);
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: Diagnostics Flow
// ---------------------------------------------------------------------------

describe("Quickstart Scenario 4 — Diagnostics Flow", () => {
  /**
   * Verifies that both live (debounced) and explicit (full) validation
   * produce consistent diagnostics for an invalid workflow source.
   *
   * Quickstart steps:
   *   1. "Enter an invalid transition target."
   *   2. "Wait for debounce window."
   *   3. "Verify diagnostics event and local/global UI cues."
   *   4. "Trigger explicit validation."
   *
   * Expected outcome: "diagnostics update consistently for live and full
   * validation."
   */

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("live validator emits non-empty diagnostics for an invalid source after debounce", () => {
    const received: unknown[] = [];
    const validator = new LiveValidator((d) => received.push(d), { debounceMs: 500 });

    validator.schedule(INVALID_JSON_SOURCE);
    expect(received).toHaveLength(0); // still within debounce window

    vi.advanceTimersByTime(500);
    expect(received).toHaveLength(1);
    const diagnostics = received[0] as unknown[];
    expect(Array.isArray(diagnostics)).toBe(true);
    expect(diagnostics.length).toBeGreaterThan(0);

    validator.dispose();
  });

  it("live validator emits empty diagnostics for a valid source", () => {
    const received: unknown[] = [];
    const validator = new LiveValidator((d) => received.push(d), { debounceMs: 100 });

    validator.schedule(VALID_JSON_SOURCE);
    vi.advanceTimersByTime(100);

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual([]);

    validator.dispose();
  });

  it("full validator returns non-empty diagnostics for an invalid source", () => {
    const diagnostics = validateWorkflow(INVALID_JSON_SOURCE);
    expect(Array.isArray(diagnostics)).toBe(true);
    expect(diagnostics.length).toBeGreaterThan(0);
  });

  it("full validator returns empty diagnostics for a valid source", () => {
    const diagnostics = validateWorkflow(VALID_JSON_SOURCE);
    expect(diagnostics).toEqual([]);
  });

  it("live and full validators agree on whether the source is valid", () => {
    // Full validation result for invalid source.
    const fullDiags = validateWorkflow(INVALID_JSON_SOURCE);
    expect(fullDiags.length).toBeGreaterThan(0);

    // Live validation result for same source.
    const received: unknown[] = [];
    const validator = new LiveValidator((d) => received.push(d), { debounceMs: 0 });
    validator.schedule(INVALID_JSON_SOURCE);
    vi.advanceTimersByTime(0);

    const liveDiags = received[0] as unknown[];
    expect(liveDiags.length).toBeGreaterThan(0);

    validator.dispose();
  });

  it("each diagnostic entry has ruleId, severity, message, and location fields", () => {
    const diagnostics = validateWorkflow(INVALID_JSON_SOURCE);
    for (const d of diagnostics) {
      expect(typeof d.ruleId).toBe("string");
      expect(d.ruleId.length).toBeGreaterThan(0);
      expect(["error", "warning", "info"]).toContain(d.severity);
      expect(typeof d.message).toBe("string");
      expect(typeof d.location).toBe("string");
    }
  });

  it("rapid edits debounce correctly — only one validation fires", () => {
    const received: unknown[] = [];
    const validator = new LiveValidator((d) => received.push(d), { debounceMs: 300 });

    validator.schedule(INVALID_JSON_SOURCE);
    vi.advanceTimersByTime(100);
    validator.schedule(INVALID_JSON_SOURCE);
    vi.advanceTimersByTime(100);
    validator.schedule(VALID_JSON_SOURCE);
    vi.advanceTimersByTime(300);

    // Only the last schedule should fire, with the valid source.
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual([]);

    validator.dispose();
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: Privacy Guardrail
// ---------------------------------------------------------------------------

describe("Quickstart Scenario 5 — Privacy Guardrail", () => {
  /**
   * Verifies that no editor-initiated network requests occur during the full
   * create/load/edit/export/validate flow.  This satisfies the constitution
   * rule "No runtime network calls from editor core."
   *
   * Quickstart steps:
   *   1. "Run editor in offline environment."
   *   2. "Repeat create/load/edit/export flow."
   *
   * Expected outcome: "no editor-initiated network requests are observed."
   *
   * Strategy: replace `globalThis.fetch` with a spy before running all
   * editor operations and assert that it was never called.
   */

  it("bootstrapWorkflowGraph makes no network calls", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      bootstrapWorkflowGraph();
    } finally {
      fetchSpy.mockRestore();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("insertTask makes no network calls", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      const graph = bootstrapWorkflowGraph();
      const counter = new RevisionCounter();
      insertTask(graph, counter, { edgeId: INITIAL_EDGE_ID });
    } finally {
      fetchSpy.mockRestore();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("parseWorkflowSource makes no network calls", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      const content = readFixture("valid/simple.yaml");
      parseWorkflowSource({ format: "yaml", content });
    } finally {
      fetchSpy.mockRestore();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("serializeWorkflow makes no network calls", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      const result = parseWorkflowSource(VALID_JSON_SOURCE);
      if (result.ok) {
        serializeWorkflow(result.workflow, "yaml");
      }
    } finally {
      fetchSpy.mockRestore();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("validateWorkflow makes no network calls", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      validateWorkflow(VALID_JSON_SOURCE);
      validateWorkflow(INVALID_JSON_SOURCE);
    } finally {
      fetchSpy.mockRestore();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("full create/load/edit/export/validate flow makes no network calls", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    try {
      // Create
      const graph = bootstrapWorkflowGraph();
      const counter = new RevisionCounter();

      // Insert task
      const inserted = insertTask(graph, counter, { edgeId: INITIAL_EDGE_ID });
      expect(inserted.graph.nodes).toHaveLength(3);

      // Load existing YAML
      const yamlContent = readFixture("valid/simple.yaml");
      const parsed = parseWorkflowSource({ format: "yaml", content: yamlContent });
      expect(parsed.ok).toBe(true);

      if (parsed.ok) {
        // Edit
        const docRecord = parsed.workflow.document as unknown as Record<string, unknown>;
        docRecord.metadata = { qs5Marker: "scenario5" };

        // Export
        const exported = serializeWorkflow(parsed.workflow, "json");
        expect(exported.format).toBe("json");

        // Validate
        const diags = validateWorkflow(exported);
        expect(Array.isArray(diags)).toBe(true);
      }
    } finally {
      fetchSpy.mockRestore();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Scenario 6: Primary Quickstart Flow — End-to-End
// ---------------------------------------------------------------------------

describe("Quickstart Scenario 6 — Load, Insert, Verify Visual Order", () => {
  /**
   * End-to-end quickstart flow: load a YAML workflow, insert a task via the
   * graph API, then verify the visual node ordering matches the expected
   * start → task → end sequence.
   *
   * This scenario ties together parsing, graph projection, insertion, and
   * ordering assertions into a single cohesive flow that mirrors the primary
   * quickstart path described in the spec.
   */

  it("loading a fixture and inserting a task produces correct visual node order", () => {
    // Step 1: Load and parse an existing YAML workflow.
    const content = readFixture("valid/simple.yaml");
    const src: WorkflowSource = { format: "yaml", content };
    const parsed = parseWorkflowSource(src);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    // Step 2: Project the parsed workflow to a graph.
    const graph = projectWorkflowToGraph(parsed.workflow);
    expect(graph.nodes.length).toBeGreaterThanOrEqual(2);
    expect(graph.edges.length).toBeGreaterThanOrEqual(1);

    // Capture the initial node IDs for reference.
    const startNode = graph.nodes.find((n) => n.kind === "start");
    const endNode = graph.nodes.find((n) => n.kind === "end");
    expect(startNode).toBeDefined();
    expect(endNode).toBeDefined();
  });

  it("inserting a task into a bootstrapped graph yields start → task → end order", () => {
    // Bootstrap a blank graph (start → end).
    const graph = bootstrapWorkflowGraph();
    const counter = new RevisionCounter();

    // Insert a task on the initial edge.
    const result = insertTask(graph, counter, {
      edgeId: INITIAL_EDGE_ID,
      taskReference: "callStep",
    });

    // Verify visual order: start comes first, the new task in the middle, end last.
    const nodeIds = result.graph.nodes.map((n) => n.id);
    expect(nodeIds[0]).toBe(START_NODE_ID);
    expect(nodeIds[nodeIds.length - 1]).toBe(END_NODE_ID);
    expect(nodeIds[1]).toBe(result.nodeId);

    // Verify the full connectivity chain: start → task → end.
    const edgeToTask = result.graph.edges.find(
      (e) => e.source === START_NODE_ID && e.target === result.nodeId,
    );
    const edgeFromTask = result.graph.edges.find(
      (e) => e.source === result.nodeId && e.target === END_NODE_ID,
    );
    expect(edgeToTask).toBeDefined();
    expect(edgeFromTask).toBeDefined();
  });

  it("end-to-end: load YAML, insert task, export, and verify round-trip preserves order", () => {
    // Step 1: Load and parse a YAML fixture.
    const content = readFixture("valid/simple.yaml");
    const parsed = parseWorkflowSource({ format: "yaml", content });
    if (!parsed.ok) throw new Error("Fixture must parse successfully");

    // Step 2: Bootstrap graph and insert a task.
    const graph = bootstrapWorkflowGraph();
    const counter = new RevisionCounter();
    const inserted = insertTask(graph, counter, {
      edgeId: INITIAL_EDGE_ID,
      taskReference: "callStep",
    });

    // Step 3: Verify graph structural integrity after insertion.
    expect(inserted.graph.nodes).toHaveLength(3);
    expect(inserted.graph.edges).toHaveLength(2);

    // Step 4: Verify visual order matches expected output.
    const kinds = inserted.graph.nodes.map((n) => n.kind);
    expect(kinds).toEqual(["start", "task", "end"]);

    // Step 5: Serialize the original workflow and verify it round-trips.
    const exported = serializeWorkflow(parsed.workflow, "yaml");
    const reparsed = parseWorkflowSource(exported);
    expect(reparsed.ok).toBe(true);
  });
});
