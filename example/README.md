# Examples

Standalone host-integration scenarios demonstrating how to embed and interact
with the `sw-editor` web component.

## Scenarios

| Directory | Description | Start command |
|-----------|-------------|---------------|
| [`vanilla-js/`](./vanilla-js/) | Load a workflow fixture and export it as JSON/YAML | `pnpm --filter @sw-editor/example-vanilla-js dev` |
| [`host-events/`](./host-events/) | Subscribe to diagnostics and capability events | `pnpm --filter @sw-editor/example-host-events dev` |

## Prerequisites

- Node.js 24 LTS
- pnpm 10.30.3 (`corepack enable && corepack prepare`)

## Quick start

```bash
# From the repository root — installs all workspace packages including examples
pnpm install

# Start the vanilla-js example
pnpm --filter @sw-editor/example-vanilla-js dev

# Start the host-events example (in a separate terminal)
pnpm --filter @sw-editor/example-host-events dev
```

Both examples are served at <http://localhost:5173> by default (Vite picks the
next available port when the first is occupied).

## No external network dependencies

All fixture data is bundled at build time.  Neither example makes runtime
requests to external hosts, satisfying the project constitution's
"no runtime network calls from editor core" principle.
