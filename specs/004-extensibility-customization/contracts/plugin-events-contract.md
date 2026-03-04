# Contract: Plugin Lifecycle Events

## Events

- `pluginActivated`
- `pluginDeactivated`
- `pluginFaulted`

## Common Payload Fields

- `version`
- `revision`
- `pluginId`
- `timestamp`
- `rendererId` (`rete-lit | react-flow`) when event phase is renderer-coupled

## Fault Payload Fields

Additional fields for `pluginFaulted`:

- `reason`
- `phase` (setup, command, renderer, validator, teardown)
- `recoverable`
- `rendererId` for renderer-phase faults

## Compatibility Rules

- Event names are stable.
- Backward-compatible payload expansion is allowed in minor versions.
- Removal or semantic redefinition requires major version increment.
