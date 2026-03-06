# Feature Specification: Insert Layout Correction

**Feature Branch**: `006-fix-insert-layout`  
**Created**: 2026-03-06  
**Status**: Implementation Complete  
**Input**: User description: "The layouting consideration seems off. The (+) button between node should be placed along the edge between two nodes, and after adding a node, it's not appended between (start and end for instance) but "after" end (the edges are OK, it's just the layouting of the nodes, not their relation/link)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inserted Task Appears Between Intended Neighbors (Priority: P1)

A workflow author inserts a task on a connection and immediately sees the new task rendered between the two nodes that were previously connected.

**Why this priority**: The core insertion flow is misleading if the new task appears after the downstream node even though the underlying graph relation is correct.

**Independent Test**: Start with a simple linear workflow, insert a task on one connection, and verify the visual node order shows predecessor, inserted task, and successor in that sequence without manual repositioning.

**Acceptance Scenarios**:

1. **Given** a blank workflow showing only start and end nodes, **When** the user inserts a task on the connection between them, **Then** the new task is rendered between start and end rather than after end.
2. **Given** three nodes arranged in a linear flow, **When** the user inserts a task on the connection between the first and second nodes, **Then** the inserted task is rendered between those two nodes and the downstream nodes shift as needed to preserve the visible order.

---

### User Story 2 - Insertion Control Is Anchored To The Connection (Priority: P2)

A workflow author can tell exactly which connection will be split because the `+` insertion control is displayed on the connection itself instead of floating near a node.

**Why this priority**: Clear placement of the insertion control reduces ambiguity and prevents inserting on the wrong connection.

**Independent Test**: Open a workflow with visible connections, inspect each insertion control, and verify each control is shown on the corresponding connection and remains aligned after view changes.

**Acceptance Scenarios**:

1. **Given** two connected nodes are visible, **When** the editor renders the insertion control for their connection, **Then** the control is shown along that connection rather than attached to a node body or outside the connection path.
2. **Given** a workflow author pans, zooms, or otherwise refreshes the layout, **When** insertion controls are re-rendered, **Then** each control remains visually aligned with the connection it acts on.
3. **Given** insertion controls are visible, **When** a workflow author navigates using keyboard only, **Then** each control can be reached, activated, and announced with an accessible name that identifies its insert action.

---

### User Story 3 - Repeated Insertions Preserve Readable Flow (Priority: P3)

A workflow author can keep inserting tasks into a linear sequence without producing overlapping or visually reversed nodes.

**Why this priority**: A one-off correction is insufficient if the layout degrades again after several insertions in the same sequence.

**Independent Test**: Insert multiple tasks one after another into adjacent connections and verify each inserted task appears in sequence with readable spacing and no overlap.

**Acceptance Scenarios**:

1. **Given** a linear sequence with multiple tasks, **When** the user inserts tasks on adjacent connections in succession, **Then** the visual flow remains readable and each inserted task appears at the correct point in sequence.
2. **Given** available space is limited around the split connection, **When** a task is inserted, **Then** surrounding nodes are repositioned enough to prevent overlap while preserving the visible order of the sequence.

### Edge Cases

- Inserting the first task on the initial start-to-end connection.
- Inserting on a connection whose neighboring nodes were already repositioned by a previous insertion.
- Re-rendering the canvas after a zoom or pan change while insertion controls are visible.
- Inserting into a dense linear sequence where spacing must expand to avoid node overlap.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display the insertion control at the midpoint of the visible connection path, or the nearest stable equivalent point when the renderer cannot place it exactly at the midpoint.
- **FR-002**: System MUST keep each insertion control visually associated with its connection after layout refresh, pan, or zoom changes.
- **FR-003**: System MUST render a newly inserted task between the predecessor and successor nodes of the split connection.
- **FR-004**: System MUST preserve visible sequence order for boundary insertions, including inserting between start and end.
- **FR-005**: System MUST reposition surrounding nodes after insertion so node bounding boxes do not overlap and predecessor-to-successor left-to-right order remains visually preserved in linear flows.
- **FR-006**: System MUST preserve the intended graph relationships when correcting visual placement so the inserted task remains connected to the same predecessor and successor it split.
- **FR-007**: System MUST apply the same insertion-control placement and inserted-node ordering rules in the supported `react-flow` and `rete-lit` visual authoring views.
- **FR-008**: System MUST keep insertion controls keyboard operable and screen-reader understandable in every supported visual authoring view, including after pan, zoom, and repeated insertion updates.
- **FR-009**: System MUST move keyboard focus to the newly inserted task (or its first interactive field) immediately after insertion in every supported visual authoring view.

### Key Entities *(include if feature involves data)*

- **Insertion Control**: The visual affordance a workflow author activates to split an existing connection and add a task.
- **Graph Connection**: The visible link between two adjacent workflow nodes that represents where insertion can occur.
- **Visual Sequence Slot**: The display position between two connected nodes where a newly inserted task is expected to appear.
- **Linear Flow Segment**: A contiguous predecessor-to-successor run of workflow nodes whose visible order must stay readable after insertion.

## Assumptions

- This feature corrects visual placement only and does not change task availability, insertion permissions, or graph-link semantics already defined for visual authoring.
- Automatic layout behavior is in scope for system-managed placement after insertion; manual node dragging behavior is outside this feature unless needed to preserve automatic readability.
- Validation of this feature will focus on blank and linear workflow segments because those are the scenarios described by the reported issue.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance tests covering blank and linear workflows, 100% of inserted tasks appear between the intended predecessor and successor immediately after insertion.
- **SC-002**: In acceptance tests covering visible insertion controls, 100% of controls are rendered at the midpoint of the connection they act on, or within 12 px of that midpoint when a renderer cannot place the control exactly on the path midpoint.
- **SC-003**: In acceptance tests covering repeated insertions, 100% of resulting node sequences preserve predecessor-to-successor order and produce no node bounding-box overlap.
- **SC-004**: A workflow author can insert a task into the initial start-to-end flow and confirm the intended position in under 5 seconds without manual repositioning.
- **SC-005**: In keyboard-driven end-to-end tests for both supported renderer views, focus lands on the newly inserted task within 500 ms after insertion in 100% of runs.
