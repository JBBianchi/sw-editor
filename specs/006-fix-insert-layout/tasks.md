# Tasks: Insert Layout Correction

**Input**: Design documents from `specs/006-fix-insert-layout/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Story-specific regression tests are included because the feature specification defines independent test criteria and acceptance scenarios for each user story.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add reusable fixtures and test helpers for insertion-layout regressions.

- [x] T001 Add blank and linear insertion fixtures in `tests/fixtures/valid/insert-layout-start-end.json` and `tests/fixtures/valid/insert-layout-linear.json`
- [x] T002 [P] Add shared insertion interaction helpers in `tests/integration/insertion-layout.helpers.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the shared renderer hook surface needed before story work can wire edge anchors and focus behavior.

**CRITICAL**: No user story work should start before this phase is complete.

- [x] T003 Add insertion-anchor and post-insert focus hook types to `packages/editor-renderer-contract/src/renderer-adapter.ts`
- [x] T004 Export the renderer insertion hook surface from `packages/editor-renderer-contract/src/index.ts`

**Checkpoint**: Shared renderer contract is ready for story implementation.

---

## Phase 3: User Story 1 - Inserted Task Appears Between Intended Neighbors (Priority: P1) MVP

**Goal**: Make inserted tasks render between the predecessor and successor nodes of the split edge.

**Independent Test**: Start with blank and linear workflows, insert a task on one connection, and verify the visible order is predecessor -> inserted task -> successor without manual repositioning.

### Tests for User Story 1

- [x] T005 [P] [US1] Add insertion slot ordering and preserved predecessor -> inserted -> successor edge-semantics regressions in `packages/editor-core/tests/commands/insert-task.test.ts`
- [x] T006 [P] [US1] Add blank and linear insertion order coverage in `tests/integration/insertion-layout-order.spec.ts`
- [ ] T021 [P] [US1] Add end-to-end blank and linear insertion ordering coverage in `tests/e2e/insert-layout-order.spec.ts`

### Implementation for User Story 1

- [x] T007 [US1] Insert new task nodes at the split-edge sequence slot in `packages/editor-core/src/commands/insert-task.ts`
- [x] T008 [US1] Record ordered linear-flow semantics in `packages/editor-core/src/graph/types.ts`

**Checkpoint**: User Story 1 is complete when blank and linear insertion order is correct and independently testable.

---

## Phase 4: User Story 2 - Insertion Control Is Anchored To The Connection (Priority: P2)

**Goal**: Render the `+` affordance on the edge it splits and keep it aligned through renderer updates, pan, and zoom.

**Independent Test**: Open a workflow with visible edges, verify each insertion control is shown on the matching connection, then pan or zoom and confirm alignment persists.

### Tests for User Story 2

- [x] T009 [P] [US2] Add renderer-anchor attachment coverage in `packages/editor-web-component/tests/graph/insertion-ui.test.ts`
- [x] T010 [P] [US2] Add cross-renderer affordance alignment, insertion-order parity, and midpoint-tolerance (<= 12 px from edge midpoint) coverage in `tests/integration/insertion-renderer-matrix.spec.ts`
- [ ] T022 [P] [US2] Add end-to-end edge-anchor alignment coverage with midpoint-tolerance assertions (<= 12 px) in `tests/e2e/insert-layout-affordance.spec.ts`
- [x] T023 [P] [US2] Add keyboard, accessible-name, and post-insert focus-landing regression coverage for edge-anchored insertion controls in `tests/e2e/accessibility-insert-layout.spec.ts`

### Implementation for User Story 2

- [x] T011 [US2] Consume renderer-provided edge anchors and focus callbacks in `packages/editor-web-component/src/graph/insertion-ui.ts`
- [x] T012 [US2] Export the renderer-backed insertion surface from `packages/editor-web-component/src/graph/index.ts`
- [x] T013 [P] [US2] Implement midpoint edge anchors and post-insert focus in `packages/editor-renderer-react-flow/src/react-flow-adapter.ts`
- [x] T014 [P] [US2] Implement midpoint edge anchors and post-insert focus in `packages/editor-renderer-rete-lit/src/rete-lit-adapter.ts`

**Checkpoint**: User Story 2 is complete when the insertion control is edge-anchored and aligned in both supported renderer views.

---

## Phase 5: User Story 3 - Repeated Insertions Preserve Readable Flow (Priority: P3)

**Goal**: Keep repeated adjacent insertions readable, ordered, and non-overlapping.

**Independent Test**: Insert several tasks on adjacent connections and verify every new task appears in sequence with readable spacing and no visual reversal or overlap.

### Tests for User Story 3

- [x] T015 [P] [US3] Add repeated-insertion layout regressions in `tests/integration/repeated-insert-layout.spec.ts`
- [x] T016 [P] [US3] Add sequential insertion update coverage in `packages/editor-web-component/tests/graph/insertion-ui.test.ts`

### Implementation for User Story 3

- [x] T017 [US3] Preserve readable downstream spacing for repeated insertions in `packages/editor-renderer-react-flow/src/react-flow-adapter.ts`
- [x] T018 [US3] Preserve readable downstream spacing for repeated insertions in `packages/editor-renderer-rete-lit/src/rete-lit-adapter.ts`

**Checkpoint**: User Story 3 is complete when repeated insertions stay readable in both renderer bundles.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and regression coverage that spans multiple user stories.

- [ ] T019 [P] Add insertion-layout quickstart regression coverage in `tests/integration/quickstart-scenarios.spec.ts`
- [ ] T024 [P] Add timed start-to-end insertion validation for SC-004 (< 5s confirmation) in `tests/e2e/insert-layout-order.spec.ts`
- [ ] T025 [P] Add performance-threshold validation for insertion settle (95p <= 250 ms) and anchor realignment after pan/zoom (<= 100 ms) in `tests/integration/insertion-performance.spec.ts`
- [x] T020 Run quickstart scenarios from `specs/006-fix-insert-layout/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup**: No dependencies; can start immediately.
- **Phase 2: Foundational**: Depends on Phase 1 and blocks all story work until the renderer contract surface is defined.
- **Phase 3: User Story 1**: Depends on Phase 2.
- **Phase 4: User Story 2**: Depends on Phase 2.
- **Phase 5: User Story 3**: Depends on Phase 3 and Phase 4 because it validates repeated insertions on the corrected ordering and anchored-control behavior.
- **Phase 6: Polish**: Depends on all implemented user stories.

### User Story Dependencies

- **US1 (P1)**: Independent after Phase 2; this is the MVP slice.
- **US2 (P2)**: Independent after Phase 2; it should not require US1 to be functionally complete, but it integrates with the same insertion flow.
- **US3 (P3)**: Depends on US1 and US2 because repeated insertion readability assumes correct node ordering and stable edge anchors.

### Within Each User Story

- Write the listed regression tests first and confirm they fail before implementation.
- Complete core or contract changes before renderer-specific glue that depends on them.
- Finish each story to its checkpoint before moving on to the next priority if working sequentially.

---

## Parallel Opportunities

- **Setup**: `T001` and `T002` can run in parallel.
- **US1**: `T005`, `T006`, and `T021` can run in parallel.
- **US2**: `T009`, `T010`, `T022`, and `T023` can run in parallel; `T013` and `T014` can run in parallel after `T011`.
- **US3**: `T015` and `T016` can run in parallel; `T017` and `T018` can run in parallel once the regression expectations are clear.

---

## Parallel Example: User Story 2

```text
Task: "T009 [US2] Add renderer-anchor attachment coverage in packages/editor-web-component/tests/graph/insertion-ui.test.ts"
Task: "T010 [US2] Add cross-renderer affordance alignment and insertion-order parity coverage in tests/integration/insertion-renderer-matrix.spec.ts"
Task: "T022 [US2] Add end-to-end edge-anchor alignment coverage in tests/e2e/insert-layout-affordance.spec.ts"
Task: "T023 [US2] Add keyboard, accessible-name, and post-insert focus-landing regression coverage for edge-anchored insertion controls in tests/e2e/accessibility-insert-layout.spec.ts"

Task: "T013 [US2] Implement midpoint edge anchors and post-insert focus in packages/editor-renderer-react-flow/src/react-flow-adapter.ts"
Task: "T014 [US2] Implement midpoint edge anchors and post-insert focus in packages/editor-renderer-rete-lit/src/rete-lit-adapter.ts"
```

## Parallel Example: User Story 3

```text
Task: "T015 [US3] Add repeated-insertion layout regressions in tests/integration/repeated-insert-layout.spec.ts"
Task: "T016 [US3] Add sequential insertion update coverage in packages/editor-web-component/tests/graph/insertion-ui.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3.
3. Validate blank and linear insertion order independently before expanding scope.

### Incremental Delivery

1. Deliver US1 to fix the incorrect inserted-node position.
2. Add US2 to make insertion controls edge-anchored in both renderers.
3. Add US3 to harden repeated insertion readability and spacing behavior.
4. Finish with Phase 6 regression validation.

### Parallel Team Strategy

1. One developer completes Phase 1 and Phase 2.
2. After the shared contract is ready, one developer can take US1 while another implements the renderer work for US2.
3. US3 starts after US1 and US2 stabilize.

---

## Notes

- `[P]` means the task is safe to run in parallel because it targets separate files and has no incomplete prerequisite in the same phase.
- `[US1]`, `[US2]`, and `[US3]` provide direct traceability back to the specification's user stories.
- The suggested MVP scope is **User Story 1**.
