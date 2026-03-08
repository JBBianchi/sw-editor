# Baseline: Insert Geometry E2E Failures (Task #430)

Date (UTC): 2026-03-07

## Scope

Executed the two target suites across all Playwright browser projects:

- `tests/e2e/insert-layout-affordance.spec.ts`
- `tests/e2e/insert-layout-orientation.spec.ts`
- Projects: `chromium`, `firefox`, `webkit`

## Commands Used

- `pnpm exec playwright test tests/e2e/insert-layout-affordance.spec.ts --project=<browser> --reporter=line`
- `pnpm exec playwright test tests/e2e/insert-layout-orientation.spec.ts --project=<browser> --reporter=line`

## Run Matrix and Baseline Counts

| Spec | Browser | Start (UTC) | End (UTC) | Exit | Baseline failures |
|---|---|---|---|---:|---:|
| `insert-layout-affordance.spec.ts` | `chromium` | 2026-03-07T15:24:11Z | 2026-03-07T15:24:59Z | 1 | 5 |
| `insert-layout-affordance.spec.ts` | `firefox` | 2026-03-07T15:24:59Z | 2026-03-07T15:25:53Z | 1 | 5 |
| `insert-layout-affordance.spec.ts` | `webkit` | 2026-03-07T15:25:53Z | 2026-03-07T15:26:43Z | 1 | 5 |
| `insert-layout-orientation.spec.ts` | `chromium` | 2026-03-07T15:26:43Z | 2026-03-07T15:27:23Z | 1 | 4 |
| `insert-layout-orientation.spec.ts` | `firefox` | 2026-03-07T15:27:23Z | 2026-03-07T15:28:04Z | 1 | 4 |
| `insert-layout-orientation.spec.ts` | `webkit` | 2026-03-07T15:28:04Z | 2026-03-07T15:28:43Z | 1 | 4 |

Baseline totals for this task run:

- `insert-layout-affordance.spec.ts`: 15 failures total (5 per browser)
- `insert-layout-orientation.spec.ts`: 12 failures total (4 per browser)
- Combined: 27 failures across the 6 targeted runs

## Failure Signatures

### A) `insert-layout-affordance.spec.ts` (all 3 browsers)

Observed recurring signatures:

- `locator.boundingBox: Test timeout of 30000ms exceeded`
- `expect(locator).toBeFocused() failed`
  - Locator: `locator('button[aria-label=\"Insert task\"]').first()`
  - Expected: `focused`
  - Received: `inactive`
  - Assertion site: `tests/e2e/insert-layout-affordance.spec.ts:364`

Representative stack fragment:

```text
await expect(affordance).toBeFocused();
at /workspace/worktrees/430/tests/e2e/insert-layout-affordance.spec.ts:364:32
```

### B) `insert-layout-orientation.spec.ts` (all 3 browsers)

Observed recurring signature:

- `Test timeout of 30000ms exceeded`
- `Error: locator.waitFor: Test timeout of 30000ms exceeded`
  - Call log: waiting for `getByText('Start', { exact: true }).first()` to be visible
  - Assertion site: `tests/e2e/insert-layout-orientation.spec.ts:216`

Representative stack fragment:

```text
at getTextBox (/workspace/worktrees/430/tests/e2e/insert-layout-orientation.spec.ts:216:17)
at getGraphDirectionDelta (/workspace/worktrees/430/tests/e2e/insert-layout-orientation.spec.ts:367:26)
at assertDirectionMatchesOrientation (/workspace/worktrees/430/tests/e2e/insert-layout-orientation.spec.ts:381:28)
```

## Captured Artifacts

- `artifacts/task-430-baseline/run-metadata.tsv` (tracked): start/end timestamps and exit codes for all 6 runs
- Per-browser Playwright line logs were captured locally during execution and used for the signatures above.
