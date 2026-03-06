import type { DiagnosticsCollection } from "@sw-editor/editor-core";
import type { EditorDiagnosticsChangedPayload } from "@sw-editor/editor-host-client";
import { EditorEventName } from "@sw-editor/editor-host-client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventBridge } from "../../src/events/bridge.js";
import { DiagnosticsEmitter } from "../../src/events/diagnostics.js";

/** Captures the next event of `name` on `target` and returns its detail. */
function captureEvent<T>(target: EventTarget, name: string): Promise<T> {
  return new Promise<T>((resolve) => {
    target.addEventListener(name, (e) => resolve((e as CustomEvent<T>).detail), { once: true });
  });
}

describe("DiagnosticsEmitter", () => {
  const VERSION = "1.0.0";
  const DIAGNOSTIC_A: DiagnosticsCollection = [
    { ruleId: "required-field", severity: "error", message: "Missing name", location: "/name" },
  ];
  const DIAGNOSTIC_B: DiagnosticsCollection = [
    { ruleId: "schema.validation", severity: "error", message: "Invalid format", location: "/do" },
  ];

  let target: EventTarget;
  let bridge: EventBridge;
  let emitter: DiagnosticsEmitter;

  beforeEach(() => {
    target = new EventTarget();
    bridge = new EventBridge(target, VERSION);
    emitter = new DiagnosticsEmitter(bridge);
  });

  describe("handle — emission", () => {
    it("emits editorDiagnosticsChanged on first call with diagnostics", async () => {
      const detailPromise = captureEvent<EditorDiagnosticsChangedPayload>(
        target,
        EditorEventName.editorDiagnosticsChanged,
      );

      emitter.handle(DIAGNOSTIC_A);

      const detail = await detailPromise;
      expect(detail.diagnostics).toEqual(DIAGNOSTIC_A);
    });

    it("emits editorDiagnosticsChanged on first call with empty collection", async () => {
      const detailPromise = captureEvent<EditorDiagnosticsChangedPayload>(
        target,
        EditorEventName.editorDiagnosticsChanged,
      );

      emitter.handle([]);

      const detail = await detailPromise;
      expect(detail.diagnostics).toEqual([]);
    });

    it("payload includes version and monotonic revision from the bridge", async () => {
      const detailPromise = captureEvent<EditorDiagnosticsChangedPayload>(
        target,
        EditorEventName.editorDiagnosticsChanged,
      );

      emitter.handle(DIAGNOSTIC_A);

      const detail = await detailPromise;
      expect(detail.version).toBe(VERSION);
      expect(typeof detail.revision).toBe("number");
      expect(detail.revision).toBeGreaterThanOrEqual(1);
    });

    it("emits when diagnostics change from one non-empty collection to another", async () => {
      emitter.handle(DIAGNOSTIC_A);

      const detailPromise = captureEvent<EditorDiagnosticsChangedPayload>(
        target,
        EditorEventName.editorDiagnosticsChanged,
      );

      emitter.handle(DIAGNOSTIC_B);

      const detail = await detailPromise;
      expect(detail.diagnostics).toEqual(DIAGNOSTIC_B);
    });

    it("emits when diagnostics change from non-empty to empty", async () => {
      emitter.handle(DIAGNOSTIC_A);

      const detailPromise = captureEvent<EditorDiagnosticsChangedPayload>(
        target,
        EditorEventName.editorDiagnosticsChanged,
      );

      emitter.handle([]);

      const detail = await detailPromise;
      expect(detail.diagnostics).toEqual([]);
    });

    it("emits when diagnostics change from empty to non-empty", async () => {
      emitter.handle([]);

      const detailPromise = captureEvent<EditorDiagnosticsChangedPayload>(
        target,
        EditorEventName.editorDiagnosticsChanged,
      );

      emitter.handle(DIAGNOSTIC_A);

      const detail = await detailPromise;
      expect(detail.diagnostics).toEqual(DIAGNOSTIC_A);
    });
  });

  describe("handle — deduplication", () => {
    it("does not re-emit when the same non-empty collection is provided twice", () => {
      const listener = vi.fn();
      target.addEventListener(EditorEventName.editorDiagnosticsChanged, listener);

      emitter.handle(DIAGNOSTIC_A);
      emitter.handle([...DIAGNOSTIC_A]); // structurally equal, different reference

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("does not re-emit when the same empty collection is provided twice", () => {
      const listener = vi.fn();
      target.addEventListener(EditorEventName.editorDiagnosticsChanged, listener);

      emitter.handle([]);
      emitter.handle([]);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("does not re-emit after multiple identical passes", () => {
      const listener = vi.fn();
      target.addEventListener(EditorEventName.editorDiagnosticsChanged, listener);

      emitter.handle(DIAGNOSTIC_A);
      emitter.handle(DIAGNOSTIC_A);
      emitter.handle(DIAGNOSTIC_A);

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("reset", () => {
    it("forces re-emission of an identical collection after reset", () => {
      const listener = vi.fn();
      target.addEventListener(EditorEventName.editorDiagnosticsChanged, listener);

      emitter.handle([]);
      emitter.handle([]); // deduplicated — 1 call total so far

      emitter.reset();

      emitter.handle([]); // reset clears cache — should emit again

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("forces re-emission of identical diagnostics after reset", () => {
      const listener = vi.fn();
      target.addEventListener(EditorEventName.editorDiagnosticsChanged, listener);

      emitter.handle(DIAGNOSTIC_A);
      emitter.reset();
      emitter.handle(DIAGNOSTIC_A);

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("after reset, deduplication resumes for subsequent identical calls", () => {
      const listener = vi.fn();
      target.addEventListener(EditorEventName.editorDiagnosticsChanged, listener);

      emitter.reset();
      emitter.handle(DIAGNOSTIC_A); // emits after reset
      emitter.handle(DIAGNOSTIC_A); // deduplicated

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe("live validator integration pattern", () => {
    it("only emits once when live validator repeatedly returns the same diagnostics", () => {
      const listener = vi.fn();
      target.addEventListener(EditorEventName.editorDiagnosticsChanged, listener);

      // Simulate multiple debounced validator callbacks with identical results
      for (let i = 0; i < 5; i++) {
        emitter.handle(DIAGNOSTIC_A);
      }

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("emits correct sequence when diagnostics alternate between passes", async () => {
      const received: DiagnosticsCollection[] = [];
      target.addEventListener(EditorEventName.editorDiagnosticsChanged, (e) => {
        received.push((e as CustomEvent<EditorDiagnosticsChangedPayload>).detail.diagnostics);
      });

      emitter.handle(DIAGNOSTIC_A); // emit 1
      emitter.handle(DIAGNOSTIC_A); // skip (duplicate)
      emitter.handle([]); // emit 2
      emitter.handle([]); // skip (duplicate)
      emitter.handle(DIAGNOSTIC_B); // emit 3

      expect(received).toHaveLength(3);
      expect(received[0]).toEqual(DIAGNOSTIC_A);
      expect(received[1]).toEqual([]);
      expect(received[2]).toEqual(DIAGNOSTIC_B);
    });
  });
});
