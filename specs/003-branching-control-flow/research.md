# Research: Branching Control Flow

## Decision 1: Task If Is Opaque Workflow Data

- **Decision**: Store and display task-level `if` without evaluating expressions.
- **Rationale**: Runtime condition semantics belong to workflow execution runtime, not editor projection.
- **Alternatives considered**:
  - Expression evaluation in editor: rejected due runtime-coupling and false confidence.

## Decision 2: Explicit Scope-Aware Transition Resolution

- **Decision**: Resolve named transitions in current scope and keep deterministic fallback rules.
- **Rationale**: Prevents ambiguous control-flow behavior and supports predictable retargeting.
- **Alternatives considered**:
  - Cross-scope transition targets: rejected for MVP due complexity and ambiguity.

## Decision 3: Switch Case Order Is Authoritative

- **Decision**: Preserve panel order for switch cases and route labels.
- **Rationale**: Keeps author intent and execution readability aligned.
- **Alternatives considered**:
  - Sorted case order: rejected due mismatch with authored intent.

## Decision 4: Catch Branch Toggle Controls Source Presence

- **Decision**: Disabling catch alternatives removes catch branch structure from source.
- **Rationale**: Prevents hidden inactive branches in serialized workflows.
- **Alternatives considered**:
  - Soft-disabled catch metadata: rejected for MVP due additional state complexity.
