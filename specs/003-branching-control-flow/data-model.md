# Data Model: Branching Control Flow

## Entities

### TransitionDirective

- **Fields**:
  - `kind`: `continue | exit | end | named`
  - `targetName`: optional string
- **Rules**:
  - Named targets must resolve within current scope.

### GuardedTaskRoute

- **Fields**:
  - `taskReference`
  - `guardExpression`
  - `bypassRoute`
- **Rules**:
  - Bypass route must resolve to successor semantics for active scope.

### SwitchRouting

- **Fields**:
  - `cases`: ordered case entries
  - `defaultTransition`
- **Rules**:
  - Case list order must be preserved.

### ForkState

- **Fields**:
  - `compete`: boolean
- **Rules**:
  - Graph node state reflects current compete value.

### CatchAlternative

- **Fields**:
  - `enabled`: boolean
  - `tasks`: optional list
- **Rules**:
  - Disabled state removes catch branch data from serialized source.
