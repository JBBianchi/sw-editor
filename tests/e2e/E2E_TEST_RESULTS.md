# E2E Test Results

**Date**: 2026-03-06
**Branch**: task/265-task-run-e2e-tests-and-confirm-all-pass
**Playwright version**: 1.58.2
**Node version**: v24.14.0

## Summary

| Status | Count |
|--------|-------|
| Passed | 51 |
| Failed | 0 |
| Skipped (fixme) | 207 |
| **Total** | **258** |

**Duration**: 34.6s

## Results by Browser Project

All three browser projects (Chromium, Firefox, WebKit) executed without failures.

### Passing Tests (51 total, across all 3 browsers)

The following test suites have active (non-fixme) tests that pass across Chromium, Firefox, and WebKit:

| Test File | Active Tests | Status |
|-----------|-------------|--------|
| `insert-layout-order.spec.ts` | 4 tests x 3 browsers = 12 | All pass |
| `quickstart-scenarios.spec.ts` | 9 active tests x 3 browsers = 27 | All pass |
| `react-flow-renderer.spec.ts` | 2 tests x 3 browsers = 6 | All pass |
| `accessibility-mvp.spec.ts` | 2 active tests x 3 browsers = 6 | All pass |

### Skipped Tests (207 total)

All skipped tests use `test.describe.fixme` or `test.fixme`, indicating known-pending functionality. No tests are skipped due to regressions.

## Known Pending Tests from Incomplete Tasks

### T021 — E2E insertion ordering coverage (spec 006, Phase 3)

- **File**: `tests/e2e/insert-layout-order.spec.ts`
- **Status**: Test file is implemented with 4 active test cases. All pass across all browsers.
- **Assessment**: Task appears fully implemented but checkbox was not marked in tasks.md.

### T024 — Timed insertion validation for SC-004 (spec 006, Phase 6)

- **File**: `tests/e2e/insert-layout-order.spec.ts`
- **Status**: No timing assertions for the SC-004 criterion (< 5s confirmation) exist in the file. The file verifies functional correctness only.
- **Assessment**: Not implemented. This is a UX timing benchmark, not a functional gate. Non-blocking for verification.

### T025 — Performance threshold validation (spec 006, Phase 6)

- **File**: `tests/integration/insertion-performance.spec.ts` (integration, not e2e)
- **Status**: Comprehensive performance benchmarks exist in the integration test file with p95 threshold assertions. Tests are active and passing.
- **Assessment**: Task appears fully implemented but checkbox was not marked in tasks.md.

### Related: T022 — E2E edge-anchor alignment (spec 006, Phase 4)

- **File**: `tests/e2e/insert-layout-affordance.spec.ts`
- **Status**: All 3 describe blocks use `test.describe.fixme()` — tests exist but are skipped.
- **Assessment**: Midpoint positioning, pan/zoom stability, and keyboard operability tests are written but not actively running. Compensated by integration-level coverage (T010).

## Skipped Test Categories (fixme-marked, not regressions)

| Category | File | Reason |
|----------|------|--------|
| Insertion affordance midpoint positioning | `insert-layout-affordance.spec.ts` | Requires edge midpoint DOM attributes not yet present |
| Insertion affordance pan/zoom stability | `insert-layout-affordance.spec.ts` | Same as above |
| Insertion affordance keyboard operability | `insert-layout-affordance.spec.ts` | Same as above |
| Accessibility: aria-label presence | `accessibility-insert-layout.spec.ts` | Requires full insertion control implementation |
| Accessibility: focus management | `accessibility-insert-layout.spec.ts` | Requires post-insertion focus wiring |
| Accessibility: screen-reader announcements | `accessibility-insert-layout.spec.ts` | Requires ARIA live region updates |
| Accessibility: keyboard tab order | `accessibility-insert-layout.spec.ts` | Requires full keyboard navigation |
| Keyboard operability (create, insert, navigate, panel, export) | `accessibility-mvp.spec.ts` | Requires full sw-editor component |
| Screen-reader ARIA live region | `accessibility-mvp.spec.ts` | Requires selection events |
| Focus visibility | `accessibility-mvp.spec.ts` | Requires rendered graph + buttons |
| ARIA structural semantics (partial) | `accessibility-mvp.spec.ts` | Individual tests marked fixme |
| Quickstart: create workflow with nodes | `quickstart-scenarios.spec.ts` | Requires data-node-type attributes |
| Quickstart: properties panel | `quickstart-scenarios.spec.ts` | Requires wired panel |
| Quickstart: edit properties | `quickstart-scenarios.spec.ts` | Requires editable panel inputs |
| Quickstart: export YAML | `quickstart-scenarios.spec.ts` | Requires export button |
| Quickstart: invalid transition diagnostics | `quickstart-scenarios.spec.ts` | Requires panel transition field |
| Quickstart: node error indicators | `quickstart-scenarios.spec.ts` | Requires node error UI |
| Quickstart: explicit validation summary | `quickstart-scenarios.spec.ts` | Requires validate button |
| Quickstart: create/insert/export privacy | `quickstart-scenarios.spec.ts` | Requires full flow buttons |

## Conclusion

All 51 active e2e tests pass across Chromium, Firefox, and WebKit with zero failures and zero regressions. The 207 skipped tests are all marked with `fixme` due to pending feature implementation (not regressions). Known pending tasks T021 and T025 have their test code implemented and passing; T024 timing assertions are not yet implemented but are non-blocking.
