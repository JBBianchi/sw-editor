# Tasks: Visual Authoring MVP

**Input**: Design documents from `specs/001-visual-authoring-mvp/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Create package layout for core, web component, and host client modules in `packages/`
- [x] T002 Configure baseline toolchain in repo config files (Node.js 24 LTS, `pnpm@10.30.3`, `@biomejs/biome@2.4.5`, `vitest@4.0.18`, `@playwright/test@1.58.2`)
- [x] T003 [P] Add fixtures for JSON and YAML workflow sources in `tests/fixtures/`

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 Implement source parse/serialize service in `packages/editor-core/src/source/`
- [x] T005 [P] Implement diagnostics model and event payload types in `packages/editor-core/src/diagnostics/`
- [x] T006 [P] Implement host contract surface types in `packages/editor-host-client/src/contracts/`
- [x] T007 Implement monotonic revision tracking in `packages/editor-core/src/state/`
- [x] T008 Implement event bridge from core to web component in `packages/editor-web-component/src/events/`

## Phase 2b: Renderer Foundation (Blocking Prerequisites)

- [x] T009 Define renderer abstraction contract (`mount`, `update`, `dispose`, selection/event bridge) in `packages/editor-renderer-contract/src/renderer-adapter.ts`
- [x] T010 [P] Implement `rete-lit` adapter against renderer contract in `packages/editor-renderer-rete-lit/src/rete-lit-adapter.ts`
- [x] T011 [P] Implement `react-flow` adapter against renderer contract in `packages/editor-renderer-react-flow/src/react-flow-adapter.ts`
- [x] T012 Wire bundle-level renderer selection and capability exposure in `packages/editor-host-client/src/contracts/capabilities.ts`

## Phase 3: User Story 1 - Create A Valid Workflow Visually (Priority: P1)

**Goal**: Author workflows from blank state using insertion and property editing.

**Independent Test**: Build a new workflow visually and export valid source.

- [x] T013 [P] [US1] Add start/end synthetic node bootstrap logic in `packages/editor-core/src/graph/bootstrap.ts`
- [x] T014 [P] [US1] Add insertion command handling in `packages/editor-core/src/commands/insert-task.ts`
- [x] T015 [US1] Wire insertion affordance and focus behavior in `packages/editor-web-component/src/graph/insertion-ui.ts`
- [x] T016 [US1] Implement selection-driven property panel switching in `packages/editor-web-component/src/panel/panel-controller.ts`
- [x] T017 [US1] Add export action and format selection in `packages/editor-host-client/src/export.ts`

## Phase 4: User Story 2 - Load And Continue Editing Existing Source (Priority: P2)

**Goal**: Load JSON/YAML workflows and continue editing without semantic loss.

**Independent Test**: Load fixtures, edit, and export equivalent source.

- [x] T018 [P] [US2] Implement load workflow command in `packages/editor-core/src/commands/load-workflow.ts`
- [x] T019 [P] [US2] Map loaded model to graph projection in `packages/editor-core/src/graph/project.ts`
- [x] T020 [US2] Wire load API on web component host surface in `packages/editor-web-component/src/api/load.ts`
- [x] T021 [US2] Add round-trip integration tests in `tests/integration/workflow-roundtrip.spec.ts`

## Phase 5: User Story 3 - Get Immediate Validation Feedback (Priority: P3)

**Goal**: Emit and render diagnostics for live and explicit validation.

**Independent Test**: Invalid edits produce expected diagnostics payloads and UI indicators.

- [x] T022 [P] [US3] Implement debounced validation trigger in `packages/editor-core/src/validation/live-validator.ts`
- [x] T023 [P] [US3] Implement explicit full validation command in `packages/editor-core/src/validation/full-validator.ts`
- [x] T024 [US3] Implement diagnostics event payload emission in `packages/editor-web-component/src/events/diagnostics.ts`
- [x] T025 [US3] Implement diagnostics UI mapping and fallback behavior in `packages/editor-web-component/src/diagnostics/rendering.ts`
- [x] T026 [US3] Add contract tests for diagnostics payloads in `tests/contract/editor-diagnostics.contract.spec.ts`

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T027 [P] Add keyboard and screen-reader checks for core flows in `tests/e2e/accessibility-mvp.spec.ts`
- [x] T028 [P] Add performance measurement harness for validation latency in `tests/integration/validation-latency.spec.ts`
- [x] T029 Run quickstart scenarios from `specs/001-visual-authoring-mvp/quickstart.md` and capture results
- [x] T030 [P] Add renderer-matrix contract tests for `getCapabilities()` payload in `tests/contract/renderer-capabilities.contract.spec.ts`
- [x] T031 [P] Add renderer-matrix integration tests for create/load/edit/export/validate parity in `tests/integration/renderer-mvp-parity.spec.ts`

## Phase 7: Gap Resolution (Post-Audit)

- [x] T032 Fix all biome lint and format violations across codebase (`pnpm biome check .` exits clean)
- [x] T033 Document and triage all gaps from audit tasks #94, #95, #96; file out-of-scope items as child issues
- [x] T034 [OUT-OF-SCOPE #106] Create demo HTML harness and add `webServer` to `playwright.config.ts` to automate Playwright e2e (GAP-001 / F001 — SC-001, SC-007) — completed in tasks #141 + #126
- [x] T035 [OUT-OF-SCOPE #107] Add `tests/e2e/quickstart-scenarios.spec.ts` Playwright counterpart for quickstart scenarios (Finding F002) — Scenario 3 implemented with load affordance in demo harness and passing e2e assertions
- [x] T036 [OUT-OF-SCOPE #108] Add package-level unit tests for `packages/editor-host-client/` (Finding F003) — 59 tests passing across capabilities.spec.ts, methods.spec.ts, export.spec.ts (#133, #134, #135)

## Phase 8: Example Applications (Phase C)

**Goal**: Provide runnable integration examples demonstrating host-client embedding patterns.

- [x] T037 Add `example/vanilla-js/` integration demo: load/export workflow via host-client API (`example/vanilla-js/index.html`, `main.ts`, `vite.config.ts`, `package.json`)
- [x] T038 Add `example/host-events/` integration demo: event subscription and capability query patterns (`example/host-events/index.html`, `main.ts`, `vite.config.ts`, `package.json`)
- [x] T039 Add `example/README.md` documenting both example apps and how to run them
- [x] T040 Add `example/playwright.config.ts` with `webServer` entries for `vanilla-js` (port 5174) and `host-events` (port 5175)

## Phase 9: Example Playwright E2E Coverage (Phase D)

**Goal**: Automate acceptance verification for both example apps using Playwright.

- [x] T041 Add `example/tests/vanilla-js.spec.ts` — Playwright e2e tests covering page load, workflow load, and JSON/YAML export flows (US2 Scenario 2, SC-003)
- [x] T042 Add `example/tests/host-events.spec.ts` — Playwright e2e tests covering diagnostics events, capability query, and clear-log flows (US3 Scenario 2, SC-002)

## Phase 10: Final Sync (Task #100)

**Goal**: Confirm complete acceptance coverage and update all spec artifacts.

- [x] T043 Update `specs/001-visual-authoring-mvp/tasks.md` with all Phase 8–9 entries and confirm `[x]`/`[ ]` state for all tasks
- [x] T044 Update `specs/README.md` to reflect example directory and current test coverage status
- [x] T045 Map every acceptance scenario in `spec.md` to at least one automated test (see coverage table below)

### Acceptance Scenario Coverage

| Scenario | Test File(s) |
|----------|-------------|
| US1-S1: new workflow → start/end nodes | `tests/integration/quickstart-scenarios.spec.ts` (Scenario 1); `tests/e2e/accessibility-mvp.spec.ts` (new-workflow keyboard tests) |
| US1-S2: insertion affordance → task inserted between nodes | `tests/integration/quickstart-scenarios.spec.ts` (Scenario 2); `tests/e2e/accessibility-mvp.spec.ts` (task insertion keyboard tests) |
| US1-S3: edit task properties → workflow source updated | `tests/integration/quickstart-scenarios.spec.ts` (Scenario 2 — revision tracking); `tests/integration/workflow-roundtrip.spec.ts` |
| US2-S1: load JSON/YAML → graph and panel reflect structure | `tests/integration/quickstart-scenarios.spec.ts` (Scenario 3); `tests/integration/workflow-roundtrip.spec.ts` |
| US2-S2: visual edits → export returns updated source | `tests/integration/workflow-roundtrip.spec.ts`; `example/tests/vanilla-js.spec.ts` (export as JSON/YAML) |
| US3-S1: invalid input → debounce → diagnostics update | `tests/integration/quickstart-scenarios.spec.ts` (Scenario 4); `tests/contract/editor-diagnostics.contract.spec.ts` |
| US3-S2: explicit validation → full diagnostics emitted | `tests/integration/quickstart-scenarios.spec.ts` (Scenario 4 — full validator); `tests/contract/editor-diagnostics.contract.spec.ts` |
