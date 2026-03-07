# Feature Specification: Tight Insert Geometry

**Feature Branch**: `007-tight-insert-geometry`  
**Created**: 2026-03-07  
**Status**: Complete  
**Input**: User description: "Define strict, testable visual contracts for insertion affordance placement and layout orientation: the plus button must be centered on its target edge, remain aligned during pan/zoom, and graph layout must support deterministic orientation-aware port placement (top-bottom vs left-right) with measurable acceptance tolerances."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edge-Centered Insert Control (Priority: P1)

A workflow author sees each `+` insertion affordance directly on the edge it will split, so insert intent is always unambiguous.

**Why this priority**: Misplaced controls cause incorrect edits and immediate trust loss in visual authoring.

**Independent Test**: Render a graph with visible edges, measure each insertion control center against its edge midpoint, and verify tolerance is met in both supported renderer views.

**Acceptance Scenarios**:

1. **Given** two connected visible nodes, **When** the graph is rendered, **Then** exactly one insertion control appears for their edge and the control center is on the edge midpoint or within tolerance.
2. **Given** multiple visible edges, **When** insertion controls are rendered, **Then** each control is bound to exactly one edge ID and no duplicate controls exist for the same edge.
3. **Given** a control is activated by keyboard, **When** the user confirms a task type, **Then** the selected edge is split and the inserted task appears on that split path.

---

### User Story 2 - Stable Geometry Across View Changes (Priority: P2)

A workflow author can pan, zoom, and trigger re-layout without insertion controls drifting away from their target edges.

**Why this priority**: A correct initial position is insufficient if controls drift during normal navigation.

**Independent Test**: Capture midpoint deltas before and after pan/zoom and graph refresh events; verify all controls remain within tolerance and stale controls are removed.

**Acceptance Scenarios**:

1. **Given** insertion controls are visible, **When** the author pans or zooms, **Then** each control stays visually aligned with the same edge and remains within tolerance.
2. **Given** an insertion changes edge topology, **When** controls are refreshed, **Then** controls for removed edges are removed and new controls appear only for current eligible edges.
3. **Given** a renderer update cycle runs repeatedly, **When** anchor positions are recalculated, **Then** no control snaps to viewport-fixed fallback coordinates.

---

### User Story 3 - Orientation-Aware Deterministic Layout (Priority: P3)

A workflow author can switch graph orientation and get predictable node placement with port sides that match flow direction.

**Why this priority**: Readability degrades when node ports and edge flow disagree with orientation.

**Independent Test**: Run the same graph in top-to-bottom and left-to-right modes, verify port-side rules, node ordering, and deterministic layout outputs across repeated runs.

**Acceptance Scenarios**:

1. **Given** top-to-bottom orientation, **When** layout is applied, **Then** outgoing ports are on bottom sides, incoming ports are on top sides, and edges flow top-to-bottom.
2. **Given** left-to-right orientation, **When** layout is applied, **Then** outgoing ports are on right sides, incoming ports are on left sides, and edges flow left-to-right.
3. **Given** the same graph input and orientation, **When** layout is computed multiple times, **Then** node and edge geometry is deterministic within the defined tolerance.

---

### Edge Cases

- Inserting on the only edge in a blank flow (`start -> end`).
- Rapid consecutive insertions on adjacent edges before visual settling completes.
- Pan/zoom events firing while controls are being reattached after graph update.
- Switching orientation on a graph containing both boundary nodes and multiple task nodes.
- Dense linear sequences where default spacing risks node overlap.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render one insertion control per eligible visible edge, keyed by edge ID.
- **FR-002**: System MUST place each insertion control at the geometric midpoint of its visible edge path, or nearest stable equivalent when exact midpoint sampling is unavailable.
- **FR-003**: System MUST keep insertion controls associated with the same edge after pan, zoom, graph refresh, and repeated insertion cycles.
- **FR-004**: System MUST remove insertion controls for edges no longer present in the rendered graph.
- **FR-005**: System MUST ensure insertion controls are keyboard operable with accessible naming for insert action.
- **FR-006**: System MUST insert a new task between predecessor and successor of the split edge while preserving graph link semantics.
- **FR-007**: System MUST support at least two layout orientations: top-to-bottom and left-to-right.
- **FR-008**: System MUST apply orientation-specific port-side rules:
  - top-to-bottom: incoming on top, outgoing on bottom
  - left-to-right: incoming on left, outgoing on right
- **FR-009**: System MUST apply a deterministic directed-graph layout strategy so repeated runs with identical input and orientation produce stable geometry.
- **FR-010**: System MUST prevent node bounding-box overlap after insertion and re-layout for the acceptance fixture matrix: `insert-geometry-tb.json`, `insert-geometry-lr.json`, and `insert-geometry-dense.json`.
- **FR-011**: System MUST enforce the same geometry, insertion, and orientation rules in both supported renderer views.
- **FR-012**: System MUST expose measurable geometry outputs needed for automated midpoint, port-side, and overlap assertions.

### Key Entities *(include if feature involves data)*

- **EdgeInsertionAnchor**: A renderer-reported anchor binding an edge ID to insertion-control coordinates.
- **OrientationMode**: The selected flow direction (`top-to-bottom` or `left-to-right`) used to drive layout and port-side behavior.
- **PortBinding**: The incoming/outgoing side assignment for a rendered node under a specific orientation.
- **LayoutSnapshot**: A point-in-time set of node coordinates and edge geometry used for deterministic and overlap checks.
- **GeometryMeasurement**: A computed metric used in validation (midpoint delta, overlap area, port-side correctness).

## Assumptions

- This feature defines visual and behavioral contracts; renderer internals remain implementation-specific.
- Manual drag placement behavior is out of scope unless needed to preserve required insertion geometry guarantees after automatic layout refresh.
- Validation must run in both supported renderer views using automated tests, not manual-only checks.
- Acceptance scope for overlap and determinism assertions is explicitly bounded to the fixture matrix: `insert-geometry-tb.json`, `insert-geometry-lr.json`, and `insert-geometry-dense.json`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In automated acceptance tests, 100% of insertion controls are within 6 px Euclidean distance of their target edge midpoint in both supported renderer views.
- **SC-002**: In automated pan/zoom and refresh tests, 100% of insertion controls remain within 6 px of their target edge midpoint after each view change.
- **SC-003**: In automated orientation tests, 100% of rendered edges use orientation-correct incoming/outgoing port sides.
- **SC-004**: In automated layout tests for `insert-geometry-tb.json`, `insert-geometry-lr.json`, and `insert-geometry-dense.json` (up to 25 visible nodes), 0 node bounding-box overlaps are detected after insertion and layout.
- **SC-005**: In deterministic layout tests for `insert-geometry-tb.json`, `insert-geometry-lr.json`, and `insert-geometry-dense.json`, repeated layout runs on identical input/orientation produce node coordinates with no more than 1 px deviation per axis.
- **SC-006**: In keyboard-driven tests, insertion from edge affordance to focus landing on the inserted task succeeds in 100% of runs within 500 ms after confirm action.
