# Research: Tight Insert Geometry

## Decision 1: Use a deterministic directed-layout engine with explicit orientation

- **Decision**: Introduce a shared deterministic layout helper driven by `OrientationMode` (`top-to-bottom`, `left-to-right`) and run it for every renderer update so node coordinates are reproducible.
- **Rationale**: Existing index-based linear placement is predictable for simple flows but does not satisfy orientation switching and deterministic parity requirements for denser graphs.
- **Alternatives considered**:
  - Keep current index-based spacing: rejected because it cannot express orientation-aware graph layout beyond a single axis.
  - Compute different layout logic per renderer: rejected due to drift risk and weaker parity guarantees.

## Decision 2: Define strict midpoint anchor semantics and ban viewport-fixed fallbacks

- **Decision**: Treat edge midpoint anchoring as a required renderer contract behavior and remove viewport-fixed fallback coordinates for graph-anchored insertion controls.
- **Rationale**: Viewport-based fallback is the main cause of controls appearing detached from their target edge, which invalidates insertion intent.
- **Alternatives considered**:
  - Allow mixed behavior with permissive fallback: rejected because it keeps the same regression class (detached controls) under update pressure.
  - Place controls near source or target nodes: rejected due to ambiguity when multiple edges converge.

## Decision 3: Make port-side binding orientation-derived and test-visible

- **Decision**: Compute incoming/outgoing port sides from the active orientation and expose those bindings in a layout snapshot used by tests.
- **Rationale**: Orientation-specific port placement is a contract requirement and must be measurable without relying on brittle DOM inference only.
- **Alternatives considered**:
  - Hardcode top/bottom handles: rejected because it breaks left-to-right readability and conflicts with orientation goals.
  - Keep side mapping implicit per renderer: rejected because parity and determinism cannot be validated consistently.

## Decision 4: Add a renderer layout snapshot surface for geometry assertions

- **Decision**: Extend renderer contract surfaces with additive snapshot metadata sufficient for midpoint, overlap, and port-side assertions.
- **Rationale**: Previous validation relied on stubs and skipped e2e suites; a first-class snapshot surface enables deterministic automated checks in both integration and e2e flows.
- **Alternatives considered**:
  - Continue deriving geometry only from runtime DOM: rejected because renderer DOM shape differs and leads to fragile tests.
  - Keep geometry validation in manual quickstart only: rejected because regression gates need CI-enforced automation.

## Decision 5: Align e2e harness behavior with production insertion orchestration

- **Decision**: Replace harness-specific hardcoded insertion-button positioning with the same renderer-anchor and insertion orchestration used by production-facing paths.
- **Rationale**: The previous harness drift allowed tests to pass while real geometry behavior remained incorrect.
- **Alternatives considered**:
  - Keep harness as a simplified mock UI: rejected because the harness is the Playwright target and must validate real behavior.
  - Add more stubbed integration tests only: rejected because this did not prevent viewport fallback regressions.

## Decision 6: Convert geometry and accessibility fixme suites into active CI gates

- **Decision**: Enable midpoint/pan-zoom/accessibility e2e suites as active tests and treat failures as blocking for this feature.
- **Rationale**: Success criteria require measurable guarantees that cannot be represented by skipped tests.
- **Alternatives considered**:
  - Keep `.fixme` and rely on unit tests: rejected because skipped suites provide no enforcement for user-visible geometry behavior.
