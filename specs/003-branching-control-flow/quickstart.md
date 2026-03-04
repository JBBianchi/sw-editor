# Quickstart Validation: Branching Control Flow

## Scenario 1: Transition Authoring

1. Create three sibling tasks.
2. Set named transition from first task to third task.
3. Rename third task.

Expected: transition retargets to renamed task and graph updates.

## Scenario 2: Guarded Task Projection

1. Add task-level `if` to middle task.
2. Observe guarded route and bypass route labels.

Expected: two projected routes with correct bypass semantics.

## Scenario 3: Switch Case Authoring

1. Add switch task with three cases and default transition.
2. Reorder cases in panel.

Expected: projected routes follow case order and include default route.

## Scenario 4: Fork And Try Catch

1. Toggle fork compete mode.
2. Enable then disable try-catch alternative tasks.
3. Export workflow.

Expected: source and graph reflect current fork/catch settings without stale branches.
