# Verification Summary: Tight Insert Geometry

Date: 2026-03-07  
Task: T035 (`#390`)

## Success Criteria Status

| ID | Success Criterion | Status | Evidence |
| --- | --- | --- | --- |
| SC-001 | 100% insertion controls within 6 px of edge midpoint | ✓ PASS | `tests/integration/quickstart-scenarios.spec.ts` (`load fixture -> insertion anchors are within 6px midpoint tolerance`) and `tests/integration/insertion-layout-order.spec.ts` midpoint assertions (TB/LR) passed. |
| SC-002 | Controls remain within 6 px after pan/zoom/refresh | ✓ PASS | Realignment and refresh behavior validated via `tests/integration/insertion-performance.spec.ts` (anchor realignment benchmark) and `tests/integration/insertion-anchor-refresh.spec.ts` (refresh/stale-anchor cleanup) with all assertions passing. |
| SC-003 | 100% orientation-correct port sides | ✓ PASS | `tests/integration/orientation-layout.spec.ts` passed all TB/LR port-side and flow-direction assertions. |
| SC-004 | 0 node bounding-box overlaps | ✓ PASS | `tests/integration/repeated-insert-layout.spec.ts` and `tests/integration/quickstart-scenarios.spec.ts` (`dense graph -> no overlaps`) passed. |
| SC-005 | ≤1 px deviation on repeated layout runs | ✓ PASS | `tests/integration/repeated-insert-layout.spec.ts` passed deterministic layout checks (`<=1px per axis`) across both renderers and orientations. |
| SC-006 | Keyboard insertion ≤ 500 ms | ✓ PASS | `tests/e2e/accessibility-insert-layout.spec.ts` (`keyboard insertion completes within 500 ms (SC-006)`) passed in focused Playwright run for both renderer modes. |

## Performance Benchmarks

Source: `tests/integration/insertion-performance.spec.ts`

| Metric | Measured p95 | Budget | Status |
| --- | --- | --- | --- |
| Anchor realignment p95 | 0.130 ms | <= 100 ms | ✓ PASS |
| Layout recompute p95 | 0.055 ms | <= 150 ms | ✓ PASS |

## Commands Executed

```bash
pnpm vitest run tests/integration/insertion-performance.spec.ts tests/integration/orientation-layout.spec.ts tests/integration/repeated-insert-layout.spec.ts --reporter=verbose
pnpm vitest run tests/integration/insertion-renderer-matrix.spec.ts tests/integration/insertion-anchor-refresh.spec.ts tests/integration/insertion-layout-order.spec.ts --reporter=verbose
pnpm vitest run tests/integration/quickstart-scenarios.spec.ts --reporter=verbose
pnpm playwright test tests/e2e/accessibility-insert-layout.spec.ts -g "keyboard insertion completes within 500 ms" --project=firefox --workers=1 --reporter=line
```
