# Examples

Standalone host-integration scenarios demonstrating how to embed and interact
with the `sw-editor` web component, plus the end-to-end test harness used by
the Playwright scenario suite.

## Sub-packages

| Directory | Package | Description | Start command |
|-----------|---------|-------------|---------------|
| [`vanilla-js/`](./vanilla-js/) | `@sw-editor/example-vanilla-js` | Load a workflow fixture and export it as JSON/YAML | `pnpm --filter @sw-editor/example-vanilla-js dev` |
| [`host-events/`](./host-events/) | `@sw-editor/example-host-events` | Subscribe to diagnostics and capability events | `pnpm --filter @sw-editor/example-host-events dev` |
| [`e2e-harness/`](./e2e-harness/) | `@sw-editor/example-e2e-harness` | Vite app used as the target for Playwright end-to-end Scenarios 1–5 | `pnpm --filter @sw-editor/example-e2e-harness dev` |

## e2e-harness

`example/e2e-harness/` is the Vite application that serves as the test target
for the root-level Playwright suite (`playwright.config.ts`). It hosts the
`<sw-editor>` web component with all DOM affordances required by the five
quickstart validation scenarios:

| Scenario | Description |
|----------|-------------|
| Scenario 1 | Create New Workflow — "New Workflow" button resets the editor via the `sw:create` event |
| Scenario 2 | Insert And Edit Task — insertion affordance buttons (`+`) and task-type menu appear on each graph edge |
| Scenario 3 | Load Existing YAML — "Load" button calls `editor.loadSource()` with pasted YAML |
| Scenario 4 | Diagnostics Flow — source textarea triggers live validation; results appear in the diagnostics live region |
| Scenario 5 | Privacy Guardrail — editor operates entirely offline with no external network requests |

The harness is built and served by the root `playwright.config.ts` `webServer`
entry before each test run:

```bash
pnpm --filter @sw-editor/example-e2e-harness build
pnpm --filter @sw-editor/example-e2e-harness preview   # serves on port 4173
```

To run the e2e suite:

```bash
pnpm test:e2e
```

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
