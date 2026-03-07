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
