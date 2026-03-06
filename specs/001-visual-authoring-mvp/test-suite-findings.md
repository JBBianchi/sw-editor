# Test Suite Audit Findings — Task #94

**Date**: 2026-03-06
**Branch**: `task/94-task-test-suite-audit-run-full-test-suite`

## Baseline Pass/Fail Record

### Vitest Unit + Contract + Integration Tests

Run command: `npx vitest run` from repo root (picks up `vitest.config.ts` workspace projects).

| Test File | Project | Tests | Status |
|---|---|---|---|
| `packages/editor-core/tests/revision.test.ts` | editor-core | 9 | PASS |
| `packages/editor-core/tests/diagnostics.test.ts` | editor-core | 14 | PASS |
| `packages/editor-core/tests/graph/bootstrap.test.ts` | editor-core | 7 | PASS |
| `packages/editor-core/tests/commands/insert-task.test.ts` | editor-core | 18 | PASS |
| `packages/editor-core/tests/validation/full-validator.test.ts` | editor-core | 19 | PASS |
| `packages/editor-core/tests/validation/live-validator.test.ts` | editor-core | 12 | PASS |
| `packages/editor-core/tests/source/source-service.test.ts` | editor-core | 16 | PASS |
| `packages/editor-core/tests/graph/project.test.ts` | editor-core | 28 | PASS |
| `packages/editor-web-component/tests/events/diagnostics.test.ts` | editor-web-component | 14 | PASS |
| `packages/editor-web-component/tests/events/bridge.test.ts` | editor-web-component | 15 | PASS |
| `packages/editor-web-component/tests/graph/insertion-ui.test.ts` | editor-web-component | 21 | PASS |
| `tests/contract/editor-diagnostics.contract.spec.ts` | contract-tests | 25 | PASS |
| `tests/contract/renderer-capabilities.contract.spec.ts` (T030) | contract-tests | 32 | PASS |
| `tests/integration/workflow-roundtrip.spec.ts` | integration-tests | 19 | PASS |
| `tests/integration/renderer-mvp-parity.spec.ts` | integration-tests | 53 | PASS |
| `tests/integration/validation-latency.spec.ts` | integration-tests | 23 | PASS |
| `tests/integration/quickstart-scenarios.spec.ts` | integration-tests | 31 | PASS |

**Total: 17 test files, 356 tests — all PASS. No skipped tests.**

### T030 Explicit Verification

`tests/contract/renderer-capabilities.contract.spec.ts` — **PASS** (32 tests).

Covers:
- `rete-lit` renderer `RendererCapabilitySnapshot` field validation
- `react-flow` renderer `RendererCapabilitySnapshot` field validation
- `createCapabilitySnapshot` factory field correctness
- Backward-compatible capability expansion scenarios
- SC-005 renderer parity (both adapters expose identical required fields with distinct `rendererId` values)

T030 marked `[x]` in `tasks.md`.

### `pnpm -r test` (Recursive Package Tests)

Running `pnpm -r test` executes each workspace package's own `test` script. Result: same package-level tests pass; the root-level contract and integration test projects in `vitest.config.ts` are **not** invoked by this command. Run `npx vitest run` from repo root to exercise those.

## Findings for Phase B

### Finding F001 — E2E tests require a running dev server (not runnable in CI without build+serve step)

**Files affected**:
- `tests/e2e/accessibility-mvp.spec.ts`

**Status**: NOT RUN — requires Playwright and a live server at `http://localhost:4173`.

**Details**: The Playwright config (`playwright.config.ts`) expects the editor served at `http://localhost:4173`. No server was started during this audit run. These tests must be run with `pnpm build && pnpm preview` (or equivalent) before invoking `npx playwright test`.

**Action needed**: Add a CI job step that builds and serves the app before running Playwright, or configure `webServer` in `playwright.config.ts` to auto-start the server.

### Finding F002 — `tests/e2e/quickstart-scenarios.spec.ts` does not exist

**Status**: FILE MISSING — the task description references this file, but it does not exist in the repository. The equivalent integration-level quickstart scenarios are covered by `tests/integration/quickstart-scenarios.spec.ts` (31 tests, all passing).

**Action needed**: Either create `tests/e2e/quickstart-scenarios.spec.ts` as a Playwright e2e counterpart, or update the task description to reference the integration file. This is a gap for Phase B if e2e quickstart coverage is required.

### Finding F003 — `editor-host-client` package reports no test files

**Status**: The `editor-host-client` package has a `vitest.config.ts` but no test files in its `packages/editor-host-client/` directory. The contract tests that exercise `editor-host-client` exports (e.g., `createCapabilitySnapshot`) live in `tests/contract/renderer-capabilities.contract.spec.ts` at the root level.

**Action needed**: No immediate action required if root-level contract coverage is sufficient. Document this as a known gap if package-level unit tests for `editor-host-client` are desired.

## Summary

| Category | Files | Tests | Status |
|---|---|---|---|
| Unit (editor-core) | 8 | 123 | ALL PASS |
| Unit (editor-web-component) | 3 | 50 | ALL PASS |
| Contract | 2 | 57 | ALL PASS |
| Integration | 4 | 126 | ALL PASS |
| E2E (Playwright) | 1 | unknown | NOT RUN (server required) |
| **Total (vitest)** | **17** | **356** | **ALL PASS** |
