# Contract: Host Editor API (MVP)

## Methods

- `loadWorkflowSource(input)`
- `exportWorkflowSource(options?)`
- `validateWorkflow(options?)`
- `setSelection(selection)`
- `getCapabilities()`

## Events

- `workflowChanged`
- `editorSelectionChanged`
- `editorDiagnosticsChanged`
- `editorError`

## Payload Rules

- Event names are stable and unversioned.
- Payloads include explicit version fields for compatibility.
- `revision` counters are monotonic per editor instance.

## Capability Payload

Minimum capability data:

- `contractVersion`
- `targetVersion`
- `supportedVersions`
- `rendererId` (`rete-lit | react-flow`)
- `rendererCapabilities` (renderer-specific capability snapshot)
- feature flags for optional host behaviors

## Renderer Selection Model

- Renderer backend is selected by imported package/bundle at build time.
- Host runtime API does not support live renderer switching within an active editor instance.

## Validation Contract

- Editor owns validation execution.
- Host receives diagnostics as structured payloads.
- Host may trigger explicit full validation through API.

## Security and Privacy

- Editor does not perform network requests.
- Workflow source remains within host process boundaries unless host exports it.
