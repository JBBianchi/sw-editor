# Example: Vanilla JS

Demonstrates embedding the Serverless Workflow editor host-client in a
plain-HTML + TypeScript page.  Bundled by [Vite](https://vite.dev) so no
separate compile step is required before launching.

## What it shows

- Loading a workflow fixture (JSON) via a bundled import — no runtime network
  calls.
- Registering it as the active source with `setCurrentSource`.
- Exporting the workflow as JSON or YAML via `exportWorkflowSource`.
- How to embed `<sw-editor>` once a built editor bundle is available (see
  inline comments in `index.html`).

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
pnpm --filter @sw-editor/example-vanilla-js dev
```

The page is served at <http://localhost:5173> by default.

## Using the page

1. Click **"Load simple.json fixture"** — the `simple-http-call` workflow is
   parsed and registered as the active source.
2. Click **"Export as JSON"** or **"Export as YAML"** — the exported content
   appears in the output panel and is also logged to the browser console.

## File overview

| File | Purpose |
|------|---------|
| `index.html` | Entry HTML; includes notes on how to embed `<sw-editor>` |
| `main.ts` | Host integration logic using `@sw-editor/editor-host-client` |
| `vite.config.ts` | Vite config with workspace-package aliases |
| `package.json` | Scripts and workspace dependencies |
