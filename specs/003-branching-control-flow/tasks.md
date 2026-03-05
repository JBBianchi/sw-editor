# Tasks: Branching Control Flow

**Input**: Design documents from `specs/003-branching-control-flow/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Add branching fixture workflows in `tests/fixtures/flow/`
- [ ] T002 [P] Add route projection snapshot harness in `packages/editor-core/tests/flow/`

## Phase 2: Foundational (Blocking Prerequisites)

- [ ] T003 Implement scope-aware transition resolver in `packages/editor-core/src/flow/transition-resolver.ts`
- [ ] T004 [P] Implement route projection engine in `packages/editor-core/src/flow/route-projection.ts`
- [ ] T005 [P] Implement transition reference retargeting helpers in `packages/editor-core/src/flow/retarget.ts`

## Phase 3: User Story 1 - Configure Task Transitions (Priority: P1)

**Goal**: Edit transition directives and maintain route correctness.

**Independent Test**: Transition edits, rename, and delete flows pass regression suite.

- [ ] T006 [P] [US1] Build transition panel controls in `packages/editor-web-component/src/flow/transition-panel.ts`
- [ ] T007 [US1] Integrate transition commands with resolver in `packages/editor-core/src/commands/update-transition.ts`
- [ ] T008 [US1] Add integration tests for transition retargeting in `tests/integration/transition-retargeting.spec.ts`

## Phase 4: User Story 2 - Author Conditional And Switch Routes (Priority: P2)

**Goal**: Support guarded task and switch case route authoring.

**Independent Test**: Guarded and switch route projections match expected snapshots.

- [ ] T009 [P] [US2] Add guarded route projection logic in `packages/editor-core/src/flow/guarded-routes.ts`
- [ ] T010 [P] [US2] Add switch case editing controls in `packages/editor-web-component/src/flow/switch-panel.ts`
- [ ] T011 [US2] Add switch route projection tests in `tests/integration/switch-routes.spec.ts`

## Phase 5: User Story 3 - Author Fork And Try Catch Alternatives (Priority: P3)

**Goal**: Support fork compete and try-catch alternative branch editing.

**Independent Test**: Fork and catch toggles update graph and source consistently.

- [ ] T012 [P] [US3] Add fork compete controls in `packages/editor-web-component/src/flow/fork-panel.ts`
- [ ] T013 [P] [US3] Add try-catch toggle command in `packages/editor-core/src/commands/toggle-catch.ts`
- [ ] T014 [US3] Add integration tests for catch removal behavior in `tests/integration/catch-toggle.spec.ts`

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T015 [P] Add contract tests for flow event payload consistency in `tests/contract/flow-events.contract.spec.ts`
- [ ] T016 Run quickstart scenarios from `specs/003-branching-control-flow/quickstart.md` and capture results
- [ ] T017 [P] Add renderer matrix tests for named transition retargeting and guarded bypass routes in `tests/integration/flow-renderer-matrix.spec.ts`
- [ ] T018 [P] Add renderer matrix tests for switch case ordering projection in `tests/integration/switch-renderer-matrix.spec.ts`
- [ ] T019 [P] Add renderer matrix tests for catch-branch toggle cleanup consistency in `tests/integration/catch-renderer-matrix.spec.ts`
