# Quickstart Validation: Insert Layout Correction

## Prerequisites

1. Install Node.js 24 LTS and `pnpm@10.30.3`.
2. Install workspace dependencies with `pnpm install --frozen-lockfile`.
3. Verify baseline checks:
   - `pnpm test`
   - `pnpm lint`

## Scenario 1: Insert Between Start And End

1. Open a blank workflow that renders only start and end nodes.
2. Activate the `+` control shown on the edge between them.
3. Insert a task.

Expected: the new task renders between start and end immediately, the edges still connect start -> new task -> end, and the new task receives focus.

## Scenario 2: Insert Into The Middle Of A Linear Sequence

1. Load or create a linear sequence with at least three nodes in visible order.
2. Activate the `+` control on the edge between the first and second non-boundary nodes.
3. Insert a task.

Expected: the inserted task appears between the intended predecessor and successor, and downstream nodes shift right enough to preserve readable order.

## Scenario 3: Affordance Alignment Across View Changes

1. Open a workflow with multiple visible edges.
2. Pan and zoom the canvas.
3. Verify insertion controls again in both supported renderer bundles.

Expected: each `+` control remains visually centered on the connection it splits after the view changes.

## Scenario 4: Repeated Adjacent Insertions

1. Starting from a simple linear flow, insert a task on one edge.
2. Insert another task on the next adjacent edge.
3. Repeat until at least three inserted tasks exist in sequence.

Expected: the visible order remains readable, no node overlaps occur, and each newly inserted task lands in the intended sequence slot.
