# Data Model: Insert Layout Correction

## Entities

### WorkflowGraph

- **Fields**:
  - `nodes`: ordered array of graph nodes
  - `edges`: ordered array of directed graph edges
- **Rules**:
  - `nodes` order is the canonical display sequence for linear authoring flows.
  - Inserting on an edge must preserve the existing edge endpoints while splicing the new task node into the correct sequence slot.
  - Boundary nodes remain stable sentinels for start and end positions.

### VisualSequenceSlot

- **Fields**:
  - `edgeId`: string
  - `predecessorNodeId`: string
  - `successorNodeId`: string
  - `insertIndex`: number
- **Rules**:
  - Each visible insertion opportunity maps to exactly one split edge.
  - `insertIndex` identifies where the new task should appear in the ordered node list after insertion.
  - Boundary insertions, including `__start__ -> __end__`, must produce a valid slot.

### InsertionControl

- **Fields**:
  - `edgeId`: string
  - `ariaLabel`: string
  - `menuOpen`: boolean
  - `rendererId`: `react-flow | rete-lit`
- **Rules**:
  - At most one insertion control is rendered per eligible visible edge.
  - The control must stay visually associated with its edge during pan, zoom, and graph refresh operations.
  - Activating the control opens the existing task-type menu without changing graph semantics.

### RendererEdgeAnchor

- **Fields**:
  - `edgeId`: string
  - `rendererId`: `react-flow | rete-lit`
  - `anchorKind`: `edge-midpoint`
  - `active`: boolean
- **Rules**:
  - Anchors are created and disposed with the renderer edge lifecycle.
  - Stale anchors must be removed when an edge disappears or a renderer is disposed.
  - Anchor updates must follow viewport transforms so controls remain aligned with the represented connection.

### FocusTarget

- **Fields**:
  - `nodeId`: string
  - `reason`: `post-insert`
- **Rules**:
  - After a successful insertion, focus targets the newly inserted node.
  - Focus requests are best-effort renderer operations and must not change graph data if focus fails.
