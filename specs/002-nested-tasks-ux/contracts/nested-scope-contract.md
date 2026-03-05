# Contract: Nested Scope Behavior

## Scope Rules

- Scope is a task list container.
- `continue` resolves in current scope first.
- Scope exit behavior is deterministic and consistent across nested kinds.

## Rendering Rules

- Nested structures render inline in expanded mode by default.
- Nested scopes do not inject synthetic start/end nodes.
- Rendering semantics for nested inline structure and context cues are invariant across `rete-lit` and `react-flow` bundles.

## Selection Rules

- Selection payloads include task references sufficient to derive scope path.
- Scope context metadata updates on every selection change.

## Serialization Rules

- Export preserves nested structure and transition semantics.
- Nested edits must not alter unrelated root-scope ordering.
