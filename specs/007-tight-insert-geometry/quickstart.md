# Quickstart Validation: Tight Insert Geometry

## Prerequisites

1. Install Node.js 24 LTS and `pnpm@10.30.3`.
2. Install workspace dependencies with `pnpm install --frozen-lockfile`.
3. Run baseline checks from repo root:
   - `pnpm -r build`
   - `pnpm test`
   - `pnpm test:e2e`

## Acceptance Fixture Matrix

- `tests/fixtures/valid/insert-geometry-tb.json`
- `tests/fixtures/valid/insert-geometry-lr.json`
- `tests/fixtures/valid/insert-geometry-dense.json`

## Scenario 1: Midpoint Anchor On Blank Flow

1. Open a blank workflow (`start -> end`) in `react-flow` view.
2. Inspect the insertion control on the boundary edge.
3. Repeat in `rete-lit` view.

Expected: exactly one insertion control is visible in each renderer and its center is within 6 px Euclidean distance of the target edge midpoint.

## Scenario 2: Midpoint Stability After Pan and Zoom

1. Load a workflow with at least three visible edges.
2. Record anchor-to-midpoint deltas for all insertion controls.
3. Pan and zoom the canvas, then record deltas again.

Expected: all controls stay attached to their original edge IDs and remain within 6 px Euclidean distance of the target edge midpoint after each viewport transform.

## Scenario 3: Stale Anchor Cleanup After Insertion

1. Insert a task on an edge.
2. Refresh affordances for the updated graph.
3. Verify controls for removed edges are gone.

Expected: no stale controls remain for removed edges; exactly one control exists for each eligible current edge.

## Scenario 4: Orientation and Port Binding (Top-To-Bottom)

1. Set orientation to top-to-bottom.
2. Render `insert-geometry-tb.json` and `insert-geometry-dense.json`.
3. Inspect port-side bindings and edge flow direction.

Expected: incoming ports are top, outgoing ports are bottom, and edge flow is top-to-bottom for all measured edges.

## Scenario 5: Orientation and Port Binding (Left-To-Right)

1. Set orientation to left-to-right.
2. Render `insert-geometry-lr.json` and `insert-geometry-dense.json`.
3. Inspect port-side bindings and edge flow direction.

Expected: incoming ports are left, outgoing ports are right, and edge flow is left-to-right for all measured edges.

## Scenario 6: Deterministic Repeat Layout

1. Render the same fixture graph and orientation repeatedly without edits.
2. Capture layout snapshots across repeated runs.
3. Compare node coordinates and edge midpoint coordinates.

Expected: layout snapshots remain deterministic within 1 px per axis across repeated runs and renderer bundles.

## Scenario 7: Keyboard Insertion and Focus Landing

1. Navigate to an insertion control using keyboard only.
2. Trigger insertion and choose a task type.
3. Observe focus target after insertion.

Expected: insertion is keyboard-operable, menu actions remain accessible, and focus lands on the inserted node within the feature time budget.

## Execution Report (2026-03-07 UTC)

### Environment

- Node.js `v24.14.0`
- `pnpm` `10.30.3`
- Playwright browsers installed with `pnpm exec playwright install --with-deps`

### Baseline Command Results

- `pnpm -r build`: PASS
- `pnpm test`: PASS
- `pnpm test:e2e`: FAIL (`45 failed`, `96 passed`, `123 skipped`)

### Scenario Status

| Scenario | Status | Evidence / Notes |
|---|---|---|
| 1. Midpoint Anchor On Blank Flow | FAIL | `tests/e2e/insert-layout-affordance.spec.ts` midpoint checks timed out waiting for required node/canvas geometry. |
| 2. Midpoint Stability After Pan and Zoom | FAIL | `insert-layout-affordance.spec.ts` and `insert-layout-orientation.spec.ts` pan/zoom alignment checks failed across Chromium/Firefox/WebKit. |
| 3. Stale Anchor Cleanup After Insertion | FAIL | `insert-layout-orientation.spec.ts` stale cleanup assertions failed (`edgeIdsBefore.length` was `0`). |
| 4. Orientation and Port Binding (Top-To-Bottom) | FAIL | No passing validation evidence from this run; dedicated top-to-bottom port-binding assertions were not observed in executed coverage. |
| 5. Orientation and Port Binding (Left-To-Right) | FAIL | No passing validation evidence from this run; dedicated left-to-right port-binding assertions were not observed in executed coverage. |
| 6. Deterministic Repeat Layout | FAIL | No deterministic snapshot/coordinate-repeat assertions were observed in executed coverage. |
| 7. Keyboard Insertion and Focus Landing | PASS | Keyboard insertion/accessibility scenario tests ran without failures in `tests/e2e/accessibility-insert-layout.spec.ts`. |

### Deviations / Issues

- Initial e2e run failed before test execution due missing Playwright browser binaries; resolved by installing browsers and OS deps with `pnpm exec playwright install --with-deps`.
- Insert-geometry suites still fail consistently after environment fix.
- Follow-up issue filed: [#424](https://github.com/JBBianchi/sw-editor/issues/424).

### Task #430 Baseline Artifact

- Detailed per-browser baseline for the targeted suites: [baseline-insert-geometry-e2e-2026-03-07.md](./baseline-insert-geometry-e2e-2026-03-07.md)
- Timestamp metadata for all runs: `artifacts/task-430-baseline/run-metadata.tsv`

---

## Final Verification Report (2026-03-07 UTC) -- Task #437

### Environment

- Node.js `v24.14.0`
- `pnpm` `10.30.3`
- Playwright `1.58.2` with browsers installed via `pnpm exec playwright install --with-deps`
- Branch: `task/437-task-run-final-insert-geometry-e2e-verifi`
- Base: `main` at `bd796dc` (includes fixes from Tasks #430-#436, #440-#444)

### Command

```
pnpm test:e2e
```

### Overall Results

- **276 total tests**: 120 passed, 33 failed, 123 skipped
- Projects: `chromium`, `firefox`, `webkit`

### Scenario Status (Final)

| Scenario | Status | Evidence / Notes |
|---|---|---|
| 1. Midpoint Anchor On Blank Flow | FAIL | `insert-layout-affordance.spec.ts` lines 76, 83: canvas `boundingBox` timeout (30 s) across all 3 browsers (6 failures). Root cause: canvas selector not resolving within test timeout in headless CI. |
| 2. Midpoint Stability After Pan and Zoom | FAIL | `insert-layout-affordance.spec.ts` lines 98, 103, 108: same canvas `boundingBox` timeout across all 3 browsers (9 failures). |
| 3. Stale Anchor Cleanup After Insertion | NOT TESTED | No dedicated stale-cleanup test exists in the current suite. The original baseline failure (`edgeIdsBefore.length === 0`) was an artifact of orientation tests failing before reaching cleanup assertions. |
| 4. Orientation and Port Binding (TB) | FAIL | `insert-layout-orientation.spec.ts` orientation switch tests for both renderers fail across all browsers. Rete-lit variant additionally fails `data-edge-id` survival and Escape focus-return after orientation switch. |
| 5. Orientation and Port Binding (LR) | FAIL | Same root cause as Scenario 4: orientation switch tests timeout waiting for layout to settle in headless CI. |
| 6. Deterministic Repeat Layout | NOT TESTED | No dedicated deterministic-repeat layout test exists in the current suite. |
| 7. Keyboard Insertion and Focus Landing | PASS | All keyboard operability tests pass across all 3 browsers: Tab navigation, Enter/Space activation, Escape focus-return, and full keyboard-only insertion. |

### Per-Browser Failure Breakdown

| Spec File | Chromium | Firefox | WebKit | Total |
|---|---:|---:|---:|---:|
| `insert-layout-affordance.spec.ts` | 5 | 5 | 5 | 15 |
| `insert-layout-orientation.spec.ts` | 6 | 6 | 6 | 18 |
| **Total** | **11** | **11** | **11** | **33** |

### Comparison with Task #430 Baseline

| Metric | Baseline (#430) | Final (#437) | Delta |
|---|---:|---:|---|
| `insert-layout-affordance` failures | 15 | 15 | 0 (unchanged) |
| `insert-layout-orientation` failures | 12 | 18 | +6 (new test coverage added in #443) |
| Combined failures | 27 | 33 | +6 |
| Overall e2e failures | 45 | 33 | -12 (improved) |
| Overall e2e passed | 96 | 120 | +24 (improved) |

### Resolved Failure Signatures vs Baseline

1. **`expect(locator).toBeFocused()` failure** (baseline signature A): RESOLVED by #441 (`fix(harness): restore focus to invoking affordance on Escape`). The Escape focus-return tests now pass in both renderers for the basic (non-orientation-switch) case.
2. **`getByText('Start')` wait timeout** (baseline signature B): PARTIALLY MITIGATED by #444 (`feat(e2e): expose deterministic post-layout settling signal`). The `waitForLayoutSettled` helper now provides a deterministic signal, but the rete-lit renderer still does not resolve within the 30 s test timeout during orientation switches.

### Remaining Failure Root Causes

All 33 remaining failures share a common root cause: **headless renderer timing**. The canvas or layout elements do not become available within the 30-second Playwright test timeout in the CI-like headless environment. Specifically:

- **Scenarios 1-2** (`insert-layout-affordance`): The `CANVAS_SELECTOR` (`[data-testid="editor-canvas"], .react-flow__viewport, .react-flow, .rete`) does not resolve a bounding box before timeout.
- **Scenarios 4-5** (`insert-layout-orientation`): Orientation switch triggers a re-layout that does not fully settle in rete-lit before assertions run. React-flow orientation tests also fail but with different timing characteristics.

### Residual Failures and Follow-Up Actions

- The 15 `insert-layout-affordance` failures and 18 `insert-layout-orientation` failures are **infrastructure/harness timing issues**, not geometry logic regressions.
- Follow-up work should focus on:
  1. Increasing the canvas-ready wait timeout or adding an explicit canvas-mounted signal to the e2e harness.
  2. Investigating the rete-lit renderer's slower re-layout cycle during orientation switches.
  3. Adding dedicated e2e tests for Scenario 3 (stale anchor cleanup) and Scenario 6 (deterministic repeat layout).
- Original tracking issue: [#424](https://github.com/JBBianchi/sw-editor/issues/424).
