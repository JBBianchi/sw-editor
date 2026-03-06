/**
 * Validation latency measurement harness.
 *
 * Verifies that the SC-002 requirement is met: at least 95% of normal edit
 * actions show validation feedback within 500 ms after the debounce window
 * closes.
 *
 * Measures the time from when the debounce window closes (i.e. when the
 * internal `setTimeout` fires inside {@link LiveValidator}) to when the
 * diagnostics result callback is invoked.  Because the validator's internal
 * `#run()` method is synchronous, this latency represents the cost of parsing
 * and validating a workflow document via the Serverless Workflow SDK.
 *
 * Uses `debounceMs: 0` so that the timer overhead is a single event-loop turn,
 * leaving the measured value dominated by the validation computation itself.
 *
 * Reports p50, p95, and p99 latencies per workflow size and asserts that
 * p95 < 500 ms for workflows with ≤ 50 tasks (the "typical workflow sizes"
 * referenced in SC-002).
 *
 * Covers:
 *   - Small workflow (1 task)
 *   - Medium workflow (10 tasks)
 *   - Large workflow (50 tasks)
 *   - Extra-large workflow (100 tasks, observation only — no SC-002 assertion)
 *
 * @module
 */

import type { DiagnosticsCollection, WorkflowSource } from "@sw-editor/editor-core";
import { LiveValidator } from "@sw-editor/editor-core";
import { beforeAll, describe, expect, it } from "vitest";

// ---------------------------------------------------------------------------
// Workflow fixture factory
// ---------------------------------------------------------------------------

/**
 * Builds a valid Serverless Workflow JSON source with the requested number of
 * sequential HTTP call tasks.
 *
 * Each task name is unique to avoid semantic-validation diagnostics for
 * duplicate names, keeping the fixture valid and the validation path consistent
 * across runs.
 *
 * @param taskCount - Number of top-level `do` tasks to include (must be ≥ 1).
 * @param name - Optional workflow `document.name`; defaults to
 *   `"latency-test-{taskCount}"`.
 * @returns A {@link WorkflowSource} in JSON format ready to pass to
 *   {@link LiveValidator.schedule}.
 */
function buildWorkflowSource(taskCount: number, name?: string): WorkflowSource {
  const workflowName = name ?? `latency-test-${taskCount}`;

  const tasks = Array.from({ length: taskCount }, (_, i) => ({
    [`task${i + 1}`]: {
      call: "http",
      with: {
        method: "get",
        endpoint: `https://api.example.com/resource/${i + 1}`,
      },
    },
  }));

  const workflow = {
    document: {
      dsl: "1.0.0",
      namespace: "latency-harness",
      name: workflowName,
      version: "1.0.0",
    },
    do: tasks,
  };

  return {
    format: "json",
    content: JSON.stringify(workflow),
  };
}

// ---------------------------------------------------------------------------
// Latency measurement
// ---------------------------------------------------------------------------

/**
 * Measures the elapsed time from the moment {@link LiveValidator.schedule} is
 * called (representing the debounce window closing, since `debounceMs` is 0)
 * to when the diagnostics result callback fires.
 *
 * With `debounceMs: 0` the only overhead beyond the validation computation
 * itself is a single `setTimeout(fn, 0)` event-loop turn, which is negligible
 * relative to the 500 ms SC-002 budget.
 *
 * Sub-millisecond precision is achieved via `performance.now()`.
 *
 * @param source - The workflow source to validate.
 * @returns A Promise that resolves with the elapsed time in milliseconds.
 */
function measureValidationLatency(source: WorkflowSource): Promise<number> {
  return new Promise<number>((resolve) => {
    let validator: LiveValidator;

    const onResult = (_diagnostics: DiagnosticsCollection): void => {
      const end = performance.now();
      validator.dispose();
      resolve(end - start);
    };

    validator = new LiveValidator(onResult, { debounceMs: 0 });
    const start = performance.now();
    validator.schedule(source);
  });
}

// ---------------------------------------------------------------------------
// Statistics helpers
// ---------------------------------------------------------------------------

/**
 * Computes a percentile value from a pre-sorted ascending array of numbers.
 *
 * Uses the "lower nearest rank" method: the value at
 * `floor(n * p)` (clamped to `n - 1`) is returned.
 *
 * @param sorted - Non-empty array of numbers sorted in ascending order.
 * @param p - Percentile fraction in the range [0, 1] (e.g. `0.95` for p95).
 * @returns The value at the requested percentile, or `0` if `sorted` is empty.
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(Math.floor(sorted.length * p), sorted.length - 1);
  return sorted[index];
}

/**
 * Formats and logs a latency report for one workflow-size scenario.
 *
 * Output is written to `console.log` so that CI logs capture the results.
 * The report includes the sample count, min, p50, p95, p99, and max latencies,
 * all in milliseconds with three decimal places.
 *
 * @param label - Human-readable label for the scenario (e.g. `"small (1 task)"`).
 * @param sorted - Sorted ascending array of measured latencies in milliseconds.
 */
function logLatencyReport(label: string, sorted: number[]): void {
  const p50 = percentile(sorted, 0.5);
  const p95 = percentile(sorted, 0.95);
  const p99 = percentile(sorted, 0.99);
  const min = sorted[0] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;

  console.log(
    `\nLatency report [${label}] (n=${sorted.length}):\n` +
      `  min=${min.toFixed(3)} ms` +
      `  p50=${p50.toFixed(3)} ms` +
      `  p95=${p95.toFixed(3)} ms` +
      `  p99=${p99.toFixed(3)} ms` +
      `  max=${max.toFixed(3)} ms`,
  );
}

// ---------------------------------------------------------------------------
// Scenario definitions
// ---------------------------------------------------------------------------

/**
 * Definition of a single latency measurement scenario.
 */
interface Scenario {
  /** Human-readable label, e.g. `"small (1 task)"`. */
  label: string;
  /** Number of top-level `do` tasks in the generated workflow. */
  taskCount: number;
  /**
   * When `true`, asserts that the p95 latency is below 500 ms (SC-002).
   * Set to `false` for observation-only scenarios (e.g. very large workflows).
   */
  assertSc002: boolean;
}

/** Scenarios to benchmark. */
const SCENARIOS: Scenario[] = [
  { label: "small (1 task)", taskCount: 1, assertSc002: true },
  { label: "medium (10 tasks)", taskCount: 10, assertSc002: true },
  { label: "large (50 tasks)", taskCount: 50, assertSc002: true },
  { label: "extra-large (100 tasks)", taskCount: 100, assertSc002: false },
];

/**
 * Number of repeated measurements collected per scenario.
 *
 * 30 samples provide sufficient resolution for p50/p95/p99 estimates while
 * keeping the total test runtime reasonable.
 */
const ITERATIONS = 30;

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe("Validation latency harness (SC-002)", () => {
  for (const scenario of SCENARIOS) {
    describe(scenario.label, () => {
      /** Latencies collected during `beforeAll`, sorted ascending. */
      let sortedLatencies: number[];

      beforeAll(async () => {
        const source = buildWorkflowSource(scenario.taskCount);
        const latencies: number[] = [];

        for (let i = 0; i < ITERATIONS; i++) {
          const ms = await measureValidationLatency(source);
          latencies.push(ms);
        }

        sortedLatencies = latencies.slice().sort((a, b) => a - b);
        logLatencyReport(scenario.label, sortedLatencies);
      });

      it(`collects ${ITERATIONS} latency samples`, () => {
        expect(sortedLatencies.length).toBe(ITERATIONS);
      });

      it("all latency samples are finite non-negative numbers", () => {
        for (const ms of sortedLatencies) {
          expect(Number.isFinite(ms), `latency ${ms} is not finite`).toBe(true);
          expect(ms, `latency ${ms} is negative`).toBeGreaterThanOrEqual(0);
        }
      });

      it("p50 latency is a finite non-negative number", () => {
        const p50 = percentile(sortedLatencies, 0.5);
        expect(Number.isFinite(p50)).toBe(true);
        expect(p50).toBeGreaterThanOrEqual(0);
      });

      it("p95 latency is a finite non-negative number", () => {
        const p95 = percentile(sortedLatencies, 0.95);
        expect(Number.isFinite(p95)).toBe(true);
        expect(p95).toBeGreaterThanOrEqual(0);
      });

      it("p99 latency is a finite non-negative number", () => {
        const p99 = percentile(sortedLatencies, 0.99);
        expect(Number.isFinite(p99)).toBe(true);
        expect(p99).toBeGreaterThanOrEqual(0);
      });

      if (scenario.assertSc002) {
        it("p95 latency < 500 ms (SC-002)", () => {
          const p95 = percentile(sortedLatencies, 0.95);
          expect(
            p95,
            `SC-002 violation: p95 latency ${p95.toFixed(3)} ms ≥ 500 ms ` +
              `for scenario "${scenario.label}"`,
          ).toBeLessThan(500);
        });
      }
    });
  }
});
