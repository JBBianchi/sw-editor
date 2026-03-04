# Quickstart Validation: Nested Tasks UX

## Scenario 1: Create Nested Do Flow

1. Insert a `do` task in root scope.
2. Add child tasks inside the `do` scope.
3. Export source.

Expected: Nested `do` structure is serialized correctly.

## Scenario 2: Create Nested For Flow

1. Insert a `for` task.
2. Add multiple nested tasks under loop body.
3. Validate and export.

Expected: Loop body and transitions remain structurally valid.

## Scenario 3: Scope Context Signals

1. Select root task, then nested task.
2. Observe panel and graph context indicators.

Expected: Current scope is clear and unambiguous.

## Scenario 4: Fixture Round Trip

1. Load nested fixture workflows.
2. Make edits in nested scopes.
3. Export and compare structure.

Expected: Nested structure and semantics are preserved.
