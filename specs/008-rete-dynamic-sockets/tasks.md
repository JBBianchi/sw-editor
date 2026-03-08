# Tasks: Rete Dynamic Socket Orientation

**Input**: Design documents from `specs/008-rete-dynamic-sockets/`  
**Prerequisites**: `plan.md`, `spec.md`

**Tests**: Required. This feature changes renderer geometry behavior and must be validated by integration and e2e suites.

## Phase 1: Feature Package Setup

- [x] T001 Create `specs/008-rete-dynamic-sockets/` with spec, plan, tasks, data model, quickstart, and contract docs
- [x] T002 Update `specs/README.md` to include feature 008

---

## Phase 2: Rete Renderer Implementation

- [x] T003 Add orientation-aware custom Lit node rendering in `packages/editor-renderer-rete-lit/src/rete-lit-adapter.ts`
- [x] T004 Keep sockets as `rete-ref` endpoints in custom node template so connection geometry follows socket DOM
- [x] T005 Preserve node/socked test hooks (`data-testid`, node IDs) used by existing e2e/integration checks
- [x] T006 Keep orientation switching wired through `setOrientation()` and graph reapply lifecycle

---

## Phase 3: Integration Validation

- [x] T007 Extend snapshot-based integration coverage for orientation-correct endpoint sides in `tests/integration/repeated-insert-layout.spec.ts`
- [x] T008 Add Rete TB -> LR -> TB toggle regression for side mapping stability in `tests/integration/repeated-insert-layout.spec.ts`

---

## Phase 4: E2E Validation

- [x] T009 Extend orientation e2e coverage to validate socket-side correctness on all rendered edges in `tests/e2e/insert-layout-orientation.spec.ts`
- [x] T010 Add TB -> LR -> TB all-edge regression in `tests/e2e/insert-layout-orientation.spec.ts`
- [x] T011 Keep midpoint/anchor validation in focused geometry suites and maintain stable e2e edge-affordance mapping checks across orientation switches

---

## Phase 5: Verification

- [x] T012 Run focused type-check/build for `@sw-editor/editor-renderer-rete-lit`
- [x] T013 Run focused integration and e2e suites for orientation and layout regressions

## Notes

- Verification evidence captured:
  - `pnpm.cmd exec vitest run tests/integration/repeated-insert-layout.spec.ts`
  - `$env:CI='1'; pnpm.cmd exec playwright test tests/e2e/insert-layout-orientation.spec.ts --project=chromium --workers=1`
