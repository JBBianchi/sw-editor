# Quickstart Validation: Extensibility Customization

## Scenario 1: Lifecycle Basics

1. Register a plugin with setup and teardown hooks.
2. Verify active state.
3. Unregister plugin.

Expected: activation and deactivation events emitted; teardown executes once.

## Scenario 2: Fault Isolation

1. Register plugin with setup that throws.
2. Verify plugin fault state and event payload.
3. Continue editing workflow.

Expected: editor remains functional and plugin is marked faulted.

## Scenario 3: Behavioral Contributions

1. Register command contribution and dispatch it.
2. Register validation rule with `EXT-` rule ID.
3. Trigger validation.

Expected: command executes and diagnostics include plugin rule output.

## Scenario 4: UI Contributions

1. Register node renderer for a task kind.
2. Add toolbar action contribution.
3. Mount slot component in `toolbar-end`.

Expected: node rendering, toolbar action, and slot UI all integrate without core modifications.
