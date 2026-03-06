# Research: Insert Layout Correction

## Decision 1: Preserve insertion order in `WorkflowGraph.nodes`

- **Decision**: Update insertion logic so a newly created task node is inserted into `graph.nodes` immediately after the split edge's source node instead of being appended to the end of the array.
- **Rationale**: Both renderer backends currently derive default left-to-right placement directly from `WorkflowGraph.nodes` order, so fixing the canonical ordered graph once in editor-core restores correct visual sequence in every renderer without changing edge semantics.
- **Alternatives considered**:
  - Keep appending and special-case placement in each renderer: rejected because it duplicates ordering logic and risks backend drift.
  - Add persisted x/y coordinates to the core graph: rejected because it mixes renderer projection concerns into the headless core model.

## Decision 2: Keep renderer layout simple and sequence-driven

- **Decision**: Continue using the existing simple left-to-right auto-layout in both renderers, but treat the ordered graph sequence as the source of truth for linear insertion flows.
- **Rationale**: The reported bug is caused by incorrect ordering, not by a missing general-purpose auto-layout engine. Preserving the lightweight layout keeps implementation small and predictable while still shifting downstream nodes after insertion.
- **Alternatives considered**:
  - Introduce a graph layout engine such as Dagre or ELK: rejected as unnecessary scope and added complexity for a linear-flow correction.

## Decision 3: Add an additive renderer insertion-affordance bridge

- **Decision**: Extend the shared renderer contract with additive hooks for edge-affordance registration and best-effort node focusing after insertion.
- **Rationale**: `InsertionUI` already expects edge-local anchors and post-insert focus, but no renderer-neutral contract exists for either behavior. Defining those hooks explicitly is less brittle than querying renderer DOM internals from the web component.
- **Alternatives considered**:
  - Let the web component scrape renderer DOM structure: rejected because renderer markup differs across backends and would create fragile coupling.
  - Keep insertion UI renderer-specific: rejected because the web component already owns insertion menu behavior and event emission.

## Decision 4: Render the `+` control at edge midpoints per backend

- **Decision**: Implement edge-local insertion anchors using each renderer's native connection overlay mechanism: React Flow edge labels for `react-flow` and connection overlays tied to area transforms for `rete-lit`.
- **Rationale**: Midpoint overlays keep the control visually associated with the connection it splits and allow repositioning to stay synchronized with pan, zoom, and graph refresh behavior.
- **Alternatives considered**:
  - Place the button near source or target nodes: rejected because it is ambiguous when several edges converge near a node.
  - Use a global floating toolbar triggered by edge selection: rejected because it adds an extra interaction step and weakens discoverability.

## Decision 5: Preserve existing insertion menu accessibility behavior

- **Decision**: Reuse the existing keyboard-operable insertion menu and focus handoff flow, changing only where the affordance is anchored.
- **Rationale**: The current `InsertionUI` already satisfies the feature's accessibility baseline for menu interaction; the required change is the anchor lifecycle and positioning, not a new command surface.
- **Alternatives considered**:
  - Replace the menu with pointer-only inline chips: rejected because it would violate the constitution's accessibility requirement for core authoring flows.
