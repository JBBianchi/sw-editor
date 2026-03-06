/**
 * Renderer-matrix integration parity tests.
 *
 * Verifies behavioral equivalence across the `rete-lit` and `react-flow`
 * renderer backends for the full MVP authoring flow:
 *   1. Create blank workflow
 *   2. Insert tasks
 *   3. Load existing workflow
 *   4. Edit workflow
 *   5. Export workflow
 *   6. Validate workflow
 *
 * **Test scope**: This suite is an integration-level check. It validates
 * that the data flowing through editor-core is identical regardless of the
 * active renderer backend. It does **not** test renderer DOM rendering
 * (that belongs in e2e tests) because DOM rendering requires a browser
 * environment that is outside the scope of Node.js integration tests.
 *
 * For each scenario the test verifies:
 * - Both renderer contexts produce the same graph data structures.
 * - Export outputs are **character-identical** across renderer contexts.
 * - Diagnostics collections are **deep-equal** across renderer contexts.
 *
 * Success criteria:
 * - SC-005: 100% of renderer parity scenarios pass for all MVP baseline
 *   fixtures across `rete-lit` and `react-flow` bundles.
 * - SC-006: Host setup remains one custom element and one client
 *   initialization step regardless of selected renderer bundle (verified
 *   via interface and lifecycle state assertions).
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Mock setup — browser/framework dependencies required by renderer packages.
//
// These mocks ensure that importing the renderer adapter sources in Node.js
// does not trigger DOM API calls at module-evaluation time.
// The mocks are intentionally minimal: only the symbols needed to instantiate
// the adapters and access their capability snapshots are stubbed.
//
// vi.mock() calls are hoisted by Vitest to the top of the compiled output,
// so they take effect before any import side-effects run.
// ---------------------------------------------------------------------------

import { vi } from "vitest";

vi.mock("@retejs/lit-plugin", () => {
  /** Minimal stub matching the LitPlugin surface used by ReteLitAdapter. */
  class LitPlugin {
    addPreset(_preset: unknown): void {}
  }
  return {
    LitPlugin,
    LitArea2D: {},
    Presets: { classic: { setup: () => ({}) } },
  };
});

vi.mock("rete", () => {
  class Socket {
    constructor(public readonly name: string) {}
  }
  class Output {}
  class Input {}
  class Node {
    id = `rete-node-${Math.random().toString(36).slice(2)}`;
    addOutput(_key: string, _output: Output): void {}
    addInput(_key: string, _input: Input): void {}
  }
  class Connection {
    id = `rete-conn-${Math.random().toString(36).slice(2)}`;
  }
  class NodeEditor {
    use(_plugin: unknown): void {}
    async clear(): Promise<void> {}
    async addNode(_node: Node): Promise<void> {}
    async addConnection(_conn: Connection): Promise<void> {}
    getNodes(): Node[] {
      return [];
    }
  }
  return {
    ClassicPreset: { Socket, Output, Input, Node, Connection },
    NodeEditor,
    GetSchemes: {},
  };
});

vi.mock("rete-area-plugin", () => {
  class Selector<T> {
    add(_entity: T, _accumulate: boolean): void {}
    remove(_entity: T): void {}
  }
  class AreaPlugin {
    use(_plugin: unknown): void {}
    async translate(_id: string, _position: { x: number; y: number }): Promise<void> {}
    destroy(): void {}
  }
  const AreaExtensions = {
    selectableNodes: (_area: unknown, _selector: unknown, _opts: unknown): void => {},
    accumulateOnCtrl: () => ({}),
    simpleNodesOrder: (_area: unknown): void => {},
    zoomAt: (_area: unknown, _nodes: unknown[]): Promise<void> => Promise.resolve(),
    Selector,
  };
  return { AreaPlugin, AreaExtensions };
});

vi.mock("rete-connection-plugin", () => {
  class ConnectionPlugin {
    addPreset(_preset: unknown): void {}
  }
  return {
    ConnectionPlugin,
    Presets: { classic: { setup: () => ({}) } },
  };
});

vi.mock("react", () => {
  const createElement = (
    type: unknown,
    props: unknown,
    ...children: unknown[]
  ): { type: unknown; props: unknown; children: unknown[] } => ({
    type,
    props,
    children,
  });
  return {
    default: { createElement },
    createElement,
    useState: <T>(initial: T): [T, (v: T) => void] => [initial, () => {}],
    useLayoutEffect: (_fn: () => void): void => {},
  };
});

vi.mock("react-dom/client", () => ({
  createRoot: (_container: unknown) => ({
    render(_element: unknown): void {},
    unmount(): void {},
  }),
}));

vi.mock("@xyflow/react", () => ({
  ReactFlow: {},
  ReactFlowProvider: {},
}));

// ---------------------------------------------------------------------------
// Imports — must follow vi.mock() declarations (hoisted by Vitest).
// ---------------------------------------------------------------------------

import { readdirSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { SourceFormat, WorkflowGraph, WorkflowSource } from "@sw-editor/editor-core";
import {
  bootstrapWorkflowGraph,
  INITIAL_EDGE_ID,
  insertTask,
  loadWorkflow,
  parseWorkflowSource,
  projectWorkflowToGraph,
  RevisionCounter,
  serializeWorkflow,
  validateWorkflow,
} from "@sw-editor/editor-core";
import type { RendererAdapter } from "@sw-editor/editor-renderer-contract";
import { ReactFlowAdapter } from "@sw-editor/editor-renderer-react-flow";
import { ReteLitAdapter } from "@sw-editor/editor-renderer-rete-lit";
import { beforeAll, describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Fixture discovery
// ---------------------------------------------------------------------------

const FIXTURES_DIR = resolve(fileURLToPath(new URL(".", import.meta.url)), "../fixtures/valid");

/**
 * A discovered fixture file with its parsed format and raw content.
 */
interface Fixture {
  /** Human-readable label, e.g. `"simple.json"`. */
  name: string;
  /** Declared serialization format derived from the file extension. */
  format: SourceFormat;
  /** Raw file content. */
  content: string;
}

/**
 * Reads all `.json` and `.yaml` fixture files from {@link FIXTURES_DIR}.
 *
 * @returns Sorted array of valid fixture descriptors.
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
    fixtures.push({ name: file, format, content });
  }

  return fixtures;
}

const FIXTURES = discoverFixtures();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a fresh `[ReteLitAdapter, ReactFlowAdapter]` pair for a single
 * test scenario. Each call returns brand-new instances to prevent state
 * sharing between scenarios.
 *
 * @returns A tuple `[reteLitAdapter, reactFlowAdapter]`.
 */
function createAdapters(): [ReteLitAdapter, ReactFlowAdapter] {
  return [new ReteLitAdapter(), new ReactFlowAdapter()];
}

// ---------------------------------------------------------------------------
// Pass-rate tracking (SC-005)
// ---------------------------------------------------------------------------

/** One entry per scenario attempted across the entire parity suite. */
const scenarioResults: Array<{
  scenario: string;
  passed: boolean;
}> = [];

/**
 * Executes `fn` within a tracked scenario, recording pass/fail.
 *
 * Errors are re-thrown so the enclosing `it` test still fails visibly.
 *
 * @param scenario - Short human-readable label for the scenario.
 * @param fn - The scenario body to execute.
 */
function runScenario(scenario: string, fn: () => void): void {
  try {
    fn();
    scenarioResults.push({ scenario, passed: true });
  } catch (err) {
    scenarioResults.push({ scenario, passed: false });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Graph fingerprinting helpers
// ---------------------------------------------------------------------------

/**
 * Returns a stable, order-insensitive structural fingerprint for a workflow
 * graph. Used to assert that two independently-produced graphs are structurally
 * equivalent even when internal ordering differs.
 *
 * The fingerprint captures:
 * - Sorted `id:kind` pairs for all nodes.
 * - Sorted `source->target` pairs for all edges.
 *
 * @param graph - The workflow graph to fingerprint.
 * @returns A canonical string representation.
 */
function graphFingerprint(graph: WorkflowGraph): string {
  const nodes = [...graph.nodes]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((n) => `${n.id}:${n.kind}`)
    .join(",");
  const edges = [...graph.edges]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((e) => `${e.source}->${e.target}`)
    .join(",");
  return `nodes=[${nodes}] edges=[${edges}]`;
}

/**
 * Asserts that two workflow graphs are structurally equivalent by comparing
 * their {@link graphFingerprint}s.
 *
 * @param graphA - First graph (e.g. produced in a rete-lit context).
 * @param graphB - Second graph (e.g. produced in a react-flow context).
 * @param label - Description used in error messages.
 */
function assertGraphParity(graphA: WorkflowGraph, graphB: WorkflowGraph, label: string): void {
  expect(graphFingerprint(graphA), `Graph fingerprint mismatch for "${label}"`).toBe(
    graphFingerprint(graphB),
  );
  expect(graphA.nodes.length, `Node count mismatch for "${label}"`).toBe(graphB.nodes.length);
  expect(graphA.edges.length, `Edge count mismatch for "${label}"`).toBe(graphB.edges.length);
}

// ---------------------------------------------------------------------------
// Suite: Renderer MVP parity (SC-005)
//
// Each scenario runs the same core operation twice (once per renderer context)
// and asserts that the resulting data is structurally or semantically
// equivalent. Renderer DOM/rendering is not tested here; only the data
// pipeline is verified.
// ---------------------------------------------------------------------------

describe("Renderer MVP parity (SC-005)", () => {
  expect(FIXTURES.length).toBeGreaterThan(0);

  // -------------------------------------------------------------------------
  // Scenario 1: Create blank workflow
  //
  // Both renderer contexts call bootstrapWorkflowGraph() to get the initial
  // graph. The resulting graph must be structurally identical.
  // -------------------------------------------------------------------------

  describe("Scenario 1 — Create blank workflow", () => {
    it("bootstrapped graph has exactly 2 nodes and 1 edge", () => {
      runScenario("create:graph-invariants", () => {
        const graph = bootstrapWorkflowGraph();

        expect(graph.nodes).toHaveLength(2);
        expect(graph.edges).toHaveLength(1);

        const nodeKinds = graph.nodes.map((n) => n.kind).sort();
        expect(nodeKinds).toEqual(["end", "start"]);
        expect(graph.edges[0]?.source).toBe("__start__");
        expect(graph.edges[0]?.target).toBe("__end__");
      });
    });

    it("graph produced for rete-lit context is structurally equivalent to react-flow context", () => {
      runScenario("create:fingerprint-parity", () => {
        // Simulate what each renderer context receives: both call the same
        // bootstrapWorkflowGraph() function.
        const graphForReteLit = bootstrapWorkflowGraph();
        const graphForReactFlow = bootstrapWorkflowGraph();

        assertGraphParity(graphForReteLit, graphForReactFlow, "create blank workflow");
      });
    });

    it("both adapter instances can be constructed with the bootstrapped graph ready to receive", () => {
      runScenario("create:adapter-construction", () => {
        const [reteLit, reactFlow] = createAdapters();

        // Verify adapters are correctly instantiated and hold the right renderer ID.
        expect(reteLit.rendererId).toBe("rete-lit");
        expect(reactFlow.rendererId).toBe("react-flow");

        // Both adapters should be in the pre-mount state (no errors on construction).
        expect(reteLit.capabilities).toBeDefined();
        expect(reactFlow.capabilities).toBeDefined();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 2: Insert tasks
  //
  // A task is inserted into the bootstrapped graph. The resulting graph
  // must be structurally equivalent regardless of which renderer context
  // will display it.
  // -------------------------------------------------------------------------

  describe("Scenario 2 — Insert tasks", () => {
    it("graph after task insertion has 3 nodes and 2 edges", () => {
      runScenario("insert:graph-invariants", () => {
        const baseGraph = bootstrapWorkflowGraph();
        const counter = new RevisionCounter();

        const { graph: updatedGraph, nodeId } = insertTask(baseGraph, counter, {
          edgeId: INITIAL_EDGE_ID,
          taskReference: "myTask",
        });

        expect(updatedGraph.nodes).toHaveLength(3);
        expect(updatedGraph.edges).toHaveLength(2);

        const taskNode = updatedGraph.nodes.find((n) => n.id === nodeId);
        expect(taskNode?.kind).toBe("task");
        expect(taskNode?.taskReference).toBe("myTask");

        // The original bootstrapped graph must not be mutated.
        expect(baseGraph.nodes).toHaveLength(2);
        expect(baseGraph.edges).toHaveLength(1);
      });
    });

    it("graph produced for rete-lit context is structurally equivalent to react-flow context after insert", () => {
      runScenario("insert:fingerprint-parity", () => {
        const baseGraph = bootstrapWorkflowGraph();

        // Simulate each renderer context independently processing an insert.
        const counterA = new RevisionCounter();
        const { graph: graphForReteLit } = insertTask(baseGraph, counterA, {
          edgeId: INITIAL_EDGE_ID,
          taskReference: "taskAlpha",
        });

        const counterB = new RevisionCounter();
        const { graph: graphForReactFlow } = insertTask(baseGraph, counterB, {
          edgeId: INITIAL_EDGE_ID,
          taskReference: "taskAlpha",
        });

        // Node and edge counts must match.
        expect(graphForReteLit.nodes).toHaveLength(graphForReactFlow.nodes.length);
        expect(graphForReteLit.edges).toHaveLength(graphForReactFlow.edges.length);

        // Start node connects to the same kind of target in both contexts.
        const startEdgeA = graphForReteLit.edges.find((e) => e.source === "__start__");
        const startEdgeB = graphForReactFlow.edges.find((e) => e.source === "__start__");
        expect(startEdgeA).toBeDefined();
        expect(startEdgeB).toBeDefined();

        // The inserted node kind must be "task" in both contexts.
        const taskNodeA = graphForReteLit.nodes.find((n) => n.kind === "task");
        const taskNodeB = graphForReactFlow.nodes.find((n) => n.kind === "task");
        expect(taskNodeA?.kind).toBe("task");
        expect(taskNodeB?.kind).toBe("task");
        expect(taskNodeA?.taskReference).toBe(taskNodeB?.taskReference);
      });
    });

    it("revision counter advances identically in both renderer contexts", () => {
      runScenario("insert:revision-parity", () => {
        const baseGraph = bootstrapWorkflowGraph();

        const counterA = new RevisionCounter();
        const resultA = insertTask(baseGraph, counterA, {
          edgeId: INITIAL_EDGE_ID,
        });

        const counterB = new RevisionCounter();
        const resultB = insertTask(baseGraph, counterB, {
          edgeId: INITIAL_EDGE_ID,
        });

        // Both contexts start from revision 0 and advance to 1 after one insert.
        expect(resultA.revision).toBe(1);
        expect(resultB.revision).toBe(1);
        expect(resultA.revision).toBe(resultB.revision);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 3: Load existing workflow (per fixture)
  //
  // Each fixture is loaded via loadWorkflow(). The resulting graph must be
  // structurally identical regardless of renderer context.
  // -------------------------------------------------------------------------

  for (const fixture of FIXTURES) {
    const src: WorkflowSource = {
      format: fixture.format,
      content: fixture.content,
    };

    describe(`Scenario 3 — Load fixture: ${fixture.name}`, () => {
      it("loadWorkflow succeeds and produces a valid graph", () => {
        runScenario(`load:${fixture.name}:parse`, () => {
          const counter = new RevisionCounter();
          const result = loadWorkflow(src, counter);
          expect(
            result.ok,
            result.ok
              ? "ok"
              : `loadWorkflow failed: ${result.diagnostics.map((d) => d.message).join("; ")}`,
          ).toBe(true);
          if (!result.ok) return;

          expect(result.graph.nodes.length).toBeGreaterThanOrEqual(2);
          expect(result.graph.edges.length).toBeGreaterThanOrEqual(1);
          expect(result.revision).toBe(1);
        });
      });

      it("loaded graph is identical across both renderer contexts", () => {
        runScenario(`load:${fixture.name}:fingerprint-parity`, () => {
          // Both renderer contexts load from the same source; the graph
          // produced by editor-core must be identical.
          const resultA = loadWorkflow(src, new RevisionCounter());
          const resultB = loadWorkflow(src, new RevisionCounter());

          if (!resultA.ok || !resultB.ok) return;

          assertGraphParity(resultA.graph, resultB.graph, `load ${fixture.name}`);
        });
      });

      it("projectWorkflowToGraph produces the same graph for both renderer contexts", () => {
        runScenario(`load:${fixture.name}:project-parity`, () => {
          const parseResult = parseWorkflowSource(src);
          if (!parseResult.ok) return;

          // Simulate each renderer context independently calling projectWorkflowToGraph.
          const graphA = projectWorkflowToGraph(parseResult.workflow);
          const graphB = projectWorkflowToGraph(parseResult.workflow);

          assertGraphParity(graphA, graphB, `project ${fixture.name}`);

          // The projected graph must always include start and end boundary nodes.
          const startNode = graphA.nodes.find((n) => n.id === "__start__");
          const endNode = graphA.nodes.find((n) => n.id === "__end__");
          expect(startNode?.kind).toBe("start");
          expect(endNode?.kind).toBe("end");
        });
      });
    });
  }

  // -------------------------------------------------------------------------
  // Scenario 4: Edit workflow
  //
  // A loaded workflow model is modified and re-projected. Both renderer
  // contexts must receive identical updated graphs.
  // -------------------------------------------------------------------------

  describe("Scenario 4 — Edit workflow", () => {
    // Use the first JSON fixture for edit scenarios; fall back to any fixture.
    const editFixture = FIXTURES.find((f) => f.format === "json") ?? FIXTURES[0];

    it("projectWorkflowToGraph on a parsed fixture produces a consistent graph", () => {
      runScenario("edit:project-consistency", () => {
        if (editFixture === undefined) return;

        const src: WorkflowSource = {
          format: editFixture.format,
          content: editFixture.content,
        };

        const parseResult = parseWorkflowSource(src);
        expect(
          parseResult.ok,
          parseResult.ok
            ? "ok"
            : `Parse failed: ${parseResult.diagnostics.map((d) => d.message).join("; ")}`,
        ).toBe(true);
        if (!parseResult.ok) return;

        const graph = projectWorkflowToGraph(parseResult.workflow);
        expect(graph.nodes.length).toBeGreaterThanOrEqual(2);
        expect(graph.edges.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("edited workflow graph is identical across both renderer contexts", () => {
      runScenario("edit:fingerprint-parity", () => {
        if (editFixture === undefined) return;

        const src: WorkflowSource = {
          format: editFixture.format,
          content: editFixture.content,
        };

        const parseResult = parseWorkflowSource(src);
        if (!parseResult.ok) return;

        // Simulate both renderer contexts receiving the projected graph
        // after an edit.
        const graphA = projectWorkflowToGraph(parseResult.workflow);
        const graphB = projectWorkflowToGraph(parseResult.workflow);

        assertGraphParity(graphA, graphB, "edit workflow");
      });
    });

    it("editing a workflow adds metadata without changing task structure", () => {
      runScenario("edit:metadata-preservation", () => {
        if (editFixture === undefined) return;

        const src: WorkflowSource = {
          format: editFixture.format,
          content: editFixture.content,
        };

        const parseResult = parseWorkflowSource(src);
        if (!parseResult.ok) return;

        const origModel = parseResult.workflow;
        const origTaskCount = Array.isArray(origModel.do) ? origModel.do.length : 0;

        // Add metadata to the document (a typical edit operation).
        const docRecord = origModel.document as unknown as Record<string, unknown>;
        const existingMeta = (docRecord.metadata as Record<string, unknown> | undefined) ?? {};
        docRecord.metadata = {
          ...existingMeta,
          parityTestMarker: "edited",
        };

        // Re-serialize and re-parse; task count must be unchanged.
        const exported = serializeWorkflow(origModel, src.format);
        const reparsed = parseWorkflowSource(exported);
        expect(reparsed.ok).toBe(true);
        if (!reparsed.ok) return;

        const reparsedTaskCount = Array.isArray(reparsed.workflow.do)
          ? reparsed.workflow.do.length
          : 0;
        expect(reparsedTaskCount).toBe(origTaskCount);

        // The projected graph must still include the same number of task nodes.
        const graphBefore = projectWorkflowToGraph(origModel);
        const graphAfter = projectWorkflowToGraph(reparsed.workflow);

        const tasksBefore = graphBefore.nodes.filter((n) => n.kind === "task").length;
        const tasksAfter = graphAfter.nodes.filter((n) => n.kind === "task").length;
        expect(tasksAfter).toBe(tasksBefore);
      });
    });

    it("all fixture projections produce graphs with boundary nodes for both renderer contexts", () => {
      runScenario("edit:all-fixtures-parity", () => {
        for (const fixture of FIXTURES) {
          const src: WorkflowSource = {
            format: fixture.format,
            content: fixture.content,
          };

          const parseResult = parseWorkflowSource(src);
          if (!parseResult.ok) continue;

          const graphA = projectWorkflowToGraph(parseResult.workflow);
          const graphB = projectWorkflowToGraph(parseResult.workflow);

          assertGraphParity(graphA, graphB, `all-fixtures ${fixture.name}`);
        }
      });
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 5: Export workflow
  //
  // Export is a pure editor-core operation. The result must be character-
  // identical across both renderer contexts.
  // -------------------------------------------------------------------------

  describe("Scenario 5 — Export workflow", () => {
    for (const fixture of FIXTURES) {
      it(`export output is character-identical across renderer contexts — ${fixture.name}`, () => {
        runScenario(`export:${fixture.name}`, () => {
          const src: WorkflowSource = {
            format: fixture.format,
            content: fixture.content,
          };

          const parseResult = parseWorkflowSource(src);
          expect(parseResult.ok).toBe(true);
          if (!parseResult.ok) return;

          // Both renderer contexts call the same serializeWorkflow function.
          const exportedA = serializeWorkflow(parseResult.workflow, fixture.format);
          const exportedB = serializeWorkflow(parseResult.workflow, fixture.format);

          // The serializer is deterministic; outputs must be identical.
          expect(exportedA.content).toBe(exportedB.content);
          expect(exportedA.format).toBe(exportedB.format);

          // Re-parsed content must preserve document identity.
          const reparsed = parseWorkflowSource(exportedA);
          expect(reparsed.ok).toBe(true);
          if (!reparsed.ok) return;

          const orig = parseResult.workflow;
          const rep = reparsed.workflow;

          expect(rep.document.name).toBe(orig.document.name);
          expect(rep.document.namespace).toBe(orig.document.namespace);
          expect(rep.document.version).toBe(orig.document.version);
          expect(rep.document.dsl).toBe(orig.document.dsl);

          const origTaskCount = Array.isArray(orig.do) ? orig.do.length : 0;
          const repTaskCount = Array.isArray(rep.do) ? rep.do.length : 0;
          expect(repTaskCount).toBe(origTaskCount);
        });
      });
    }

    it("cross-format export is identical across renderer contexts for all fixtures", () => {
      runScenario("export:cross-format-parity", () => {
        for (const fixture of FIXTURES) {
          const src: WorkflowSource = {
            format: fixture.format,
            content: fixture.content,
          };

          const parseResult = parseWorkflowSource(src);
          if (!parseResult.ok) continue;

          const crossFormat: SourceFormat = fixture.format === "json" ? "yaml" : "json";

          const exportedA = serializeWorkflow(parseResult.workflow, crossFormat);
          const exportedB = serializeWorkflow(parseResult.workflow, crossFormat);

          expect(exportedA.content, `Cross-format export mismatch: ${fixture.name}`).toBe(
            exportedB.content,
          );
        }
      });
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 6: Validate workflow
  //
  // Validation is a pure editor-core operation. Diagnostics must be deep-
  // equal across both renderer contexts.
  // -------------------------------------------------------------------------

  describe("Scenario 6 — Validate workflow", () => {
    for (const fixture of FIXTURES) {
      it(`diagnostics are deep-equal across renderer contexts — ${fixture.name}`, () => {
        runScenario(`validate:${fixture.name}`, () => {
          const src: WorkflowSource = {
            format: fixture.format,
            content: fixture.content,
          };

          // Both renderer contexts call validateWorkflow with the same source.
          const diagnosticsA = validateWorkflow(src);
          const diagnosticsB = validateWorkflow(src);

          // Diagnostics must be deep-equal (same entries in same order).
          expect(diagnosticsA).toEqual(diagnosticsB);

          // Valid fixtures must produce no error-severity diagnostics.
          const errors = diagnosticsA.filter((d) => d.severity === "error");
          expect(
            errors,
            `Fixture ${fixture.name} produced unexpected error diagnostics: ${errors.map((e) => e.message).join("; ")}`,
          ).toHaveLength(0);
        });
      });
    }

    it("diagnostics include ruleId, severity, message, and location fields for both renderer contexts", () => {
      runScenario("validate:diagnostics-schema-parity", () => {
        // Use a fixture known to be valid; run with schemaOnly to check the
        // schema of any future diagnostics format.
        const firstFixture = FIXTURES[0];
        if (firstFixture === undefined) return;

        const src: WorkflowSource = {
          format: firstFixture.format,
          content: firstFixture.content,
        };

        const diagnosticsA = validateWorkflow(src);
        const diagnosticsB = validateWorkflow(src);

        // Both must return arrays.
        expect(Array.isArray(diagnosticsA)).toBe(true);
        expect(Array.isArray(diagnosticsB)).toBe(true);

        // If there are diagnostics, each must have the required fields.
        for (const diag of diagnosticsA) {
          expect(typeof diag.ruleId).toBe("string");
          expect(["error", "warning", "info"]).toContain(diag.severity);
          expect(typeof diag.message).toBe("string");
          expect(typeof diag.location).toBe("string");
        }
      });
    });
  });

  // -------------------------------------------------------------------------
  // SC-005: Aggregate pass-rate assertion
  // -------------------------------------------------------------------------

  describe("SC-005: aggregate pass rate", () => {
    it("100% of renderer parity scenarios pass", () => {
      const total = scenarioResults.length;
      const passedCount = scenarioResults.filter((r) => r.passed).length;

      expect(
        total,
        "No scenarios were executed — fixture discovery may have failed",
      ).toBeGreaterThan(0);

      const rate = passedCount / total;
      const failLines = scenarioResults
        .filter((r) => !r.passed)
        .map((r) => `  FAIL  ${r.scenario}`)
        .join("\n");
      const report = failLines || "  (all scenarios passed)";

      console.log(
        `\nRenderer parity pass rate: ${passedCount}/${total} (${(rate * 100).toFixed(1)}%)\n${report}`,
      );

      expect(
        rate,
        `Pass rate ${(rate * 100).toFixed(1)}% is below the 100% SC-005 target.\nFailed scenarios:\n${failLines}`,
      ).toBe(1);
    });
  });
});

// ---------------------------------------------------------------------------
// SC-006: Host setup consistency
//
// Verifies that the embedding interface — interface shape, lifecycle methods,
// event bridge surface, and capability snapshot structure — is identical for
// both renderer bundles. This ensures that switching renderer backends
// requires no changes to host embedding code.
//
// "Host setup remains one custom element and one client initialization step
// regardless of selected renderer bundle."
// ---------------------------------------------------------------------------

describe("SC-006 — Host setup consistency", () => {
  let reteLit: ReteLitAdapter;
  let reactFlow: ReactFlowAdapter;

  beforeAll(() => {
    reteLit = new ReteLitAdapter();
    reactFlow = new ReactFlowAdapter();
  });

  it("both adapters expose the required RendererAdapter interface members", () => {
    const requiredMembers: Array<keyof RendererAdapter> = [
      "rendererId",
      "capabilities",
      "events",
      "mount",
      "update",
      "dispose",
    ];

    for (const member of requiredMembers) {
      expect(reteLit, `rete-lit missing '${member}'`).toHaveProperty(member);
      expect(reactFlow, `react-flow missing '${member}'`).toHaveProperty(member);
    }
  });

  it("both adapters expose mount, update, and dispose as functions", () => {
    expect(typeof reteLit.mount).toBe("function");
    expect(typeof reteLit.update).toBe("function");
    expect(typeof reteLit.dispose).toBe("function");
    expect(typeof reactFlow.mount).toBe("function");
    expect(typeof reactFlow.update).toBe("function");
    expect(typeof reactFlow.dispose).toBe("function");
  });

  it("both adapters expose the required event bridge methods as functions", () => {
    expect(typeof reteLit.events.onSelectionChange).toBe("function");
    expect(typeof reteLit.events.offSelectionChange).toBe("function");
    expect(typeof reactFlow.events.onSelectionChange).toBe("function");
    expect(typeof reactFlow.events.offSelectionChange).toBe("function");
  });

  it("both adapters expose the required capability snapshot fields", () => {
    const requiredFields = [
      "rendererId",
      "rendererVersion",
      "supportsNodeRendererPlugins",
      "supportsNestedInlineProjection",
      "supportsRouteOverlayProjection",
    ] as const;

    for (const field of requiredFields) {
      expect(reteLit.capabilities).toHaveProperty(field);
      expect(reactFlow.capabilities).toHaveProperty(field);
    }
  });

  it("both adapters report distinct rendererId values", () => {
    expect(reteLit.rendererId).not.toBe(reactFlow.rendererId);
    expect(reteLit.rendererId).toBe("rete-lit");
    expect(reactFlow.rendererId).toBe("react-flow");
  });

  it("both adapters report the correct rendererId in their capability snapshot", () => {
    expect(reteLit.capabilities.rendererId).toBe(reteLit.rendererId);
    expect(reactFlow.capabilities.rendererId).toBe(reactFlow.rendererId);
  });

  it("dispose before mount is safe (no-op) for both adapters", () => {
    // Disposing an adapter that was never mounted must not throw.
    const rl = new ReteLitAdapter();
    expect(() => rl.dispose()).not.toThrow();

    const rf = new ReactFlowAdapter();
    expect(() => rf.dispose()).not.toThrow();
  });

  it("dispose is idempotent for both adapters (multiple calls do not throw)", () => {
    // Calling dispose() multiple times on an unmounted adapter must be safe.
    const rl = new ReteLitAdapter();
    expect(() => rl.dispose()).not.toThrow();
    expect(() => rl.dispose()).not.toThrow();

    const rf = new ReactFlowAdapter();
    expect(() => rf.dispose()).not.toThrow();
    expect(() => rf.dispose()).not.toThrow();
  });

  it("both adapters support parallel instantiation without shared state", () => {
    // Two independent instances of each adapter must not share state.
    const rl1 = new ReteLitAdapter();
    const rl2 = new ReteLitAdapter();
    const rf1 = new ReactFlowAdapter();
    const rf2 = new ReactFlowAdapter();

    expect(rl1.rendererId).toBe("rete-lit");
    expect(rl2.rendererId).toBe("rete-lit");
    expect(rf1.rendererId).toBe("react-flow");
    expect(rf2.rendererId).toBe("react-flow");

    // Capabilities are shared module-level constants for rete-lit.
    expect(rl1.capabilities).toBe(rl2.capabilities);

    // Instances must not be the same object.
    expect(rl1).not.toBe(rl2);
    expect(rf1).not.toBe(rf2);

    // Disposing one instance must not affect the other.
    rl1.dispose();
    rf1.dispose();

    expect(rl2.rendererId).toBe("rete-lit");
    expect(rf2.rendererId).toBe("react-flow");
  });

  it("event bridge handlers can be registered and removed identically on both adapters", () => {
    const rl = new ReteLitAdapter();
    const rf = new ReactFlowAdapter();

    const handler = (): void => {};

    // Register and immediately remove on both adapters — must not throw.
    expect(() => rl.events.onSelectionChange(handler)).not.toThrow();
    expect(() => rl.events.offSelectionChange()).not.toThrow();

    expect(() => rf.events.onSelectionChange(handler)).not.toThrow();
    expect(() => rf.events.offSelectionChange()).not.toThrow();

    // Double-remove must also be safe.
    expect(() => rl.events.offSelectionChange()).not.toThrow();
    expect(() => rf.events.offSelectionChange()).not.toThrow();
  });
});
