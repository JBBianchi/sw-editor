# Spec Kit Features

This repository now uses GitHub Spec Kit feature packages under `specs/`.

## Feature Set

| Feature | Status | One-Line Summary |
|---------|--------|-----------------|
| [`001-visual-authoring-mvp`](001-visual-authoring-mvp/) | Implementation complete | Embeddable visual authoring for Serverless Workflow with source round-trip, insertion UX, live diagnostics, and runnable example apps. |
| [`002-nested-tasks-ux`](002-nested-tasks-ux/) | Planned | Visual authoring support for nested task structures with expanded default rendering. |
| [`003-branching-control-flow`](003-branching-control-flow/) | Planned | Panel-driven authoring for transition, if, switch, fork, and try-catch behavior with route projection. |
| [`004-extensibility-customization`](004-extensibility-customization/) | Planned | Plugin architecture for custom rendering, validation, commands, and slot-based UI extensions. |
| [`005-align-example-demo`](005-align-example-demo/) | Implemented | Consolidate `demo/` into `example/e2e-harness/` with package `@sw-editor/example-e2e-harness` under the unified `example/` top-level directory. |
| [`006-fix-insert-layout`](006-fix-insert-layout/) | Draft | Correct insertion affordance placement on edges and keep newly inserted nodes visually positioned between their intended neighbors. |

Each feature package contains:

- `spec.md`
- `plan.md`
- `research.md`
- `data-model.md`
- `contracts/`
- `quickstart.md`
- `tasks.md`

Rendering strategy note:
- Visual authoring specs now target two renderer backends (`rete-lit` and `react-flow`) with parity and comparison criteria to support evidence-based renderer selection.

## Feature 001 — Test Coverage Summary

All seven acceptance scenarios in `spec.md` are covered by automated tests.

| Layer | Test Files |
|-------|-----------|
| Unit / integration (vitest) | `tests/integration/quickstart-scenarios.spec.ts`, `tests/integration/workflow-roundtrip.spec.ts`, `tests/integration/validation-latency.spec.ts`, `tests/integration/renderer-mvp-parity.spec.ts` |
| Contract (vitest) | `tests/contract/editor-diagnostics.contract.spec.ts`, `tests/contract/renderer-capabilities.contract.spec.ts` |
| E2E accessibility (Playwright) | `tests/e2e/accessibility-mvp.spec.ts` |
| E2E example apps (Playwright) | `example/tests/vanilla-js.spec.ts`, `example/tests/host-events.spec.ts` |

### Example Applications

Two runnable integration demos live under `example/`:

- **`example/vanilla-js/`** — load/export workflow via host-client API; run with `pnpm exec vite --port 5174` inside that directory.
- **`example/host-events/`** — event subscription and capability query patterns; run with `pnpm exec vite --port 5175` inside that directory.

Run the full example Playwright suite from the repo root:

```sh
pnpm test:examples
# or
pnpm exec playwright test --config example/playwright.config.ts
```
