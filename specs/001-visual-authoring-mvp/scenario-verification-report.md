# Quickstart Scenario Verification Report

**Feature**: 001-visual-authoring-mvp
**Task**: T029 / Issue #96
**Date**: 2026-03-06
**Branch**: task/96-task-quickstart-scenario-verification-repr
**Toolchain**: Node.js v24.14.0 · pnpm 10.30.3 · vitest 4.0.18

---

## Prerequisites Check

| Check | Result |
|---|---|
| Node.js 24 LTS | ✅ v24.14.0 |
| pnpm 10.30.3 | ✅ 10.30.3 (via corepack) |
| `pnpm install --frozen-lockfile` | ✅ 101 packages resolved (all cached) |
| `pnpm vitest --run` | ✅ 356 tests passed across 17 test files |
| `pnpm playwright test --list` | ✅ 31 e2e tests listed |
| `pnpm biome check .` | ⚠️ 71 lint/format errors, 19 warnings (see Finding F-1) |

---

## Scenario Results

### Scenario 1 — Create New Workflow

**Status: ✅ VERIFIED**

Tests in `tests/integration/quickstart-scenarios.spec.ts` (5 tests):
- `bootstrapped graph has exactly 2 nodes and 1 edge` — pass
- `start node is present with kind 'start' and stable ID` — pass
- `end node is present with kind 'end' and stable ID` — pass
- `initial edge connects start → end with the stable edge ID` — pass
- `each call returns a fresh graph object — no shared state` — pass

`bootstrapWorkflowGraph()` returns a graph with exactly the synthetic start and end boundary nodes connected by an initial edge.

---

### Scenario 2 — Insert And Edit Task

**Status: ✅ VERIFIED**

Tests in `tests/integration/quickstart-scenarios.spec.ts` (7 tests):
- `inserting a task into a blank graph produces 3 nodes and 2 edges` — pass
- `the inserted node has kind 'task'` — pass
- `the taskReference property is set on the inserted node` — pass
- `new edges wire start → task and task → end correctly` — pass
- `the original initial edge is removed after insertion` — pass
- `revision counter increments on each insertion` — pass
- `the original graph is never mutated by insertTask` — pass

`insertTask()` correctly splits the initial edge, inserts the new task node, and wires both replacement edges.

---

### Scenario 3 — Load Existing YAML

**Status: ✅ VERIFIED**

Tests in `tests/integration/quickstart-scenarios.spec.ts` (6 tests):
- `simple.yaml fixture parses without errors` — pass
- `multi-task.yaml fixture parses without errors` — pass
- `with-branches.yaml fixture parses without errors` — pass
- `loaded YAML workflow preserves document identity fields` — pass
- `small edit round-trip: YAML → edit → YAML re-parses cleanly` — pass
- `cross-format export: YAML → JSON round-trip preserves task count` — pass

Round-trip pass rate across all integration fixtures: **18/18 (100%)** per `workflow-roundtrip.spec.ts`.

---

### Scenario 4 — Diagnostics Flow

**Status: ✅ VERIFIED**

Tests in `tests/integration/quickstart-scenarios.spec.ts` (7 tests):
- `live validator emits non-empty diagnostics for an invalid source after debounce` — pass
- `live validator emits empty diagnostics for a valid source` — pass
- `full validator returns non-empty diagnostics for an invalid source` — pass
- `full validator returns empty diagnostics for a valid source` — pass
- `live and full validators agree on whether the source is valid` — pass
- `each diagnostic entry has ruleId, severity, message, and location fields` — pass
- `rapid edits debounce correctly — only one validation fires` — pass

Contract-level coverage: 25 additional tests in `tests/contract/editor-diagnostics.contract.spec.ts` — all pass. Validation latency p95 ≤ 2.5 ms at all tested workflow sizes.

---

### Scenario 5 — Privacy Guardrail

**Status: ✅ VERIFIED**

Tests in `tests/integration/quickstart-scenarios.spec.ts` (6 tests):
- `bootstrapWorkflowGraph makes no network calls` — pass
- `insertTask makes no network calls` — pass
- `parseWorkflowSource makes no network calls` — pass
- `serializeWorkflow makes no network calls` — pass
- `validateWorkflow makes no network calls` — pass
- `full create/load/edit/export/validate flow makes no network calls` — pass

`globalThis.fetch` is never invoked by any editor core operation. Constitution rule "No runtime network calls from editor core" is satisfied.

---

## Summary

| Scenario | Status |
|---|---|
| 1 — Create New Workflow | ✅ Verified |
| 2 — Insert And Edit Task | ✅ Verified |
| 3 — Load Existing YAML | ✅ Verified |
| 4 — Diagnostics Flow | ✅ Verified |
| 5 — Privacy Guardrail | ✅ Verified |

**All 5 quickstart scenarios verified.** No failing scenarios to report to Phase B.

---

## Findings

### F-1: Biome lint/format errors (non-blocking for quickstart scenarios)

`pnpm biome check .` reports **71 errors** (formatting mismatches and `noNonNullAssertion` lint warnings) across the codebase. These do not affect runtime behaviour or test outcomes — all 356 tests pass — but violate the project's lint policy.

**Affected files include:**
- `packages/editor-core/src/graph/project.ts` — 3 `noNonNullAssertion` violations
- `packages/editor-core/src/commands/insert-task.ts` — formatter deviation
- `packages/editor-core/src/diagnostics/helpers.ts` — import order + formatter
- Multiple other packages — formatter line-length deviations and import ordering

**Recommendation**: A follow-up task should run `pnpm biome check . --write` or apply the suggested safe fixes to restore lint compliance. This is not a blocker for Phase B feature work.
