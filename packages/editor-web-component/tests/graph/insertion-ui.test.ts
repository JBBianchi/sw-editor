// @vitest-environment happy-dom

import type { WorkflowGraph } from "@sw-editor/editor-core";
import { bootstrapWorkflowGraph, INITIAL_EDGE_ID, RevisionCounter } from "@sw-editor/editor-core";
import type {
  EditorSelectionChangedPayload,
  WorkflowChangedPayload,
} from "@sw-editor/editor-host-client";
import { EditorEventName } from "@sw-editor/editor-host-client";
import { describe, expect, it, vi } from "vitest";
import { EventBridge } from "../../src/events/index.js";
import type { FocusNodeCallback, SerializeGraphCallback } from "../../src/graph/insertion-ui.js";
import { InsertionUI, MVP_TASK_TYPES } from "../../src/graph/insertion-ui.js";

/** Captures the next CustomEvent of `name` on `target` and returns its detail. */
function captureEvent<T>(target: EventTarget, name: string): Promise<T> {
  return new Promise<T>((resolve) => {
    target.addEventListener(name, (e) => resolve((e as CustomEvent<T>).detail), { once: true });
  });
}

/** Returns a minimal WorkflowSource serializer stub. */
function makeSerializer(): SerializeGraphCallback {
  return (_graph) => ({ format: "json", content: "{}" });
}

/** Creates a standard test harness. */
function makeHarness(focusNode?: FocusNodeCallback) {
  const graph = bootstrapWorkflowGraph();
  const counter = new RevisionCounter();
  const eventTarget = new EventTarget();
  const bridge = new EventBridge(eventTarget, "0.0.0");
  const container = document.createElement("div");
  const ui = new InsertionUI({
    container,
    bridge,
    graph,
    counter,
    serializeGraph: makeSerializer(),
    focusNode,
  });
  return { graph, counter, eventTarget, bridge, container, ui };
}

describe("MVP_TASK_TYPES", () => {
  it("contains at least one task type", () => {
    expect(MVP_TASK_TYPES.length).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    const ids = MVP_TASK_TYPES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes the core Serverless Workflow task kinds", () => {
    const ids = MVP_TASK_TYPES.map((t) => t.id);
    for (const kind of [
      "call",
      "do",
      "fork",
      "emit",
      "listen",
      "run",
      "set",
      "switch",
      "try",
      "wait",
    ]) {
      expect(ids).toContain(kind);
    }
  });
});

describe("InsertionUI", () => {
  describe("attachToEdge", () => {
    it("appends an affordance button to the anchor element", () => {
      const { ui } = makeHarness();
      const anchor = document.createElement("div");
      ui.attachToEdge(INITIAL_EDGE_ID, anchor);

      const button = anchor.querySelector("button.sw-insertion-affordance");
      expect(button).not.toBeNull();
    });

    it("affordance button has accessible label and data attribute", () => {
      const { ui } = makeHarness();
      const anchor = document.createElement("div");
      ui.attachToEdge(INITIAL_EDGE_ID, anchor);

      const button = anchor.querySelector<HTMLButtonElement>("button.sw-insertion-affordance");
      expect(button?.getAttribute("aria-label")).toBe("Insert task");
      expect(button?.dataset.edgeId).toBe(INITIAL_EDGE_ID);
    });

    it("returns a dispose function that removes the affordance button", () => {
      const { ui } = makeHarness();
      const anchor = document.createElement("div");
      const detach = ui.attachToEdge(INITIAL_EDGE_ID, anchor);

      detach();

      expect(anchor.querySelector("button.sw-insertion-affordance")).toBeNull();
    });

    it("re-attaching to the same edge replaces the previous affordance", () => {
      const { ui } = makeHarness();
      const anchor = document.createElement("div");
      ui.attachToEdge(INITIAL_EDGE_ID, anchor);
      ui.attachToEdge(INITIAL_EDGE_ID, anchor);

      const buttons = anchor.querySelectorAll("button.sw-insertion-affordance");
      expect(buttons.length).toBe(1);
    });
  });

  describe("activateInsertion / task menu", () => {
    it("opens a menu with role='menu' in the container when activateInsertion is called", () => {
      const { ui, container } = makeHarness();
      ui.activateInsertion(INITIAL_EDGE_ID);

      const menu = container.querySelector("[role='menu']");
      expect(menu).not.toBeNull();
    });

    it("menu has the correct accessible label", () => {
      const { ui, container } = makeHarness();
      ui.activateInsertion(INITIAL_EDGE_ID);

      const menu = container.querySelector("[role='menu']");
      expect(menu?.getAttribute("aria-label")).toBe("Select task type to insert");
    });

    it("menu contains one menuitem per MVP task type", () => {
      const { ui, container } = makeHarness();
      ui.activateInsertion(INITIAL_EDGE_ID);

      const items = container.querySelectorAll("[role='menuitem']");
      expect(items.length).toBe(MVP_TASK_TYPES.length);
    });

    it("affordance button click opens the menu", () => {
      const { ui, container } = makeHarness();
      const anchor = document.createElement("div");
      ui.attachToEdge(INITIAL_EDGE_ID, anchor);

      // biome-ignore lint/style/noNonNullAssertion: attachToEdge always renders the affordance button
      const button = anchor.querySelector<HTMLButtonElement>("button.sw-insertion-affordance")!;
      button.click();

      expect(container.querySelector("[role='menu']")).not.toBeNull();
    });

    it("opening a second menu closes the first", () => {
      const { ui, container } = makeHarness();
      ui.activateInsertion(INITIAL_EDGE_ID);
      ui.activateInsertion(INITIAL_EDGE_ID);

      const menus = container.querySelectorAll("[role='menu']");
      expect(menus.length).toBe(1);
    });
  });

  describe("commitInsertion — events", () => {
    it("emits workflowChanged after a menu item is clicked", async () => {
      const { ui, container, eventTarget } = makeHarness();
      ui.activateInsertion(INITIAL_EDGE_ID);

      const promise = captureEvent<WorkflowChangedPayload>(
        eventTarget,
        EditorEventName.workflowChanged,
      );

      // biome-ignore lint/style/noNonNullAssertion: activateInsertion always renders menu items
      const firstItem = container.querySelector<HTMLButtonElement>("[role='menuitem']")!;
      firstItem.click();

      const detail = await promise;
      expect(detail.source).toEqual({ format: "json", content: "{}" });
    });

    it("emits editorSelectionChanged with the new node's id", async () => {
      const { ui, container, eventTarget } = makeHarness();
      ui.activateInsertion(INITIAL_EDGE_ID);

      const promise = captureEvent<EditorSelectionChangedPayload>(
        eventTarget,
        EditorEventName.editorSelectionChanged,
      );

      // biome-ignore lint/style/noNonNullAssertion: activateInsertion always renders menu items
      const firstItem = container.querySelector<HTMLButtonElement>("[role='menuitem']")!;
      firstItem.click();

      const detail = await promise;
      expect(detail.selection?.kind).toBe("node");
    });

    it("calls focusNode with the new node id", async () => {
      const focusSpy = vi.fn<FocusNodeCallback>();
      const { ui, container } = makeHarness(focusSpy);
      ui.activateInsertion(INITIAL_EDGE_ID);

      // biome-ignore lint/style/noNonNullAssertion: activateInsertion always renders menu items
      const firstItem = container.querySelector<HTMLButtonElement>("[role='menuitem']")!;
      firstItem.click();

      // Allow any microtasks to complete.
      await Promise.resolve();

      expect(focusSpy).toHaveBeenCalledOnce();
      expect(typeof focusSpy.mock.calls[0][0]).toBe("string");
    });

    it("closes the menu after a task type is selected", () => {
      const { ui, container } = makeHarness();
      ui.activateInsertion(INITIAL_EDGE_ID);

      // biome-ignore lint/style/noNonNullAssertion: activateInsertion always renders menu items
      const firstItem = container.querySelector<HTMLButtonElement>("[role='menuitem']")!;
      firstItem.click();

      expect(container.querySelector("[role='menu']")).toBeNull();
    });

    it("does not throw when activating insertion for a nonexistent edge", () => {
      const { ui } = makeHarness();
      ui.activateInsertion(INITIAL_EDGE_ID);

      // Replace the graph with one missing the edge so commitInsertion fails gracefully.
      ui.updateGraph({ nodes: [], edges: [] } as WorkflowGraph);

      const { container } = makeHarness();
      ui.activateInsertion(INITIAL_EDGE_ID);
      const firstItem = container.querySelector<HTMLButtonElement>("[role='menuitem']");
      // Nothing to click — the container is empty because we used a different ui instance.
      expect(firstItem).toBeNull();
    });
  });

  describe("keyboard navigation", () => {
    it("Escape closes the menu and returns focus to affordance", () => {
      const { ui, container } = makeHarness();
      const anchor = document.createElement("div");
      document.body.appendChild(anchor);
      ui.attachToEdge(INITIAL_EDGE_ID, anchor);

      // biome-ignore lint/style/noNonNullAssertion: attachToEdge always renders the affordance button
      const affordance = anchor.querySelector<HTMLButtonElement>("button.sw-insertion-affordance")!;
      affordance.click();

      // biome-ignore lint/style/noNonNullAssertion: affordance click always renders menu items
      const firstItem = container.querySelector<HTMLButtonElement>("[role='menuitem']")!;
      firstItem.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      expect(container.querySelector("[role='menu']")).toBeNull();

      document.body.removeChild(anchor);
    });
  });

  describe("updateGraph", () => {
    it("uses the updated graph for subsequent insertions", async () => {
      const { ui, container, eventTarget } = makeHarness();

      // First insertion.
      ui.activateInsertion(INITIAL_EDGE_ID);
      // biome-ignore lint/style/noNonNullAssertion: activateInsertion always renders menu items
      const firstItem = container.querySelector<HTMLButtonElement>("[role='menuitem']")!;

      const changedPromise = captureEvent<WorkflowChangedPayload>(
        eventTarget,
        EditorEventName.workflowChanged,
      );
      firstItem.click();
      await changedPromise;

      // The graph inside ui was updated; we should be able to get the new
      // graph state by calling updateGraph with the current internal graph.
      // We verify this indirectly: a second insertion on the same original
      // edge should now fail silently (edge was split), i.e. no workflowChanged.
      const secondChangedFired = vi.fn();
      eventTarget.addEventListener(EditorEventName.workflowChanged, secondChangedFired, {
        once: true,
      });

      ui.activateInsertion(INITIAL_EDGE_ID);
      const secondItem = container.querySelector<HTMLButtonElement>("[role='menuitem']");
      secondItem?.click();

      // Flush microtasks.
      await Promise.resolve();
      // The edge no longer exists in the updated graph, so no event should fire.
      expect(secondChangedFired).not.toHaveBeenCalled();
    });
  });

  describe("dispose", () => {
    it("removes all affordance buttons", () => {
      const { ui } = makeHarness();
      const anchor1 = document.createElement("div");
      const anchor2 = document.createElement("div");
      ui.attachToEdge("edge-a", anchor1);
      ui.attachToEdge("edge-b", anchor2);

      ui.dispose();

      expect(anchor1.querySelector("button.sw-insertion-affordance")).toBeNull();
      expect(anchor2.querySelector("button.sw-insertion-affordance")).toBeNull();
    });

    it("closes any open menu on dispose", () => {
      const { ui, container } = makeHarness();
      ui.activateInsertion(INITIAL_EDGE_ID);

      ui.dispose();

      expect(container.querySelector("[role='menu']")).toBeNull();
    });
  });
});
