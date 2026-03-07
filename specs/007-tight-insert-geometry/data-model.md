# Data Model: Tight Insert Geometry

## Entities

### OrientationMode

- **Fields**:
  - `id`: `top-to-bottom | left-to-right`
  - `rankDirection`: `TB | LR`
  - `inPortSide`: `top | left`
  - `outPortSide`: `bottom | right`
- **Rules**:
  - Orientation is required for each layout computation.
  - Port sides are fully derived from orientation and must not vary per node kind unless explicitly documented.

### LayoutNodeFrame

- **Fields**:
  - `nodeId`: string
  - `x`: number
  - `y`: number
  - `width`: number
  - `height`: number
  - `inPortSide`: `top | bottom | left | right`
  - `outPortSide`: `top | bottom | left | right`
- **Rules**:
  - Node coordinates are deterministic for identical graph and orientation inputs.
  - No two node bounding boxes may overlap in supported fixture scopes.

### LayoutEdgeFrame

- **Fields**:
  - `edgeId`: string
  - `sourceNodeId`: string
  - `targetNodeId`: string
  - `midpointX`: number
  - `midpointY`: number
- **Rules**:
  - Midpoint must represent the rendered edge path midpoint or nearest stable equivalent.
  - Edge frame identity must remain stable while the edge remains present.

### EdgeInsertionAnchor

- **Fields**:
  - `edgeId`: string
  - `x`: number
  - `y`: number
  - `sourceNodeId`: string
  - `targetNodeId`: string
  - `active`: boolean
- **Rules**:
  - Exactly one active insertion anchor exists per eligible visible edge.
  - Anchor lifecycle follows edge lifecycle: create, refresh, remove.
  - Anchor coordinates must never default to viewport-fixed placeholders for active graph edges.

### LayoutSnapshot

- **Fields**:
  - `rendererId`: `react-flow | rete-lit`
  - `orientation`: `top-to-bottom | left-to-right`
  - `nodes`: `LayoutNodeFrame[]`
  - `edges`: `LayoutEdgeFrame[]`
  - `capturedAtRevision`: number
- **Rules**:
  - Snapshot values are sufficient for midpoint, overlap, and port-side assertions.
  - Snapshot generation must not mutate graph state.
  - Repeated snapshots for unchanged input must remain deterministic within defined tolerance.

### GeometryMeasurement

- **Fields**:
  - `edgeId`: string
  - `anchorDeltaPx`: number
  - `overlapAreaPx2`: number
  - `portBindingValid`: boolean
- **Rules**:
  - `anchorDeltaPx` must satisfy feature tolerance budgets.
  - `overlapAreaPx2` must be zero for supported fixture scopes.
  - `portBindingValid` must be true for every measured edge.
