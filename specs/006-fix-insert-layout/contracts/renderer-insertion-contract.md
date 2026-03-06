# Contract: Renderer Insertion Affordances

## Shared Rules

- `WorkflowGraph.nodes` order is the canonical visual sequence for linear authoring flows.
- A renderer must expose one insertion anchor per visible eligible edge, keyed by the workflow graph edge ID.
- Each insertion anchor represents the edge midpoint, or the closest stable equivalent point on the rendered connection path.
- Anchor lifecycle follows edge lifecycle: add on edge render, refresh on graph or viewport changes, remove on edge disposal or renderer disposal.
- Post-insert node focus is a best-effort renderer action keyed by node ID and must not mutate workflow data.

## Web Component Responsibilities

- `InsertionUI` attaches its `+` control to renderer-provided edge anchors rather than arbitrary node containers.
- The task-type menu remains renderer-neutral and continues to own keyboard navigation, selection events, and workflow-changed emission.
- When an insertion succeeds, the web component updates its local graph reference before the next renderer refresh cycle.

## React Flow Responsibilities

- `react-flow` provides edge-local anchors using a custom edge overlay or label renderer positioned from the connection path midpoint.
- Anchor positions refresh automatically when React Flow re-renders due to graph updates, pan, or zoom changes.
- The renderer exposes a node-focus operation that can bring the inserted node into view and direct DOM focus to its rendered element.

## Rete Responsibilities

- `rete-lit` provides edge-local anchors using a connection overlay that remains synchronized with the area transform.
- Anchor positions refresh after graph rebuilds and viewport transform changes.
- The renderer exposes a node-focus operation that can center and focus the inserted node after insertion.

## Parity Rules

- Midpoint placement tolerance is at most 12 px from the geometric midpoint of the rendered connection path in either axis.
- The same workflow edge must yield the same insertion target semantics in both renderer bundles.
- Boundary insertions, including start-to-end insertion in a blank workflow, must place the control on the boundary edge and render the inserted node in the same predecessor/new/successor order across renderers.
