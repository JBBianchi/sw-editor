# Data Model: Visual Authoring MVP

## Entities

### WorkflowSource

- **Fields**:
  - `format`: `json | yaml`
  - `content`: string
- **Rules**:
  - Input must parse before model projection.
  - Export must preserve semantic and structural correctness.

### WorkflowGraph

- **Fields**:
  - `nodes`: array of graph nodes
  - `edges`: array of graph edges
- **Rules**:
  - New graph starts with synthetic start and end nodes connected.
  - Insert operations must keep graph connectivity valid.

### GraphNode

- **Fields**:
  - `id`: string
  - `kind`: task kind or synthetic boundary kind
  - `taskReference`: string (for task nodes)
- **Rules**:
  - Task node identity must stay stable across non-destructive edits.

### EditorSelection

- **Fields**:
  - `kind`: `node | edge`
  - `node` or `edge` payload
- **Rules**:
  - Selection changes drive panel context.
  - Null selection means workflow-level panel state.

### ValidationDiagnostic

- **Fields**:
  - `ruleId`: string
  - `severity`: `error | warning | info`
  - `message`: string
  - `location`: pointer/path reference
- **Rules**:
  - Diagnostics must be serializable and host-consumable.
  - Unknown field mapping falls back to node and panel summary display.

### RendererId

- **Fields**:
  - value: `rete-lit | react-flow`
- **Rules**:
  - Exactly one renderer ID is active per editor bundle.
  - Renderer selection is build-time and fixed for the editor instance lifecycle.

### RendererCapabilitySnapshot

- **Fields**:
  - `rendererId`: `RendererId`
  - `rendererVersion`: string
  - `supportsNodeRendererPlugins`: boolean
  - `supportsNestedInlineProjection`: boolean
  - `supportsRouteOverlayProjection`: boolean
  - `knownLimits?`: array of strings
- **Rules**:
  - Capabilities must describe renderer backend behavior, not workflow semantics.
  - Backward-compatible capability expansion is allowed.

### CapabilitySnapshot

- **Fields**:
  - `contractVersion`
  - `targetVersion`
  - `supportedVersions`
  - `rendererId`: `RendererId`
  - `rendererCapabilities`: `RendererCapabilitySnapshot`
- **Rules**:
  - Capability payload must remain stable for host compatibility checks.
  - Renderer metadata must align with the active bundle backend.
