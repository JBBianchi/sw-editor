import { describe, expect, it } from "vitest";
import { EditorEventName } from "@sw-editor/editor-host-client";
import { EventBridge } from "../../src/events/index.js";
import type {
  EditorDiagnosticsChangedEvent,
  EditorErrorEvent,
  EditorSelectionChangedEvent,
  WorkflowChangedEvent,
} from "../../src/events/index.js";
import type {
  EditorDiagnosticsChangedPayload,
  EditorErrorPayload,
  EditorSelectionChangedPayload,
  WorkflowChangedPayload,
} from "@sw-editor/editor-host-client";

/** Captures the next event of `name` on `target` and returns its detail. */
function captureEvent<T>(target: EventTarget, name: string): Promise<T> {
  return new Promise<T>((resolve) => {
    target.addEventListener(
      name,
      (e) => {
        resolve((e as CustomEvent<T>).detail);
      },
      { once: true },
    );
  });
}

describe("EventBridge", () => {
  const VERSION = "1.0.0";

  describe("emitWorkflowChanged", () => {
    it("dispatches a workflowChanged CustomEvent with correct payload", async () => {
      const target = new EventTarget();
      const bridge = new EventBridge(target, VERSION);
      const detailPromise = captureEvent<WorkflowChangedPayload>(
        target,
        EditorEventName.workflowChanged,
      );

      bridge.emitWorkflowChanged({ format: "json", content: '{"document":"v1"}' });

      const detail = await detailPromise;
      expect(detail.version).toBe(VERSION);
      expect(detail.revision).toBe(1);
      expect(detail.source).toEqual({ format: "json", content: '{"document":"v1"}' });
    });

    it("increments revision on each emission", async () => {
      const target = new EventTarget();
      const bridge = new EventBridge(target, VERSION);

      const firstPromise = captureEvent<WorkflowChangedPayload>(
        target,
        EditorEventName.workflowChanged,
      );
      bridge.emitWorkflowChanged({ format: "json", content: "{}" });
      const first = await firstPromise;

      const secondPromise = captureEvent<WorkflowChangedPayload>(
        target,
        EditorEventName.workflowChanged,
      );
      bridge.emitWorkflowChanged({ format: "yaml", content: "{}" });
      const second = await secondPromise;

      expect(first.revision).toBe(1);
      expect(second.revision).toBe(2);
    });

    it("emits with bubbles and composed flags", () => {
      const target = new EventTarget();
      const bridge = new EventBridge(target, VERSION);
      let capturedEvent: CustomEvent | undefined;

      target.addEventListener(EditorEventName.workflowChanged, (e) => {
        capturedEvent = e as WorkflowChangedEvent;
      });

      bridge.emitWorkflowChanged({ format: "json", content: "{}" });

      expect(capturedEvent).toBeDefined();
      expect(capturedEvent?.bubbles).toBe(true);
      expect(capturedEvent?.composed).toBe(true);
    });
  });

  describe("emitSelectionChanged", () => {
    it("dispatches editorSelectionChanged with a node selection", async () => {
      const target = new EventTarget();
      const bridge = new EventBridge(target, VERSION);
      const detailPromise = captureEvent<EditorSelectionChangedPayload>(
        target,
        EditorEventName.editorSelectionChanged,
      );

      bridge.emitSelectionChanged({ kind: "node", nodeId: "node-1" });

      const detail = await detailPromise;
      expect(detail.version).toBe(VERSION);
      expect(detail.revision).toBe(1);
      expect(detail.selection).toEqual({ kind: "node", nodeId: "node-1" });
    });

    it("dispatches editorSelectionChanged with an edge selection", async () => {
      const target = new EventTarget();
      const bridge = new EventBridge(target, VERSION);
      const detailPromise = captureEvent<EditorSelectionChangedPayload>(
        target,
        EditorEventName.editorSelectionChanged,
      );

      bridge.emitSelectionChanged({ kind: "edge", edgeId: "edge-42" });

      const detail = await detailPromise;
      expect(detail.selection).toEqual({ kind: "edge", edgeId: "edge-42" });
    });

    it("dispatches editorSelectionChanged with null for workflow-level state", async () => {
      const target = new EventTarget();
      const bridge = new EventBridge(target, VERSION);
      const detailPromise = captureEvent<EditorSelectionChangedPayload>(
        target,
        EditorEventName.editorSelectionChanged,
      );

      bridge.emitSelectionChanged(null);

      const detail = await detailPromise;
      expect(detail.selection).toBeNull();
    });

    it("emits with bubbles and composed flags", () => {
      const target = new EventTarget();
      const bridge = new EventBridge(target, VERSION);
      let capturedEvent: CustomEvent | undefined;

      target.addEventListener(EditorEventName.editorSelectionChanged, (e) => {
        capturedEvent = e as EditorSelectionChangedEvent;
      });

      bridge.emitSelectionChanged(null);

      expect(capturedEvent?.bubbles).toBe(true);
      expect(capturedEvent?.composed).toBe(true);
    });
  });

  describe("emitDiagnosticsChanged", () => {
    it("dispatches editorDiagnosticsChanged with diagnostics collection", async () => {
      const target = new EventTarget();
      const bridge = new EventBridge(target, VERSION);
      const detailPromise = captureEvent<EditorDiagnosticsChangedPayload>(
        target,
        EditorEventName.editorDiagnosticsChanged,
      );

      const diagnostics = [
        { ruleId: "required-field", severity: "error" as const, message: "Missing name", location: "/name" },
      ];
      bridge.emitDiagnosticsChanged(diagnostics);

      const detail = await detailPromise;
      expect(detail.version).toBe(VERSION);
      expect(detail.revision).toBe(1);
      expect(detail.diagnostics).toEqual(diagnostics);
    });

    it("dispatches editorDiagnosticsChanged with an empty collection", async () => {
      const target = new EventTarget();
      const bridge = new EventBridge(target, VERSION);
      const detailPromise = captureEvent<EditorDiagnosticsChangedPayload>(
        target,
        EditorEventName.editorDiagnosticsChanged,
      );

      bridge.emitDiagnosticsChanged([]);

      const detail = await detailPromise;
      expect(detail.diagnostics).toEqual([]);
    });

    it("emits with bubbles and composed flags", () => {
      const target = new EventTarget();
      const bridge = new EventBridge(target, VERSION);
      let capturedEvent: CustomEvent | undefined;

      target.addEventListener(EditorEventName.editorDiagnosticsChanged, (e) => {
        capturedEvent = e as EditorDiagnosticsChangedEvent;
      });

      bridge.emitDiagnosticsChanged([]);

      expect(capturedEvent?.bubbles).toBe(true);
      expect(capturedEvent?.composed).toBe(true);
    });
  });

  describe("emitError", () => {
    it("dispatches editorError with code and message", async () => {
      const target = new EventTarget();
      const bridge = new EventBridge(target, VERSION);
      const detailPromise = captureEvent<EditorErrorPayload>(
        target,
        EditorEventName.editorError,
      );

      bridge.emitError("RENDER_FAILED", "Renderer failed to initialize");

      const detail = await detailPromise;
      expect(detail.version).toBe(VERSION);
      expect(detail.revision).toBe(1);
      expect(detail.code).toBe("RENDER_FAILED");
      expect(detail.message).toBe("Renderer failed to initialize");
    });

    it("emits with bubbles and composed flags", () => {
      const target = new EventTarget();
      const bridge = new EventBridge(target, VERSION);
      let capturedEvent: CustomEvent | undefined;

      target.addEventListener(EditorEventName.editorError, (e) => {
        capturedEvent = e as EditorErrorEvent;
      });

      bridge.emitError("ERR", "msg");

      expect(capturedEvent?.bubbles).toBe(true);
      expect(capturedEvent?.composed).toBe(true);
    });
  });

  describe("revision counter", () => {
    it("increments monotonically across different event types", async () => {
      const target = new EventTarget();
      const bridge = new EventBridge(target, VERSION);
      const revisions: number[] = [];

      target.addEventListener(EditorEventName.workflowChanged, (e) => {
        revisions.push((e as WorkflowChangedEvent).detail.revision);
      });
      target.addEventListener(EditorEventName.editorSelectionChanged, (e) => {
        revisions.push((e as EditorSelectionChangedEvent).detail.revision);
      });
      target.addEventListener(EditorEventName.editorDiagnosticsChanged, (e) => {
        revisions.push((e as EditorDiagnosticsChangedEvent).detail.revision);
      });
      target.addEventListener(EditorEventName.editorError, (e) => {
        revisions.push((e as EditorErrorEvent).detail.revision);
      });

      bridge.emitWorkflowChanged({ format: "json", content: "{}" });
      bridge.emitSelectionChanged(null);
      bridge.emitDiagnosticsChanged([]);
      bridge.emitError("E", "m");

      expect(revisions).toEqual([1, 2, 3, 4]);
    });

    it("starts revision at 1 for a fresh instance", async () => {
      const target = new EventTarget();
      const bridge = new EventBridge(target, VERSION);
      const detailPromise = captureEvent<EditorErrorPayload>(
        target,
        EditorEventName.editorError,
      );

      bridge.emitError("E", "m");

      const detail = await detailPromise;
      expect(detail.revision).toBe(1);
    });
  });

  describe("version field", () => {
    it("embeds the provided version in all payloads", async () => {
      const customVersion = "2.3.1";
      const target = new EventTarget();
      const bridge = new EventBridge(target, customVersion);

      const detailPromise = captureEvent<WorkflowChangedPayload>(
        target,
        EditorEventName.workflowChanged,
      );
      bridge.emitWorkflowChanged({ format: "json", content: "{}" });
      const detail = await detailPromise;

      expect(detail.version).toBe(customVersion);
    });
  });
});
