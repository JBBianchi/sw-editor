# Research: Visual Authoring MVP

## Decision 1: Source-Only Host Exchange

- **Decision**: Use source input/output as the host contract baseline.
- **Rationale**: Keeps behavior consistent across hosts and prevents model drift.
- **Alternatives considered**:
  - Model-object host API: rejected for MVP due compatibility and ownership ambiguity.

## Decision 2: Validation Owned By Editor Core

- **Decision**: Keep schema and semantic validation inside editor core.
- **Rationale**: Ensures consistent diagnostics regardless of host stack.
- **Alternatives considered**:
  - Host-provided validators: rejected because it fragments correctness behavior.

## Decision 3: Debounced Live Validation + Explicit Full Validation

- **Decision**: Live diagnostics are debounced; explicit full-pass action remains available.
- **Rationale**: Balances responsiveness with compute cost.
- **Alternatives considered**:
  - Full validation on every keystroke: rejected for performance and UX noise.

## Decision 4: No Editor Network Calls

- **Decision**: Editor runtime is network-isolated.
- **Rationale**: Enforces privacy and predictable embedding behavior.
- **Alternatives considered**:
  - Optional telemetry/export in editor: rejected for MVP; delegated to host.

## Decision 5: Web Component + Headless Core

- **Decision**: UI integration in web component, semantics in headless core.
- **Rationale**: Supports multiple hosts while keeping logic portable and testable.
- **Alternatives considered**:
  - Single monolithic UI package: rejected due weaker portability and test isolation.
