# Task Review Assessment: 006-fix-insert-layout

**Date**: 2026-03-06
**Reviewer**: Automated assessment for issue #266
**Source**: `specs/006-fix-insert-layout/tasks.md`

## Summary

- **Total tasks**: 25
- **Completed (checked)**: 20
- **Incomplete (unchecked)**: 5 — T019, T021, T022, T024, T025
- **All incomplete tasks are in test/validation phases** (Phase 3 tests, Phase 4 tests, Phase 6 polish). No implementation tasks are incomplete.

## Incomplete Task Assessment

### T021 — E2E insertion ordering coverage (Phase 3, US1)

- **File**: `tests/e2e/insert-layout-order.spec.ts`
- **Description**: Add end-to-end blank and linear insertion ordering coverage.
- **Status**: Test file exists with 4 substantive test cases covering basic insertion, DOM order, and sequential insertions. Tests are active (not skipped).
- **Blocking?**: **No.** The test file is implemented and provides the coverage described by the task. The task checkbox appears to have been missed.
- **Coverage gap**: None — the described scenarios are covered.

### T022 — E2E edge-anchor alignment coverage (Phase 4, US2)

- **File**: `tests/e2e/insert-layout-affordance.spec.ts`
- **Description**: Add end-to-end edge-anchor alignment coverage with midpoint-tolerance assertions (<= 12 px).
- **Status**: Test file exists with midpoint positioning tests, pan/zoom stability tests, and keyboard operability tests. However, all three `describe` blocks use `test.describe.fixme()`, meaning the tests are **skipped** (known-failing).
- **Blocking?**: **Partially.** The test code exists and is well-structured, but `.fixme` means these tests do not execute in CI. SC-002 (midpoint tolerance) is not actively verified end-to-end. Integration-level coverage in `tests/integration/insertion-renderer-matrix.spec.ts` (T010, checked) partially compensates.
- **Coverage gap**: E2E midpoint-tolerance and pan/zoom alignment assertions are skipped.

### T019 — Quickstart regression coverage (Phase 6)

- **File**: `tests/integration/quickstart-scenarios.spec.ts`
- **Description**: Add insertion-layout quickstart regression coverage.
- **Status**: Test file exists with 6 scenario groups including Scenario 6 ("Load, Insert, Verify Visual Order") which directly validates insertion layout ordering. Tests are active.
- **Blocking?**: **No.** The described coverage is implemented. The task checkbox appears to have been missed.
- **Coverage gap**: None — quickstart scenarios including insertion-specific visual order verification are covered.

### T024 — Timed insertion validation for SC-004 (Phase 6)

- **File**: `tests/e2e/insert-layout-order.spec.ts`
- **Description**: Add timed start-to-end insertion validation for SC-004 (< 5s confirmation).
- **Status**: The target file exists but contains **no timing assertions** for SC-004. The test verifies functional correctness (node ordering) but does not measure elapsed time.
- **Blocking?**: **No.** SC-004 is a UX-level success criterion ("confirm intended position in under 5 seconds without manual repositioning"). The functional precondition (correct automatic positioning) is verified by existing tests. The 5-second threshold is a usability benchmark, not a functional gate. It would require a real browser timing harness to measure meaningfully.
- **Coverage gap**: No automated timing assertion for the 5-second UX criterion exists.

### T025 — Performance threshold validation (Phase 6)

- **File**: `tests/integration/insertion-performance.spec.ts`
- **Description**: Add performance-threshold validation for insertion settle (95p <= 250 ms) and anchor realignment after pan/zoom (<= 100 ms).
- **Status**: Test file exists with comprehensive benchmarks: 30-iteration sampling, percentile computation, and explicit p95 threshold assertions for both insertion settle (250 ms) and anchor realignment (100 ms). Tests are active.
- **Blocking?**: **No.** The described coverage is fully implemented. The task checkbox appears to have been missed.
- **Coverage gap**: None — both performance thresholds are enforced.

## Verification Impact

| Task | Test file exists | Tests active | Blocks verification |
|------|-----------------|-------------|-------------------|
| T021 | Yes | Yes | No |
| T022 | Yes | No (`.fixme`) | Partially — E2E midpoint tolerance not actively verified |
| T019 | Yes | Yes | No |
| T024 | Yes (shared file) | N/A — not implemented | No — UX benchmark, not functional gate |
| T025 | Yes | Yes | No |

### Conclusion

**The feature is not blocked from verification.** Three of the five incomplete tasks (T019, T021, T025) appear to be fully implemented but simply not checked off. T022 has test code written but skipped with `.fixme`, which means E2E midpoint-tolerance validation is not actively running — this is compensated by integration-level coverage (T010). T024 is a UX timing benchmark that is not implemented but is non-blocking for functional verification.

**Recommended actions**:
1. Check off T019, T021, and T025 as their test files are implemented and active.
2. Investigate why T022 tests are marked `.fixme` and determine if they can be enabled.
3. Accept T024 as deferred or out-of-scope for automated verification.
