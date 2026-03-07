# Contract: Renderer Geometry and Orientation

## Shared Rules

- A renderer MUST expose one insertion anchor per visible eligible edge.
- Anchor coordinates MUST correspond to the edge midpoint, or nearest stable equivalent, in renderer viewport coordinates.
- Anchor lifecycle MUST follow edge lifecycle: add on edge render, refresh on graph/viewport update, remove on edge disposal or renderer disposal.
- Viewport-fixed fallback coordinates MUST NOT be used for active graph edges.
- Renderers MUST support orientation-specific port-side binding rules for `top-to-bottom` and `left-to-right` modes.

## Layout and Snapshot Surface

- The renderer contract exposes additive, mandatory geometry surfaces for this feature scope:
  - Edge anchor lookup by edge ID MUST be available in both supported renderers.
  - Layout snapshot containing node frames, edge midpoint frames, and active orientation MUST be available in both supported renderers.
- Snapshot data is read-only and MUST NOT mutate graph or renderer state.

## Web Component Responsibilities

- Insertion UI MUST position controls from renderer-provided edge anchors.
- Insertion UI MUST remove stale controls when the corresponding edge disappears.
- Insertion menu keyboard behavior and accessible labels remain renderer-neutral and must work after each anchor refresh.

## React Flow Responsibilities

- React Flow adapter MUST map orientation mode to handle side placement and layout direction.
- React Flow adapter MUST recompute edge anchors after graph and viewport updates.
- React Flow adapter MUST provide deterministic layout snapshots for parity and tolerance tests.

## Rete Responsibilities

- Rete adapter MUST map orientation mode to socket/connection side behavior and layout direction.
- Rete adapter MUST recompute edge anchors after graph and viewport updates.
- Rete adapter MUST provide deterministic layout snapshots for parity and tolerance tests.

## Parity Rules

- The same graph and orientation input MUST produce equivalent insertion semantics in both renderers.
- Midpoint placement tolerance MUST meet feature success criteria in both renderers.
- Port-side binding correctness MUST hold for every rendered edge in both renderers.
- Boundary insertion on `start -> end` MUST remain compliant with midpoint and ordering rules.
