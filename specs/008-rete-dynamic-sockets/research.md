# Research: Rete Dynamic Socket Orientation

## Decision 1: Use custom Lit node rendering in `rete-lit`

- **Decision**: Replace default `Presets.classic` node template with `customize.node` rendering in `ReteLitAdapter`.
- **Rationale**: Default classic layout fixes sockets laterally; custom template enables explicit vertical/horizontal socket regions without changing renderer contracts.
- **Alternatives considered**:
  - CSS-only override of default classic node: rejected as brittle and dependent on internal preset markup.
  - Connection-offset-only workaround: rejected because sockets would not visibly move, only path starts/ends.

## Decision 2: Keep real `rete-ref` socket refs

- **Decision**: Continue rendering socket entries with `rete-ref` (`type: socket`) for input/output.
- **Rationale**: Maintains canonical connection endpoint computation from actual socket DOM geometry and avoids synthetic midpoint hacks.

## Decision 3: Validate with snapshot + e2e all-edge checks

- **Decision**: Extend integration snapshot checks and orientation e2e checks to assert side bindings on every rendered edge.
- **Rationale**: Prevents false positives from single-edge checks and catches regressions in branch/dense graphs and repeated orientation toggles.
