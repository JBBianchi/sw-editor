# Data Model: Extensibility Customization

## Entities

### EditorPlugin

- **Fields**:
  - `id`: string
  - `setup(ctx)`
  - `teardown?()`
- **Rules**:
  - Plugin IDs must be unique in active registry.

### PluginContext

- **Fields**:
  - command dispatch API
  - typed registry APIs
  - selection and workflow accessors
  - logger and disposable store
- **Rules**:
  - Context must not expose unrestricted internal mutation primitives.

### PluginInfo

- **Fields**:
  - `id`
  - `state`: `active | deactivated | faulted`
  - `faultReason?`
- **Rules**:
  - State transitions emit lifecycle events.

### ContributionEntry

- **Fields**:
  - `type`
  - `key`
  - `pluginId`
  - `registeredAt`
- **Rules**:
  - Duplicate keys follow deterministic conflict policy.

### PluginBudget

- **Fields**:
  - callback timeout thresholds
  - render budget hints
- **Rules**:
  - Budget violations result in warnings and fault handling as configured.
