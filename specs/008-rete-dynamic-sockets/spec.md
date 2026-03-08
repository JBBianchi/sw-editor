# Feature Specification: Rete Dynamic Socket Orientation

**Feature Branch**: `008-rete-dynamic-sockets`  
**Created**: 2026-03-07  
**Status**: Implemented  
**Input**: User description: "Implement orientation-aware socket placement for rete-lit using a custom Lit node renderer so input/output sockets move with layout direction, with parity checks against midpoint insertion guarantees."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Orientation-Correct Socket Placement In Rete (Priority: P1)

A workflow author using the `rete-lit` renderer sees socket placement that matches graph direction: top/bottom for top-to-bottom and left/right for left-to-right.

**Why this priority**: Incorrect socket sides make edge direction ambiguous and reduce editing trust.

**Independent Test**: Render the same graph in both orientations in `rete-lit`, verify every rendered edge uses expected source/target socket sides.

**Acceptance Scenarios**:

1. **Given** `top-to-bottom` orientation, **When** nodes render in `rete-lit`, **Then** every source endpoint is on the source-node bottom side and every target endpoint is on the target-node top side.
2. **Given** `left-to-right` orientation, **When** nodes render in `rete-lit`, **Then** every source endpoint is on the source-node right side and every target endpoint is on the target-node left side.

---

### User Story 2 - Orientation Switching Remains Stable (Priority: P2)

A workflow author can toggle orientation repeatedly and keep correct socket-side bindings without midpoint-anchor regressions.

**Why this priority**: Correct initial placement is insufficient if toggle cycles drift or regress insertion alignment.

**Independent Test**: Perform TB -> LR -> TB switch cycles and validate all-edge socket sides plus midpoint affordance tolerance.

**Acceptance Scenarios**:

1. **Given** a graph with multiple edges, **When** orientation changes TB -> LR -> TB, **Then** port-side expectations remain correct after each switch.
2. **Given** orientation switches occur, **When** insertion affordances are re-read, **Then** midpoint tolerance checks remain within 6 px for all visible edges.

## Edge Cases

- Graphs containing boundary nodes and task nodes with uneven branch depth.
- Repeated orientation toggles without intermediate inserts.
- Mixed renderer matrix execution (`rete-lit` and `react-flow`) where only `rete-lit` changes implementation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `rete-lit` MUST render input/output sockets using orientation-dependent placement rules:
  - `top-to-bottom`: inputs top, outputs bottom
  - `left-to-right`: inputs left, outputs right
- **FR-002**: Orientation-dependent socket placement MUST apply to all rendered nodes in `rete-lit` (boundary and task nodes).
- **FR-003**: `rete-lit` MUST use a custom Lit node renderer with real `rete-ref` socket entries so connection endpoints derive from rendered socket DOM positions.
- **FR-004**: `setOrientation()` in `rete-lit` MUST trigger re-rendering so socket placement updates immediately for the active graph.
- **FR-005**: Existing midpoint insertion-anchor behavior MUST remain within current tolerance budgets after socket-renderer changes.
- **FR-006**: Existing test hooks needed by e2e and integration checks (node and socket markers) MUST remain available.

### Key Entities *(include if feature involves data)*

- **ReteNodePayload**: Node render payload consumed by custom Lit node templates.
- **NodeRenderMode**: Derived orientation render mode (`vertical` or `horizontal`) mapped from `OrientationMode`.
- **PortSideMeasurement**: Per-edge endpoint side classification used by integration/e2e assertions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In `rete-lit`, 100% of measured edges satisfy orientation-correct source/target side bindings for TB and LR orientations.
- **SC-002**: In TB -> LR -> TB regression checks, `rete-lit` preserves side-correct bindings after every switch.
- **SC-003**: Existing midpoint insertion-affordance checks continue to pass at 6 px tolerance in orientation-switch e2e scenarios.
