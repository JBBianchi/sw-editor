# Research: Nested Tasks UX

## Decision 1: Expanded Inline Rendering By Default

- **Decision**: Keep expanded nested rendering as default behavior.
- **Rationale**: Provides complete flow visibility without mode switching.
- **Alternatives considered**:
  - Contextual-only mode: rejected for MVP due reduced discoverability.

## Decision 2: Transparent Nested Containers

- **Decision**: Represent nested scopes directly without synthetic nested boundary nodes.
- **Rationale**: Keeps graph semantics aligned with source structures.
- **Alternatives considered**:
  - Synthetic nested start/end markers: rejected due semantic noise.

## Decision 3: Scope-Aware Context Cues

- **Decision**: Add panel and graph context cues for active scope.
- **Rationale**: Prevents ambiguous edits in deep hierarchies.
- **Alternatives considered**:
  - No scope indicators: rejected due high user error risk.
