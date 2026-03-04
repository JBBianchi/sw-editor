# Feature Specification: Nested Tasks UX

**Feature Branch**: `002-nested-tasks-ux`  
**Created**: 2026-03-02  
**Status**: Draft  
**Input**: User description: "Visual authoring support for nested task structures with expanded default rendering"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Nested Task Structures (Priority: P1)

A workflow author can create nesting-capable tasks and add child tasks within those scopes.

**Why this priority**: Nested structures are required for real-world workflows.

**Independent Test**: Create nested `do` and `for` flows and verify source output.

**Acceptance Scenarios**:

1. **Given** a workflow graph, **When** a user adds a nesting-capable task, **Then** the editor allows insertion of child tasks inside it.
2. **Given** nested child tasks, **When** the workflow is exported, **Then** nested structure is serialized correctly.

---

### User Story 2 - Understand Current Context While Editing (Priority: P2)

A workflow author can identify whether they are editing root scope or nested scope.

**Why this priority**: Context clarity prevents authoring mistakes.

**Independent Test**: Navigate nested structures and verify visual context cues.

**Acceptance Scenarios**:

1. **Given** a nested graph, **When** a task is selected, **Then** panel and graph cues indicate its scope.

---

### User Story 3 - Preserve Expanded View Baseline (Priority: P3)

A workflow author sees nested structures inline by default without context-switching modes.

**Why this priority**: Expanded view is the baseline UX commitment for MVP.

**Independent Test**: Load nested workflow fixtures and verify inline rendering.

**Acceptance Scenarios**:

1. **Given** workflows with nested tasks, **When** loaded, **Then** nested structures render inline in expanded mode.
2. **Given** the same nested workflow fixture, **When** rendered in `rete-lit` and `react-flow` bundles, **Then** nested expanded rendering behavior and scope cues are equivalent.

---

### Edge Cases

- Deeply nested task hierarchies.
- Transition resolution at nested scope boundaries.
- Deleting parent nested tasks with existing children.
- Mixed nested structures across different task kinds.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support nested task creation for nesting-capable task kinds.
- **FR-002**: System MUST render nested task structures inline in expanded mode by default.
- **FR-003**: System MUST avoid synthetic nested entry/exit nodes.
- **FR-004**: System MUST show unambiguous root vs nested scope context in UI.
- **FR-005**: System MUST preserve nested structural correctness on export.
- **FR-006**: System MUST preserve nested transitions according to scope rules.

### Key Entities *(include if feature involves data)*

- **ScopePath**: Hierarchical reference to a task list scope.
- **NestedTaskContainer**: Task with child task list semantics.
- **ContextMarker**: UI metadata that communicates current editing scope.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of baseline nested fixtures render in expanded mode without mode switches.
- **SC-002**: Nested authoring and export pass structural validation in all acceptance test cases.
- **SC-003**: At least 90% of test users correctly identify editing scope during moderated UX checks.
