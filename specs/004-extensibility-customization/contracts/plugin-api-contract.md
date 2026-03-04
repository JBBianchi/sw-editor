# Contract: Plugin API

## Lifecycle API

- `registerPlugin(plugin): Promise<void>`
- `unregisterPlugin(pluginId): Promise<void>`
- `getPluginInfo(pluginId?)`

## Core Contribution Registries

- `registerCommand(id, handler)`
- `registerValidationRule(rule)`

## UI Contribution Registries

- `registerNodeRenderer(taskKind, factory, options?)`
- `registerPropertyEditor(taskKind, factory)`
- `registerToolbarAction(action)`

Node renderer registration options:

- `options.target`: `portable | rete-lit | react-flow` (defaults to `portable`)

## Slot Extension Points

- `toolbar-start`
- `toolbar-end`
- `panel-header`
- `panel-footer`
- `overlay`
- `status-bar`

## Operational Rules

- Plugin callbacks are wrapped in safe invocation boundaries.
- Duplicate contribution keys resolve with last-registered-wins policy.
- Plugin timeouts and budget violations are surfaced to host observability channels.
- Node renderer contribution fallback order is deterministic:
  - exact renderer target match
  - `portable` renderer contribution
  - built-in default renderer
