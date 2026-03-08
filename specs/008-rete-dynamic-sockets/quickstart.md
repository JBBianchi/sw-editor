# Quickstart: Rete Dynamic Socket Orientation

## Scenario 1: TB socket sides in rete-lit

1. Open `example/e2e-harness` with default renderer (`rete-lit`).
2. Create a workflow and add at least two tasks via insertion controls.
3. Keep orientation at `top-to-bottom`.

Expected:
- For every rendered edge, source endpoint is near source-node bottom side.
- For every rendered edge, target endpoint is near target-node top side.

## Scenario 2: LR socket sides in rete-lit

1. Starting from Scenario 1, switch orientation to `left-to-right`.

Expected:
- For every rendered edge, source endpoint is near source-node right side.
- For every rendered edge, target endpoint is near target-node left side.

## Scenario 3: TB -> LR -> TB toggle stability

1. Toggle orientation `top-to-bottom -> left-to-right -> top-to-bottom`.

Expected:
- Side bindings remain correct after each toggle.
- Insertion affordances stay within existing midpoint tolerance budgets.
