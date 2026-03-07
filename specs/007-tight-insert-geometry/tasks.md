# Tasks: Tight Insert Geometry

**Input**: Design documents from `specs/007-tight-insert-geometry/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Tests are required for this feature because the specification defines measurable geometry, orientation, and accessibility success criteria that must be enforced in automation.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add shared fixtures and geometry test utilities used by multiple stories.

- [ ] T001 Add orientation and dense-graph fixtures in `tests/fixtures/valid/insert-geometry-tb.json`, `tests/fixtures/valid/insert-geometry-lr.json`, and `tests/fixtures/valid/insert-geometry-dense.json`, including benchmark-scale variants that exercise up to 25 visible nodes and 30 edges
- [ ] T002 [P] Add shared geometry assertion helpers in `tests/integration/geometry-assertions.helpers.ts`
- [ ] T003 [P] Add Playwright geometry helper utilities in `tests/e2e/insert-geometry.helpers.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared contract and deterministic layout primitives required by all user stories.

**CRITICAL**: No user story work starts before this phase is complete.

- [ ] T004 Add mandatory orientation, insertion-anchor, and layout-snapshot contract types in `packages/editor-renderer-contract/src/renderer-adapter.ts`
- [ ] T005 Export geometry and orientation contract symbols in `packages/editor-renderer-contract/src/index.ts`
- [ ] T006 Add shared deterministic dagre layout helper and defaults in `packages/editor-renderer-contract/src/layout/deterministic-layout.ts`
- [ ] T007 Add shared layout dependency configuration in `packages/editor-renderer-contract/package.json`
- [ ] T008 [P] Add deterministic layout helper regression coverage in `tests/integration/deterministic-layout.spec.ts`
- [ ] T009 [P] Add renderer geometry contract coverage for snapshot and anchor surfaces in `tests/contract/renderer-geometry.contract.spec.ts`

**Checkpoint**: Shared geometry contract and deterministic layout helper are ready for story implementation.

---

## Phase 3: User Story 1 - Edge-Centered Insert Control (Priority: P1) MVP

**Goal**: Ensure each `+` insertion control is centered on the edge it splits in both renderer views.

**Independent Test**: Render graphs in both renderer views and verify each insertion control center is within midpoint tolerance of its target edge.

### Tests for User Story 1

- [ ] T010 [P] [US1] Set midpoint tolerance assertions to 6 px and remove skip markers in `tests/e2e/insert-layout-affordance.spec.ts`
- [ ] T011 [P] [US1] Replace stubbed midpoint integration checks and add predecessor -> inserted -> successor ordering regression coverage in `tests/integration/insertion-renderer-matrix.spec.ts` and `tests/integration/insertion-layout-order.spec.ts`

### Implementation for User Story 1

- [ ] T012 [US1] Remove viewport-detached fallback positioning for insertion controls in `packages/editor-web-component/src/graph/insertion-ui.ts`
- [ ] T013 [US1] Implement rendered-path midpoint anchor computation in `packages/editor-renderer-react-flow/src/react-flow-adapter.ts`
- [ ] T014 [US1] Implement rendered-path midpoint anchor computation in `packages/editor-renderer-rete-lit/src/rete-lit-adapter.ts`
- [ ] T015 [US1] Replace hardcoded affordance placement with renderer anchor placement in `example/e2e-harness/main.ts`
- [ ] T016 [P] [US1] Update insertion anchor unit regressions for strict midpoint/no-fallback behavior in `packages/editor-web-component/tests/graph/insertion-ui.test.ts`

**Checkpoint**: Insertion controls are edge-centered and midpoint assertions pass in both renderer views.

---

## Phase 4: User Story 2 - Stable Geometry Across View Changes (Priority: P2)

**Goal**: Keep insertion controls aligned with their edges through pan, zoom, and graph refresh cycles.

**Independent Test**: Pan/zoom and repeated updates keep all insertion controls within tolerance and remove stale edge controls.

### Tests for User Story 2

- [ ] T017 [P] [US2] Activate pan/zoom realignment e2e coverage and stale-control checks in `tests/e2e/insert-layout-affordance.spec.ts`
- [ ] T018 [P] [US2] Add anchor realignment (p95 <= 100 ms) and layout recompute (p95 <= 150 ms) performance assertions in `tests/integration/insertion-performance.spec.ts`, explicitly running benchmark cases at up to 25 visible nodes and 30 edges

### Implementation for User Story 2

- [ ] T019 [US2] Add viewport transform subscriptions and anchor invalidation in `packages/editor-renderer-react-flow/src/react-flow-adapter.ts`
- [ ] T020 [US2] Add viewport transform subscriptions and anchor invalidation in `packages/editor-renderer-rete-lit/src/rete-lit-adapter.ts`
- [ ] T021 [US2] Refresh and prune insertion controls on graph revision changes in `packages/editor-web-component/src/graph/insertion-ui.ts`
- [X] T022 [US2] Keep harness affordance lifecycle synchronized with current edges in `example/e2e-harness/main.ts`
- [ ] T023 [P] [US2] Add stale-anchor cleanup regressions in `tests/integration/insertion-anchor-refresh.spec.ts`

**Checkpoint**: Anchor alignment remains stable after viewport and graph changes with no stale controls.

---

## Phase 5: User Story 3 - Orientation-Aware Deterministic Layout (Priority: P3)

**Goal**: Support deterministic top-to-bottom and left-to-right layout modes with orientation-correct port placement.

**Independent Test**: Run identical graphs in both orientations and verify port-side correctness, determinism, and non-overlap.

### Tests for User Story 3

- [ ] T024 [P] [US3] Add orientation port-side and direction assertions in `tests/integration/orientation-layout.spec.ts`
- [X] T025 [P] [US3] Add orientation switch e2e validations in `tests/e2e/insert-layout-orientation.spec.ts`

### Implementation for User Story 3

- [ ] T026 [US3] Integrate shared deterministic layout engine in `packages/editor-renderer-react-flow/src/react-flow-adapter.ts`
- [ ] T027 [US3] Add orientation-aware handle side mapping in `packages/editor-renderer-react-flow/src/nodes/StartNode.tsx`, `packages/editor-renderer-react-flow/src/nodes/TaskNode.tsx`, and `packages/editor-renderer-react-flow/src/nodes/EndNode.tsx`
- [ ] T028 [US3] Integrate shared deterministic layout engine and orientation mapping in `packages/editor-renderer-rete-lit/src/rete-lit-adapter.ts`
- [X] T029 [US3] Expose renderer layout snapshots for geometry assertions in `packages/editor-renderer-react-flow/src/react-flow-adapter.ts` and `packages/editor-renderer-rete-lit/src/rete-lit-adapter.ts`
- [ ] T030 [US3] Add orientation mode controls in `example/e2e-harness/index.html` and `example/e2e-harness/main.ts`
- [ ] T031 [P] [US3] Add determinism and no-overlap regressions using layout snapshots in `tests/integration/repeated-insert-layout.spec.ts`, explicitly validating fixture-matrix runs at up to 25 visible nodes and 30 edges

**Checkpoint**: Orientation-aware deterministic layout and port rules are validated across both renderer views.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation updates spanning multiple stories.

- [ ] T032 [P] Enable insertion accessibility e2e suites by removing skip markers and updating assertions in `tests/e2e/accessibility-insert-layout.spec.ts`
- [ ] T033 [P] Extend geometry/orientation quickstart regression coverage in `tests/integration/quickstart-scenarios.spec.ts`
- [ ] T034 Document quickstart execution results in `specs/007-tight-insert-geometry/quickstart-validation-results.md`
- [X] T035 Document final verification and performance summary in `specs/007-tight-insert-geometry/verification-summary.md`
- [ ] T036 Update feature status and summary entry in `specs/README.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup**: No dependencies.
- **Phase 2: Foundational**: Depends on Phase 1 and blocks all user stories.
- **Phase 3: US1**: Depends on Phase 2.
- **Phase 4: US2**: Depends on Phase 3 for baseline midpoint anchoring.
- **Phase 5: US3**: Depends on Phase 2; can be developed after foundational contracts are ready, but final parity validation should run after US1 and US2.
- **Phase 6: Polish**: Depends on completion of all targeted stories.

### User Story Dependencies

- **US1 (P1)**: Independent after foundational work; this is the MVP slice.
- **US2 (P2)**: Depends on US1 anchor correctness and extends it across viewport/update events.
- **US3 (P3)**: Independent from US2 at implementation start, but final system parity validation depends on all story outcomes.

### Within Each User Story

- Test tasks must be implemented first and verified failing before code changes.
- Adapter contract usage must precede renderer-specific behavior.
- Renderer changes should be completed before harness/e2e expectation updates.
- Story checkpoint must pass before moving to next priority in sequential delivery.

---

## Parallel Opportunities

- Phase 1 tasks marked `[P]` can run together (`T002`, `T003`).
- Phase 2 test/contract tasks marked `[P]` can run together after core contract work (`T008`, `T009`).
- US1 midpoint e2e/integration tasks can run in parallel (`T010`, `T011`), and renderer implementations can run in parallel (`T013`, `T014`).
- US2 renderer refresh work can run in parallel (`T019`, `T020`) once tests are in place.
- US3 test tasks can run in parallel (`T024`, `T025`), and renderer integrations can run in parallel (`T026`, `T028`).
- Polish tasks marked `[P]` can run in parallel (`T032`, `T033`).

---

## Parallel Example: User Story 1

```text
Task: "T010 [US1] Set midpoint tolerance assertions to 6 px and remove skip markers in tests/e2e/insert-layout-affordance.spec.ts"
Task: "T011 [US1] Replace stubbed midpoint checks and add ordering regressions in tests/integration/insertion-renderer-matrix.spec.ts and tests/integration/insertion-layout-order.spec.ts"

Task: "T013 [US1] Implement rendered-path midpoint anchor computation in packages/editor-renderer-react-flow/src/react-flow-adapter.ts"
Task: "T014 [US1] Implement rendered-path midpoint anchor computation in packages/editor-renderer-rete-lit/src/rete-lit-adapter.ts"
```

## Parallel Example: User Story 3

```text
Task: "T024 [US3] Add orientation assertions in tests/integration/orientation-layout.spec.ts"
Task: "T025 [US3] Add orientation switch e2e validations in tests/e2e/insert-layout-orientation.spec.ts"

Task: "T026 [US3] Integrate deterministic layout engine in packages/editor-renderer-react-flow/src/react-flow-adapter.ts"
Task: "T028 [US3] Integrate deterministic layout engine in packages/editor-renderer-rete-lit/src/rete-lit-adapter.ts"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1).
3. Validate midpoint anchoring in both renderer views before expanding scope.

### Incremental Delivery

1. Deliver US1 for strict edge-centered insertion controls.
2. Deliver US2 for stable geometry under pan/zoom/rebuild.
3. Deliver US3 for orientation-aware deterministic layout and ports.
4. Finish Phase 6 cross-cutting validation and documentation.

### Parallel Team Strategy

1. One track completes Phase 1-2 shared contracts/helpers.
2. Parallel renderer tracks implement `react-flow` and `rete-lit` updates per story.
3. Test track activates e2e/integration gates in parallel with implementation and finalizes polish artifacts.

---

## Notes

- `[P]` indicates parallel-safe tasks (different files, no incomplete dependency on same file).
- `[US1]`, `[US2]`, `[US3]` labels preserve direct traceability to the feature specification.
- This plan intentionally converts previously skipped geometry/accessibility e2e suites into active validation gates.
