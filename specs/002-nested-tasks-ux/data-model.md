# Data Model: Nested Tasks UX

## Entities

### ScopePath

- **Fields**:
  - `segments`: ordered scope segments from root to active nested list.
- **Rules**:
  - Must be derivable from selected task reference.

### NestedContainer

- **Fields**:
  - `taskKind`: nesting-capable task kind
  - `childScopes`: nested task list references
- **Rules**:
  - Child scope ownership is explicit and deterministic.

### ScopeContextState

- **Fields**:
  - `activeScopePath`
  - `displayLabel`
- **Rules**:
  - Must update on selection changes and insertion actions.
