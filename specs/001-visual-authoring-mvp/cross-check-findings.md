# Spec/Implementation Cross-Check Findings — Task #95

**Date**: 2026-03-06
**Branch**: `task/95-task-specimplementation-cross-check-verify`
**Depends on**: Task #93 (build), Task #94 (test results)
**Test baseline**: 356 vitest tests across 17 files — all PASS (from `specs/001-visual-authoring-mvp/test-suite-findings.md`)

---

## Methodology

1. Read `specs/001-visual-authoring-mvp/spec.md` in full; extracted all 18 FRs and 7 SCs.
2. Located implementing source files for each FR by reading all package source files.
3. Cross-referenced SC coverage with T094 test results (`test-suite-findings.md`) and the relevant test files.
4. Flagged any FR or SC that is unimplemented or only partially implemented.

---

## FR Cross-Check (FR-001 – FR-018)

### FR-001 — System MUST initialize a new workflow with connected start and end graph nodes

**Status**: CONFIRMED IMPLEMENTED

**Evidence**:
- `packages/editor-core/src/graph/bootstrap.ts` — `bootstrapWorkflowGraph()` returns a `WorkflowGraph` with exactly 2 nodes (`__start__`, `__end__`) and 1 edge.
- Tests: `packages/editor-core/tests/graph/bootstrap.test.ts` (7 tests, all PASS).
- Quickstart scenario 1 integration tests in `tests/integration/quickstart-scenarios.spec.ts` (5 tests, all PASS).

---

### FR-002 — System MUST load existing workflow source in JSON and YAML

**Status**: CONFIRMED IMPLEMENTED

**Evidence**:
- `packages/editor-core/src/source/parser.ts` — `parseWorkflowSource()` accepts both JSON and YAML via the Serverless Workflow SDK `Classes.Workflow.deserialize()`.
- `packages/editor-core/src/commands/load-workflow.ts` — `loadWorkflow()` orchestrates parse + graph bootstrap + revision increment.
- Tests: `packages/editor-core/tests/source/source-service.test.ts` (16 tests, all PASS); `tests/integration/workflow-roundtrip.spec.ts` (19 tests, all PASS).

---

### FR-003 — System MUST provide insertion actions between connected nodes

**Status**: CONFIRMED IMPLEMENTED

**Evidence**:
- `packages/editor-web-component/src/graph/insertion-ui.ts` — `InsertionUI` class attaches a "+" affordance button to every edge element; click/keyboard activation opens the task type menu.
- `packages/editor-core/src/commands/insert-task.ts` — `insertTask()` performs the edge-split command.
- Tests: `packages/editor-web-component/tests/graph/insertion-ui.test.ts` (21 tests, all PASS).

---

### FR-004 — System MUST expose the full supported task insertion menu for MVP

**Status**: CONFIRMED IMPLEMENTED

**Evidence**:
- `packages/editor-web-component/src/graph/insertion-ui.ts` — `MVP_TASK_TYPES` constant lists all 10 Serverless Workflow DSL task types: `call`, `do`, `fork`, `emit`, `listen`, `run`, `set`, `switch`, `try`, `wait`.
- Source comment at line 29 explicitly references FR-004.
- Tests: `packages/editor-web-component/tests/graph/insertion-ui.test.ts` — menu population verified.

---

### FR-005 — System MUST focus and select inserted tasks immediately after insertion

**Status**: CONFIRMED IMPLEMENTED

**Evidence**:
- `packages/editor-web-component/src/graph/insertion-ui.ts` — `commitInsertion()` calls `this.bridge.emitSelectionChanged({ kind: "node", nodeId: result.nodeId })` (selection) and `this.focusNode?.(result.nodeId)` (DOM focus).
- Source comments at lines 404–436 explicitly reference FR-005.
- Tests: `packages/editor-web-component/tests/graph/insertion-ui.test.ts` — focus callback and selection event emission verified.

---

### FR-006 — System MUST switch property editing context based on current selection

**Status**: CONFIRMED IMPLEMENTED

**Evidence**:
- `packages/editor-web-component/src/panel/panel-controller.ts` — `PanelController` listens for `editorSelectionChanged` events and transitions between `WorkflowPanelContext`, `NodePanelContext`, and `EdgePanelContext`.
- ARIA live region update on context change confirmed.
- Tests: `packages/editor-web-component/tests/events/bridge.test.ts` (15 tests, all PASS) — selection events that feed into panel context transitions are verified.

---

### FR-007 — System MUST support export to JSON or YAML source

**Status**: CONFIRMED IMPLEMENTED

**Evidence**:
- `packages/editor-core/src/source/serializer.ts` — `serializeWorkflow(model, format)` returns a `WorkflowSource` in the requested format via the SDK `Classes.Workflow.serialize()`.
- `packages/editor-host-client/src/export.ts` — exposes the export action at the host client level.
- Tests: `packages/editor-core/tests/source/source-service.test.ts`; round-trip tests in `tests/integration/workflow-roundtrip.spec.ts`.

---

### FR-008 — System MUST preserve workflow semantics and structural content during load/edit/export

**Status**: CONFIRMED IMPLEMENTED

**Evidence**:
- `packages/editor-core/src/graph/project.ts` — `projectWorkflowToGraph()` maps workflow tasks to graph nodes preserving `taskReference` (task name) and `then` flow directives.
- Round-trip: `parseWorkflowSource` → edit → `serializeWorkflow` → `parseWorkflowSource` re-parses cleanly.
- Tests: `tests/integration/workflow-roundtrip.spec.ts` (19 tests, all PASS) — semantic and structural round-trip for all baseline fixtures.

---

### FR-009 — System MUST run debounced live validation on edits

**Status**: CONFIRMED IMPLEMENTED

**Evidence**:
- `packages/editor-core/src/validation/live-validator.ts` — `LiveValidator` class with configurable debounce (default 500 ms, matching SC-002 target).
- Tests: `packages/editor-core/tests/validation/live-validator.test.ts` (12 tests, all PASS); latency measurement in `tests/integration/validation-latency.spec.ts` (23 tests, all PASS).

---

### FR-010 — System MUST provide explicit full validation on demand

**Status**: CONFIRMED IMPLEMENTED

**Evidence**:
- `packages/editor-core/src/validation/full-validator.ts` — `validateWorkflow(source, options?)` runs schema + semantic validation synchronously.
- Semantic checks (duplicate task names) implemented in `runSemanticChecks()`.
- Tests: `packages/editor-core/tests/validation/full-validator.test.ts` (19 tests, all PASS).

---

### FR-011 — System MUST emit structured diagnostics events for host integrations

**Status**: CONFIRMED IMPLEMENTED

**Evidence**:
- `packages/editor-web-component/src/events/bridge.ts` — `EventBridge.emitDiagnosticsChanged()` dispatches `editorDiagnosticsChanged` CustomEvent with typed `EditorDiagnosticsChangedPayload`.
- `packages/editor-web-component/src/events/diagnostics.ts` — `DiagnosticsEmitter` deduplicates and routes diagnostics from live/full validators to the bridge.
- Tests: `packages/editor-web-component/tests/events/diagnostics.test.ts` (14 tests); `tests/contract/editor-diagnostics.contract.spec.ts` (25 tests, all PASS).

---

### FR-012 — System MUST avoid editor-initiated network calls during authoring flows

**Status**: CONFIRMED IMPLEMENTED

**Evidence**:
- Parser and serializer use the Serverless Workflow SDK in pure in-process mode; no `fetch` or `XHR` calls.
- Constitution principle "No runtime network calls from editor core" is explicitly enforced.
- Tests: `tests/integration/quickstart-scenarios.spec.ts` — Scenario 5 (Privacy Guardrail) spies on `globalThis.fetch` across all editor operations (bootstrap, insert, parse, serialize, validate) and asserts it is never called (6 tests, all PASS).

---

### FR-013 — System MUST support two renderer backends: `rete-lit` and `react-flow`

**Status**: CONFIRMED IMPLEMENTED

**Evidence**:
- `packages/editor-renderer-rete-lit/src/rete-lit-adapter.ts` — `ReteLitAdapter` implements `RendererAdapter` using Rete.js v2 + `@retejs/lit-plugin`.
- `packages/editor-renderer-react-flow/src/react-flow-adapter.ts` — `ReactFlowAdapter` implements `RendererAdapter` using `@xyflow/react`.
- Both implement the `mount` / `update` / `dispose` lifecycle and the `RendererEventBridge` selection bridge.
- Tests: `tests/integration/renderer-mvp-parity.spec.ts` (53 tests, all PASS); `tests/contract/renderer-capabilities.contract.spec.ts` (32 tests, all PASS).

---

### FR-014 — System MUST expose active renderer identity in host capability payloads

**Status**: CONFIRMED IMPLEMENTED

**Evidence**:
- `packages/editor-host-client/src/contracts/capabilities.ts` — `CapabilitySnapshot` has `rendererId: RendererId` field; `createCapabilitySnapshot()` propagates the renderer's `rendererId` to the top-level snapshot.
- `packages/editor-host-client/src/rete-lit.ts` and `react-flow.ts` — each bundle entry point calls `createCapabilitySnapshot()` once at module evaluation time with the concrete adapter's capabilities; `getCapabilities()` returns the frozen result.
- Tests: T030 in `tests/contract/renderer-capabilities.contract.spec.ts` — `rendererId` field validated for both bundles (32 tests, all PASS).

---

### FR-015 — System MUST preserve create/load/edit/export/validate behavior across both renderer bundles

**Status**: CONFIRMED IMPLEMENTED

**Evidence**:
- `tests/integration/renderer-mvp-parity.spec.ts` — explicitly tests behavioral equivalence for create, insert, load, edit, export, and validate flows across both renderer backends. Graph data structures, export outputs, and diagnostics collections are asserted character-/deep-identical across both renderer contexts (53 tests, all PASS).

---

### FR-016 — Repository bootstrap MUST pin the runtime and package manager to Node.js 24 LTS and `pnpm@10.30.3`

**Status**: CONFIRMED IMPLEMENTED

**Evidence**:
- `package.json` (root):
  ```json
  "packageManager": "pnpm@10.30.3",
  "engines": { "node": ">=24.0.0", "pnpm": ">=10.30.3" }
  ```

---

### FR-017 — Repository tooling MUST use `@biomejs/biome@2.4.5` as the single formatter and linter

**Status**: CONFIRMED IMPLEMENTED

**Evidence**:
- `package.json` devDependencies: `"@biomejs/biome": "2.4.5"`.
- `biome.json` uses `"$schema": "https://biomejs.dev/schemas/2.4.5/schema.json"` confirming the pinned version.
- Root `package.json` `scripts.lint` and `scripts.format` both delegate to `biome`.

---

### FR-018 — Repository test tooling MUST use `vitest@4.0.18` and `@playwright/test@1.58.2`

**Status**: CONFIRMED IMPLEMENTED

**Evidence**:
- `package.json` devDependencies: `"vitest": "4.0.18"` and `"@playwright/test": "1.58.2"`.
- `vitest.config.ts` workspace drives all unit, contract, and integration test projects.
- `playwright.config.ts` drives e2e tests.

---

## SC Cross-Check (SC-001 – SC-007)

### SC-001 — A new user can create and export a valid workflow in under 10 minutes

**Status**: PARTIALLY COVERED

**Evidence**:
- The technical path (bootstrap → insert task → serialize to JSON/YAML) is implemented and confirmed by unit and integration tests.
- `tests/integration/quickstart-scenarios.spec.ts` — Scenarios 1 and 2 cover the create-and-export mechanics.
- **Gap**: No e2e test measures or asserts actual UX time-to-complete. The Playwright e2e suite (`tests/e2e/accessibility-mvp.spec.ts`) was not run due to requiring a live server (Finding F001 from T094). SC-001 is a UX/usability criterion; passing integration tests confirm the code path works but cannot substitute for an end-to-end UX timing assertion.

**Suggested resolution**: Run `tests/e2e/accessibility-mvp.spec.ts` against a `pnpm build && pnpm preview` serve. If the scenario is not covered by that file, add a Playwright test that walks through the create-and-export path. Track as a separate follow-up issue if e2e automation is required.

---

### SC-002 — At least 95% of normal edit actions show validation feedback within 500 ms after debounce

**Status**: CONFIRMED COVERED

**Evidence**:
- `tests/integration/validation-latency.spec.ts` (23 tests, all PASS) — measures post-debounce validation latency and asserts p95 < 500 ms for workflows with up to 50 tasks (small, medium, large).
- `LiveValidator` default `debounceMs` is 500 ms (confirmed in source).

---

### SC-003 — Round-trip editing preserves semantic and structural correctness for at least 95% of baseline fixture workflows

**Status**: CONFIRMED COVERED

**Evidence**:
- `tests/integration/workflow-roundtrip.spec.ts` (19 tests, all PASS) — tests parse → edit → serialize → re-parse for all baseline fixtures in `tests/fixtures/valid/`.
- `tests/integration/quickstart-scenarios.spec.ts` — Scenario 3 (Load Existing YAML) includes cross-format round-trip and task count preservation (6 tests, all PASS).

---

### SC-004 — Host embedding setup requires no more than one custom element and one client initialization step

**Status**: CONFIRMED COVERED

**Evidence**:
- `packages/editor-host-client` exports `getCapabilities()` as the single client initialization step (one function call).
- The web component is a single custom element (`packages/editor-web-component`).
- `tests/integration/renderer-mvp-parity.spec.ts` — verifies the lifecycle contract (mount → update → dispose) follows a one-step setup pattern for both renderer bundles (53 tests, all PASS).
- **Note**: Full HTML-level embedding (registering the custom element in a page) is not asserted by an e2e test due to the Playwright server requirement. Integration tests confirm the contract surface is correct.

---

### SC-005 — Renderer parity tests pass for 100% of MVP baseline fixtures across `rete-lit` and `react-flow` bundles

**Status**: CONFIRMED COVERED

**Evidence**:
- `tests/integration/renderer-mvp-parity.spec.ts` (53 tests, all PASS) — asserts character-identical export output and deep-equal diagnostics across both renderer contexts for all MVP scenarios.
- `tests/contract/renderer-capabilities.contract.spec.ts` (32 tests, all PASS) — T030 validates `RendererCapabilitySnapshot` field correctness and backward-compatible expansion for both adapters.

---

### SC-006 — Host setup remains one custom element and one client initialization step regardless of selected renderer bundle

**Status**: CONFIRMED COVERED

**Evidence**:
- Both `packages/editor-host-client/src/rete-lit.ts` and `react-flow.ts` expose an identical `getCapabilities()` signature.
- `tests/integration/renderer-mvp-parity.spec.ts` — verifies identical setup pattern across both renderer bundles (53 tests, all PASS).

---

### SC-007 — A new contributor can bootstrap the repository and run lint, unit/integration tests, and e2e smoke checks in under 15 minutes

**Status**: PARTIALLY COVERED

**Evidence**:
- Toolchain fully pinned: Node.js ≥24, pnpm 10.30.3, biome 2.4.5, vitest 4.0.18, playwright 1.58.2 (FR-016, FR-017, FR-018 all confirmed).
- `pnpm install` + `npx vitest run` executes all 356 unit/contract/integration tests successfully.
- `biome check .` is available for lint.
- **Gap**: The e2e smoke check (Playwright) requires `pnpm build && pnpm preview` before `npx playwright test`. There is no `webServer` configuration in `playwright.config.ts` to automate this step (Finding F001 from T094). A new contributor would need to know to start the dev server manually, which adds friction and may exceed the 15-minute target on slower machines.

**Suggested resolution**: Add `webServer` configuration to `playwright.config.ts` (or a `pnpm test:e2e` script that builds, serves, and runs Playwright) so the e2e smoke check is a single command. This is a low-effort improvement. Track as a separate follow-up issue or implement in a follow-on task.

---

## Summary

### FR Summary

| ID | Title | Status |
|----|-------|--------|
| FR-001 | Bootstrap start/end graph | CONFIRMED |
| FR-002 | Load JSON and YAML | CONFIRMED |
| FR-003 | Insertion actions between nodes | CONFIRMED |
| FR-004 | Full task insertion menu | CONFIRMED |
| FR-005 | Focus/select inserted task | CONFIRMED |
| FR-006 | Selection-driven panel context | CONFIRMED |
| FR-007 | Export to JSON or YAML | CONFIRMED |
| FR-008 | Semantic/structural preservation | CONFIRMED |
| FR-009 | Debounced live validation | CONFIRMED |
| FR-010 | Explicit full validation | CONFIRMED |
| FR-011 | Structured diagnostics events | CONFIRMED |
| FR-012 | No editor network calls | CONFIRMED |
| FR-013 | Two renderer backends | CONFIRMED |
| FR-014 | Renderer identity in capability payloads | CONFIRMED |
| FR-015 | Behavior parity across renderer bundles | CONFIRMED |
| FR-016 | Runtime/package manager pinning | CONFIRMED |
| FR-017 | Biome 2.4.5 linter/formatter | CONFIRMED |
| FR-018 | Vitest + Playwright test tooling pins | CONFIRMED |

**All 18 FRs are confirmed implemented.**

### SC Summary

| ID | Criterion | Status |
|----|-----------|--------|
| SC-001 | Create+export in <10 min | PARTIAL — e2e not run |
| SC-002 | Validation feedback <500ms at p95 | CONFIRMED |
| SC-003 | Round-trip correctness ≥95% of fixtures | CONFIRMED |
| SC-004 | One element + one init step | CONFIRMED |
| SC-005 | 100% renderer parity | CONFIRMED |
| SC-006 | One-step setup per renderer bundle | CONFIRMED |
| SC-007 | Contributor bootstrap <15 min | PARTIAL — e2e requires manual server start |

**5 of 7 SCs are fully covered by passing tests. 2 SCs (SC-001, SC-007) are partially covered; both share the same root gap: Playwright e2e tests require a live dev server that is not started automatically.**

### Gaps Requiring Action

#### GAP-001 — E2E tests not automatable without build+serve step (SC-001, SC-007)

**Requirement IDs affected**: SC-001, SC-007

**What is missing**: `playwright.config.ts` does not configure `webServer`, so `npx playwright test` requires the developer to manually run `pnpm build && pnpm preview` first. SC-001 (UX timing) and SC-007 (contributor onboarding) cannot be fully verified without a running e2e suite.

**Suggested resolution**: Add `webServer: { command: 'pnpm build && pnpm preview', url: 'http://localhost:4173' }` to `playwright.config.ts`, or create a top-level `pnpm test:e2e` script that chains the steps. This is a self-contained change that can be implemented now or tracked as a child issue.

---

*This document produced for Task #95 as the cross-check deliverable.*
