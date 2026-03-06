import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkflowSource } from "../../src/source/types.js";
import type { ValidationResultCallback } from "../../src/validation/live-validator.js";
import { LiveValidator } from "../../src/validation/live-validator.js";

const VALID_WORKFLOW_JSON: WorkflowSource = {
  format: "json",
  content: JSON.stringify({
    document: {
      dsl: "1.0.0",
      namespace: "test",
      name: "sample",
      version: "0.0.1",
    },
    do: [{ step1: { call: "http", with: { method: "get", endpoint: "https://example.com" } } }],
  }),
};

const INVALID_WORKFLOW_JSON: WorkflowSource = {
  format: "json",
  content: JSON.stringify({ notAWorkflow: true }),
};

describe("LiveValidator — debounce behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not invoke the callback before the debounce window closes", () => {
    const callback = vi.fn<ValidationResultCallback>();
    const validator = new LiveValidator(callback, { debounceMs: 500 });

    validator.schedule(VALID_WORKFLOW_JSON);

    vi.advanceTimersByTime(499);
    expect(callback).not.toHaveBeenCalled();

    validator.dispose();
  });

  it("invokes the callback after the debounce window closes", () => {
    const callback = vi.fn<ValidationResultCallback>();
    const validator = new LiveValidator(callback, { debounceMs: 500 });

    validator.schedule(VALID_WORKFLOW_JSON);

    vi.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledTimes(1);

    validator.dispose();
  });

  it("resets the timer on each call and fires only once for rapid edits", () => {
    const callback = vi.fn<ValidationResultCallback>();
    const validator = new LiveValidator(callback, { debounceMs: 500 });

    validator.schedule(VALID_WORKFLOW_JSON);
    vi.advanceTimersByTime(300);
    validator.schedule(VALID_WORKFLOW_JSON);
    vi.advanceTimersByTime(300);
    validator.schedule(VALID_WORKFLOW_JSON);
    vi.advanceTimersByTime(500);

    expect(callback).toHaveBeenCalledTimes(1);

    validator.dispose();
  });

  it("fires multiple times for separate debounce windows", () => {
    const callback = vi.fn<ValidationResultCallback>();
    const validator = new LiveValidator(callback, { debounceMs: 100 });

    validator.schedule(VALID_WORKFLOW_JSON);
    vi.advanceTimersByTime(100);

    validator.schedule(VALID_WORKFLOW_JSON);
    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledTimes(2);

    validator.dispose();
  });

  it("dispose cancels a pending timer", () => {
    const callback = vi.fn<ValidationResultCallback>();
    const validator = new LiveValidator(callback, { debounceMs: 500 });

    validator.schedule(VALID_WORKFLOW_JSON);
    validator.dispose();

    vi.advanceTimersByTime(500);
    expect(callback).not.toHaveBeenCalled();
  });

  it("isPending is true while the timer is running", () => {
    const callback = vi.fn<ValidationResultCallback>();
    const validator = new LiveValidator(callback, { debounceMs: 500 });

    expect(validator.isPending).toBe(false);

    validator.schedule(VALID_WORKFLOW_JSON);
    expect(validator.isPending).toBe(true);

    vi.advanceTimersByTime(500);
    expect(validator.isPending).toBe(false);

    validator.dispose();
  });

  it("isPending is false after dispose", () => {
    const callback = vi.fn<ValidationResultCallback>();
    const validator = new LiveValidator(callback, { debounceMs: 500 });

    validator.schedule(VALID_WORKFLOW_JSON);
    validator.dispose();

    expect(validator.isPending).toBe(false);
  });

  it("uses 500 ms default debounce when no options are provided", () => {
    const callback = vi.fn<ValidationResultCallback>();
    const validator = new LiveValidator(callback);

    validator.schedule(VALID_WORKFLOW_JSON);

    vi.advanceTimersByTime(499);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);

    validator.dispose();
  });
});

describe("LiveValidator — validation results", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("emits an empty diagnostics array for a valid workflow", () => {
    const callback = vi.fn<ValidationResultCallback>();
    const validator = new LiveValidator(callback, { debounceMs: 0 });

    validator.schedule(VALID_WORKFLOW_JSON);
    vi.advanceTimersByTime(0);

    expect(callback).toHaveBeenCalledWith([]);

    validator.dispose();
  });

  it("emits diagnostics for an invalid workflow", () => {
    const callback = vi.fn<ValidationResultCallback>();
    const validator = new LiveValidator(callback, { debounceMs: 0 });

    validator.schedule(INVALID_WORKFLOW_JSON);
    vi.advanceTimersByTime(0);

    expect(callback).toHaveBeenCalledTimes(1);
    const [diagnostics] = callback.mock.calls[0] as [ReturnType<ValidationResultCallback>];
    expect(Array.isArray(diagnostics)).toBe(true);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0]).toMatchObject({
      ruleId: "schema-validation",
      severity: "error",
    });

    validator.dispose();
  });

  it("emits diagnostics with a location field for each diagnostic", () => {
    const callback = vi.fn<ValidationResultCallback>();
    const validator = new LiveValidator(callback, { debounceMs: 0 });

    validator.schedule(INVALID_WORKFLOW_JSON);
    vi.advanceTimersByTime(0);

    const [diagnostics] = callback.mock.calls[0] as [ReturnType<ValidationResultCallback>];
    for (const diag of diagnostics) {
      expect(typeof diag.location).toBe("string");
      expect(diag.location.length).toBeGreaterThan(0);
    }

    validator.dispose();
  });

  it("uses the last scheduled source when the timer fires", () => {
    const callback = vi.fn<ValidationResultCallback>();
    const validator = new LiveValidator(callback, { debounceMs: 100 });

    validator.schedule(INVALID_WORKFLOW_JSON);
    vi.advanceTimersByTime(50);
    validator.schedule(VALID_WORKFLOW_JSON);
    vi.advanceTimersByTime(100);

    expect(callback).toHaveBeenCalledWith([]);

    validator.dispose();
  });
});
