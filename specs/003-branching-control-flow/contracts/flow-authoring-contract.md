# Contract: Flow Authoring Behavior

## Transition Controls

- Transition options include `continue`, `exit`, `end`, and same-scope named targets.
- Self-target transitions are allowed.
- Rename and delete operations keep references deterministic.

## Guarded Tasks

- Task-level `if` is stored as opaque string data.
- Graph projects guarded and bypass routes without expression execution.

## Switch Tasks

- Cases are ordered and each case contributes a projected route.
- Task-level transition remains the default route.

## Fork Tasks

- `compete` is editable and reflected in node state metadata.

## Try Catch Tasks

- Catch alternatives are toggleable.
- Disabled catch removes catch branch from source and graph projection.

## Renderer Parity Rules

- Route edge projection semantics are invariant across `rete-lit` and `react-flow` bundles.
- Route label ordering and retarget behavior are invariant across supported renderer bundles.
