# Tasks: Nested Tasks UX

**Input**: Design documents from `specs/002-nested-tasks-ux/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Add nested workflow fixtures in `tests/fixtures/nested/`
- [ ] T002 [P] Add scope-path utility test scaffolding in `packages/editor-core/tests/nesting/`

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T003 Implement scope-path derivation utilities in `packages/editor-core/src/nesting/scope-path.ts`
- [ ] T004 [P] Implement nested graph projection primitives in `packages/editor-core/src/nesting/projection.ts`
- [ ] T005 [P] Implement nested serialization guards in `packages/editor-core/src/nesting/serialize.ts`

## Phase 3: User Story 1 - Create Nested Task Structures (Priority: P1)

**Goal**: Create and edit nested task structures.

**Independent Test**: Author nested do/for workflows and export valid source.

- [ ] T006 [P] [US1] Implement nested insertion commands in `packages/editor-core/src/commands/nested-insert.ts`
- [ ] T007 [US1] Add nested insertion UI flows in `packages/editor-web-component/src/nesting/nested-insert-ui.ts`
- [ ] T008 [US1] Add integration tests for nested create/edit/export in `tests/integration/nested-authoring.spec.ts`

## Phase 4: User Story 2 - Understand Current Context While Editing (Priority: P2)

**Goal**: Surface clear root vs nested context in panel and graph.

**Independent Test**: Scope context remains accurate through selection changes.

- [ ] T009 [P] [US2] Implement scope context state in `packages/editor-web-component/src/nesting/scope-context.ts`
- [ ] T010 [US2] Render context markers in panel header and graph overlays in `packages/editor-web-component/src/nesting/context-markers.ts`
- [ ] T011 [US2] Add e2e tests for scope context cues in `tests/e2e/nested-context.spec.ts`

## Phase 5: User Story 3 - Preserve Expanded View Baseline (Priority: P3)

**Goal**: Keep expanded inline rendering as default behavior.

**Independent Test**: Loaded nested fixtures show inline nested structures by default.

- [ ] T012 [P] [US3] Implement expanded mode defaults in `packages/editor-web-component/src/nesting/default-view.ts`
- [ ] T013 [US3] Add regression tests for default rendering mode in `tests/integration/nested-default-view.spec.ts`

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T014 [P] Add medium-depth nested performance tests in `tests/integration/nested-performance.spec.ts`
- [ ] T015 Run quickstart scenarios from `specs/002-nested-tasks-ux/quickstart.md` and capture results
- [ ] T016 [P] Add deep nesting renderer-matrix parity tests in `tests/integration/nested-renderer-matrix.spec.ts`
- [ ] T017 [P] Add scope-context cue parity checks for `rete-lit` and `react-flow` in `tests/e2e/nested-context-renderer-matrix.spec.ts`
