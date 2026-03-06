# Example: Host Events

Demonstrates subscribing to Serverless Workflow editor events and querying
renderer capabilities using the host–editor contract API.

## What it shows

- Subscribing to `workflowChanged`, `editorDiagnosticsChanged`,
  `editorSelectionChanged`, and `editorError` events via `addEventListener`.
- Displaying received events in a live event log.
- Querying the renderer capability snapshot (`getCapabilities`).
- How a real integration wires listeners on the `<sw-editor>` element (see
  inline comments in `index.html`).

For the standalone demo, events are simulated using `EventBridge` on a plain
`EventTarget`.  In a real integration the bridge is internal to the editor
bundle — the host only calls `addEventListener` on the mounted element.

## Prerequisites

- Node.js 24 LTS
- pnpm 10.30.3 (managed via Corepack: `corepack enable && corepack prepare`)

## Start

From the **repository root**, install dependencies once:

```bash
pnpm install
```

Then start the dev server for this example:

```bash
pnpm --filter @sw-editor/example-host-events dev
```

The page is served at <http://localhost:5173> by default.

## Using the page

| Button | What it does |
|--------|-------------|
| Simulate workflow load event | Fires a `workflowChanged` event |
| Simulate diagnostics event | Fires `editorDiagnosticsChanged` with one warning |
| Simulate selection event | Fires `editorSelectionChanged` for a node |
| Simulate error event | Fires `editorError` for a renderer init failure |
| Query capabilities | Populates the renderer capabilities table |
| Clear log | Resets the event log |

All received events appear in the **Event log** panel with a timestamp and
payload summary.

## File overview

| File | Purpose |
|------|---------|
| `index.html` | Entry HTML with event-log and capabilities UI |
| `main.ts` | Event subscription, simulation buttons, capability rendering |
| `vite.config.ts` | Vite config with workspace-package aliases |
| `package.json` | Scripts and workspace dependencies |
