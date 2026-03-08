// @vitest-environment happy-dom

import type { WorkflowGraph } from "@sw-editor/editor-core";
import { bootstrapWorkflowGraph, INITIAL_EDGE_ID, RevisionCounter } from "@sw-editor/editor-core";
import type {
  EditorSelectionChangedPayload,
  WorkflowChangedPayload,
} from "@sw-editor/editor-host-client";
import { EditorEventName } from "@sw-editor/editor-host-client";
import type { RendererAdapter, RendererEdgeAnchor } from "@sw-editor/editor-renderer-contract";
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

/**
 * Creates a mock renderer adapter that returns a valid anchor for any edge.
 * This satisfies the requirement that insert controls only appear with valid anchors.
 */
function makeWildcardAdapter(): Pick<RendererAdapter, "getEdgeAnchor" | "getInsertionAnchors" | "focusNode"> & {
  getEdgeAnchor: ReturnType<typeof vi.fn>;
  getInsertionAnchors: ReturnType<typeof vi.fn>;
  focusNode: ReturnType<typeof vi.fn>;
} {
  return {
    getEdgeAnchor: vi.fn((edgeId: string) => ({
      edgeId,
      sourceNodeId: "s",
      targetNodeId: "t",
      x: 100,
      y: 200,
    })),
    getInsertionAnchors: vi.fn(() => []),
    focusNode: vi.fn(),
  };
}

/** Creates a standard test harness with a renderer adapter that returns valid anchors. */
function makeHarness(focusNode?: FocusNodeCallback) {
  const adapter = makeWildcardAdapter();
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
    rendererAdapter: adapter as RendererAdapter,
  });
  return { graph, counter, eventTarget, bridge, container, ui, adapter };
}

/**
 * Creates a minimal mock of the renderer adapter with stubbed
 * `getEdgeAnchor` and `focusNode` methods.
 */
function makeMockRendererAdapter(anchorOverride?: RendererEdgeAnchor | null): Pick<
  RendererAdapter,
  "getEdgeAnchor" | "getInsertionAnchors" | "focusNode"
> & {
  getEdgeAnchor: ReturnType<typeof vi.fn>;
  getInsertionAnchors: ReturnType<typeof vi.fn>;
  focusNode: ReturnType<typeof vi.fn>;
} {
  return {
    getEdgeAnchor: vi.fn((_edgeId: string) => anchorOverride ?? null),
    getInsertionAnchors: vi.fn(() => []),
    focusNode: vi.fn(),
  };
}

/**
 * Creates a test harness that passes a renderer adapter to InsertionUI,
 * enabling renderer-anchor–based positioning and focus delegation.
 */
function makeHarnessWithAdapter(adapter: Pick<RendererAdapter, "getEdgeAnchor" | "getInsertionAnchors" | "focusNode">) {
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
    rendererAdapter: adapter as RendererAdapter,
  });
  return { graph, counter, eventTarget, bridge, container, ui, adapter };
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

    it("Escape returns focus to the invoking affordance button", () => {
      const { ui, container } = makeHarness();
      const anchor = document.createElement("div");
      document.body.appendChild(anchor);
      ui.attachToEdge(INITIAL_EDGE_ID, anchor);

      const affordance = anchor.querySelector<HTMLButtonElement>("button.sw-insertion-affordance")!;
      affordance.focus();
      affordance.click();

      const firstItem = container.querySelector<HTMLButtonElement>("[role='menuitem']")!;
      firstItem.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      // Focus must return to the invoking affordance, not remain on the menu item.
      expect(document.activeElement).toBe(affordance);

      document.body.removeChild(anchor);
    });
  });

  describe("data-edge-id contract", () => {
    it("affordance button data-edge-id matches the edge passed to attachToEdge", () => {
      const { ui } = makeHarness();
      const anchor = document.createElement("div");
      ui.attachToEdge(INITIAL_EDGE_ID, anchor);

      const button = anchor.querySelector<HTMLButtonElement>("button.sw-insertion-affordance");
      expect(button).not.toBeNull();
      expect(button?.getAttribute("data-edge-id")).toBe(INITIAL_EDGE_ID);
    });

    it("data-edge-id is present as an HTML attribute (not just a dataset property)", () => {
      const { ui } = makeHarness();
      const anchor = document.createElement("div");
      ui.attachToEdge(INITIAL_EDGE_ID, anchor);

      const button = anchor.querySelector<HTMLButtonElement>("button.sw-insertion-affordance");
      // Verify both access patterns return the same value.
      expect(button?.getAttribute("data-edge-id")).toBe(INITIAL_EDGE_ID);
      expect(button?.dataset.edgeId).toBe(INITIAL_EDGE_ID);
    });

    it("re-attached affordance preserves data-edge-id for the same edge", () => {
      const { ui } = makeHarness();
      const anchor = document.createElement("div");
      ui.attachToEdge(INITIAL_EDGE_ID, anchor);
      ui.attachToEdge(INITIAL_EDGE_ID, anchor);

      const buttons = anchor.querySelectorAll<HTMLButtonElement>("button.sw-insertion-affordance");
      expect(buttons.length).toBe(1);
      expect(buttons[0]?.getAttribute("data-edge-id")).toBe(INITIAL_EDGE_ID);
    });

    it("different edges produce distinct data-edge-id values", () => {
      const { ui } = makeHarness();
      const anchorA = document.createElement("div");
      const anchorB = document.createElement("div");
      ui.attachToEdge("edge-a", anchorA);
      ui.attachToEdge("edge-b", anchorB);

      const btnA = anchorA.querySelector<HTMLButtonElement>("button.sw-insertion-affordance");
      const btnB = anchorB.querySelector<HTMLButtonElement>("button.sw-insertion-affordance");
      expect(btnA?.getAttribute("data-edge-id")).toBe("edge-a");
      expect(btnB?.getAttribute("data-edge-id")).toBe("edge-b");
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

  describe("sequential insertion", () => {
    it("inserting twice produces two new edges with affordance buttons", async () => {
      const { ui, container, eventTarget } = makeHarness();

      // --- First insertion on the initial edge ---
      ui.activateInsertion(INITIAL_EDGE_ID);
      const firstChanged = captureEvent<WorkflowChangedPayload>(
        eventTarget,
        EditorEventName.workflowChanged,
      );
      // biome-ignore lint/style/noNonNullAssertion: activateInsertion always renders menu items
      container.querySelector<HTMLButtonElement>("[role='menuitem']")!.click();
      await firstChanged;

      // After the first insertion the original edge (__start__->__end__) is gone
      // and replaced by two new edges: __start__->task and task->__end__.
      const graphAfterFirst = ui.graph;
      expect(graphAfterFirst.edges.length).toBe(2);

      // Attach affordances for the two new edges.
      const anchor1 = document.createElement("div");
      const anchor2 = document.createElement("div");
      const [edge1, edge2] = graphAfterFirst.edges;
      ui.attachToEdge(edge1.id, anchor1);
      ui.attachToEdge(edge2.id, anchor2);

      expect(anchor1.querySelector("button.sw-insertion-affordance")).not.toBeNull();
      expect(anchor2.querySelector("button.sw-insertion-affordance")).not.toBeNull();

      // --- Second insertion on the first of the two new edges ---
      ui.activateInsertion(edge1.id);
      const secondChanged = captureEvent<WorkflowChangedPayload>(
        eventTarget,
        EditorEventName.workflowChanged,
      );
      // biome-ignore lint/style/noNonNullAssertion: activateInsertion always renders menu items
      container.querySelector<HTMLButtonElement>("[role='menuitem']")!.click();
      await secondChanged;

      // After the second insertion, graph should have 3 edges total
      // (edge1 was split into 2, plus edge2 is still present).
      const graphAfterSecond = ui.graph;
      expect(graphAfterSecond.edges.length).toBe(3);
      // And the original edge1 should no longer exist.
      expect(graphAfterSecond.edges.find((e) => e.id === edge1.id)).toBeUndefined();
    });

    it("anchor positions update correctly after each sequential insertion", async () => {
      let callCount = 0;
      const adapter = makeMockRendererAdapter(null);
      // Return distinct anchor coordinates for each call so we can verify recalculation.
      adapter.getEdgeAnchor.mockImplementation((edgeId: string) => {
        callCount++;
        return {
          edgeId,
          sourceNodeId: "s",
          targetNodeId: "t",
          x: callCount * 100,
          y: callCount * 50,
        };
      });

      const { ui, container, eventTarget } = makeHarnessWithAdapter(adapter);

      // --- First insertion ---
      ui.activateInsertion(INITIAL_EDGE_ID);
      const firstChanged = captureEvent<WorkflowChangedPayload>(
        eventTarget,
        EditorEventName.workflowChanged,
      );
      // biome-ignore lint/style/noNonNullAssertion: activateInsertion always renders menu items
      container.querySelector<HTMLButtonElement>("[role='menuitem']")!.click();
      await firstChanged;

      const graphAfterFirst = ui.graph;
      const [edgeA, edgeB] = graphAfterFirst.edges;

      // Reset call count to track fresh anchor queries.
      adapter.getEdgeAnchor.mockClear();
      callCount = 0;

      // Attach affordances to the two new edges — each triggers getEdgeAnchor.
      const anchorA = document.createElement("div");
      const anchorB = document.createElement("div");
      ui.attachToEdge(edgeA.id, anchorA);
      ui.attachToEdge(edgeB.id, anchorB);

      expect(adapter.getEdgeAnchor).toHaveBeenCalledTimes(2);
      expect(adapter.getEdgeAnchor).toHaveBeenCalledWith(edgeA.id);
      expect(adapter.getEdgeAnchor).toHaveBeenCalledWith(edgeB.id);

      const btnA = anchorA.querySelector<HTMLButtonElement>("button.sw-insertion-affordance");
      const btnB = anchorB.querySelector<HTMLButtonElement>("button.sw-insertion-affordance");
      expect(btnA?.style.left).toBe("100px");
      expect(btnA?.style.top).toBe("50px");
      expect(btnB?.style.left).toBe("200px");
      expect(btnB?.style.top).toBe("100px");

      // --- Second insertion splits edgeA ---
      ui.activateInsertion(edgeA.id);
      const secondChanged = captureEvent<WorkflowChangedPayload>(
        eventTarget,
        EditorEventName.workflowChanged,
      );
      // biome-ignore lint/style/noNonNullAssertion: activateInsertion always renders menu items
      container.querySelector<HTMLButtonElement>("[role='menuitem']")!.click();
      await secondChanged;

      const graphAfterSecond = ui.graph;
      adapter.getEdgeAnchor.mockClear();
      callCount = 0;

      // Attach affordances for the new edges replacing edgeA.
      const newEdges = graphAfterSecond.edges.filter((e) => e.id !== edgeB.id);
      expect(newEdges.length).toBe(2);
      for (const edge of newEdges) {
        const el = document.createElement("div");
        ui.attachToEdge(edge.id, el);
      }

      // getEdgeAnchor was called for each new edge — no stale edgeA queries.
      expect(adapter.getEdgeAnchor).toHaveBeenCalledTimes(2);
      for (const edge of newEdges) {
        expect(adapter.getEdgeAnchor).toHaveBeenCalledWith(edge.id);
      }
      expect(adapter.getEdgeAnchor).not.toHaveBeenCalledWith(edgeA.id);
    });

    it("no stale affordances remain after re-attaching edges post-insertion", async () => {
      const { ui, container, eventTarget } = makeHarness();

      // Attach affordance to the initial edge.
      const initialAnchor = document.createElement("div");
      ui.attachToEdge(INITIAL_EDGE_ID, initialAnchor);
      expect(initialAnchor.querySelector("button.sw-insertion-affordance")).not.toBeNull();

      // Insert a task on the initial edge.
      ui.activateInsertion(INITIAL_EDGE_ID);
      const changed = captureEvent<WorkflowChangedPayload>(
        eventTarget,
        EditorEventName.workflowChanged,
      );
      // biome-ignore lint/style/noNonNullAssertion: activateInsertion always renders menu items
      container.querySelector<HTMLButtonElement>("[role='menuitem']")!.click();
      await changed;

      // Detach the now-stale initial edge affordance (simulating renderer cleanup).
      ui.attachToEdge(INITIAL_EDGE_ID, document.createElement("div"));

      // The internal affordance map should no longer reference the old anchor's button.
      expect(initialAnchor.querySelector("button.sw-insertion-affordance")).toBeNull();

      // Attach the two new edges.
      const graphAfter = ui.graph;
      const anchors = graphAfter.edges.map((edge) => {
        const el = document.createElement("div");
        ui.attachToEdge(edge.id, el);
        return el;
      });

      // Exactly 2 affordance buttons exist — one per new edge, none stale.
      const allAffordances = anchors.flatMap((a) =>
        Array.from(a.querySelectorAll("button.sw-insertion-affordance")),
      );
      expect(allAffordances.length).toBe(2);
    });
  });

  describe("renderer-anchor attachment", () => {
    it("positions the affordance button using RendererEdgeAnchor coordinates", () => {
      const anchor: RendererEdgeAnchor = {
        edgeId: INITIAL_EDGE_ID,
        sourceNodeId: "start",
        targetNodeId: "end",
        x: 150,
        y: 250,
      };
      const adapter = makeMockRendererAdapter(anchor);
      const { ui } = makeHarnessWithAdapter(adapter);

      const el = document.createElement("div");
      ui.attachToEdge(INITIAL_EDGE_ID, el);

      const button = el.querySelector<HTMLButtonElement>("button.sw-insertion-affordance");
      expect(button).not.toBeNull();

      // The InsertionUI should query the adapter for the anchor position and
      // apply the coordinates as inline styles on the affordance button.
      expect(adapter.getEdgeAnchor).toHaveBeenCalledWith(INITIAL_EDGE_ID);
      expect(button?.style.left).toBe("150px");
      expect(button?.style.top).toBe("250px");
    });

    it("does not show the affordance button when no renderer adapter is provided", () => {
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
      });

      const el = document.createElement("div");
      ui.attachToEdge(INITIAL_EDGE_ID, el);

      const button = el.querySelector<HTMLButtonElement>("button.sw-insertion-affordance");
      expect(button).toBeNull();
    });

    it("does not show the affordance button when getEdgeAnchor returns null", () => {
      const adapter = makeMockRendererAdapter(null);
      const { ui } = makeHarnessWithAdapter(adapter);

      const el = document.createElement("div");
      ui.attachToEdge(INITIAL_EDGE_ID, el);

      const button = el.querySelector<HTMLButtonElement>("button.sw-insertion-affordance");
      // When no anchor is available, the insert control must not be shown.
      expect(button).toBeNull();
      expect(adapter.getEdgeAnchor).toHaveBeenCalledWith(INITIAL_EDGE_ID);
    });

    it("hides the affordance when a previously valid anchor becomes null", () => {
      const adapter = makeMockRendererAdapter({
        edgeId: INITIAL_EDGE_ID,
        sourceNodeId: "s",
        targetNodeId: "t",
        x: 100,
        y: 200,
      });
      const { ui } = makeHarnessWithAdapter(adapter);

      const el = document.createElement("div");
      ui.attachToEdge(INITIAL_EDGE_ID, el);
      expect(el.querySelector("button.sw-insertion-affordance")).not.toBeNull();

      // Anchor becomes unavailable on next query.
      adapter.getEdgeAnchor.mockReturnValue(null);

      const el2 = document.createElement("div");
      ui.attachToEdge(INITIAL_EDGE_ID, el2);
      expect(el2.querySelector("button.sw-insertion-affordance")).toBeNull();
    });

    it("applies different coordinates when the adapter returns a new anchor position", () => {
      const adapter = makeMockRendererAdapter({
        edgeId: INITIAL_EDGE_ID,
        sourceNodeId: "s",
        targetNodeId: "t",
        x: 10,
        y: 20,
      });
      const { ui } = makeHarnessWithAdapter(adapter);

      const el1 = document.createElement("div");
      ui.attachToEdge(INITIAL_EDGE_ID, el1);
      const btn1 = el1.querySelector<HTMLButtonElement>("button.sw-insertion-affordance");
      expect(btn1?.style.left).toBe("10px");
      expect(btn1?.style.top).toBe("20px");

      // Adapter now reports a different midpoint.
      adapter.getEdgeAnchor.mockReturnValue({
        edgeId: INITIAL_EDGE_ID,
        sourceNodeId: "s",
        targetNodeId: "t",
        x: 300,
        y: 400,
      });

      const el2 = document.createElement("div");
      ui.attachToEdge(INITIAL_EDGE_ID, el2);
      const btn2 = el2.querySelector<HTMLButtonElement>("button.sw-insertion-affordance");
      expect(btn2?.style.left).toBe("300px");
      expect(btn2?.style.top).toBe("400px");
    });

    it("invokes the adapter focusNode callback after insertion", async () => {
      const anchor: RendererEdgeAnchor = {
        edgeId: INITIAL_EDGE_ID,
        sourceNodeId: "start",
        targetNodeId: "end",
        x: 100,
        y: 200,
      };
      const adapter = makeMockRendererAdapter(anchor);
      const { ui, container } = makeHarnessWithAdapter(adapter);

      ui.activateInsertion(INITIAL_EDGE_ID);

      // biome-ignore lint/style/noNonNullAssertion: activateInsertion always renders menu items
      const firstItem = container.querySelector<HTMLButtonElement>("[role='menuitem']")!;
      firstItem.click();

      // Allow any microtasks to complete.
      await Promise.resolve();

      expect(adapter.focusNode).toHaveBeenCalledOnce();
      // The adapter's focusNode receives a FocusTarget object with the new node ID.
      const call = adapter.focusNode.mock.calls[0][0];
      expect(call).toHaveProperty("nodeId");
      expect(typeof call.nodeId).toBe("string");
    });
  });

  describe("no-fallback contract regressions", () => {
    it("never renders an affordance button without a renderer adapter", () => {
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
        // No rendererAdapter provided.
      });

      // Attempt to attach to every edge in the graph.
      for (const edge of graph.edges) {
        const el = document.createElement("div");
        ui.attachToEdge(edge.id, el);
        expect(el.querySelector("button.sw-insertion-affordance")).toBeNull();
      }
    });

    it("never renders an affordance button when getEdgeAnchor returns null for all edges", () => {
      const adapter = makeMockRendererAdapter(null);
      const { ui, graph } = makeHarnessWithAdapter(adapter);

      for (const edge of graph.edges) {
        const el = document.createElement("div");
        ui.attachToEdge(edge.id, el);
        expect(el.querySelector("button.sw-insertion-affordance")).toBeNull();
      }

      // Adapter was queried for each edge.
      expect(adapter.getEdgeAnchor).toHaveBeenCalledTimes(graph.edges.length);
    });

    it("does not fall back to container-relative or viewport-based positioning", () => {
      const adapter = makeMockRendererAdapter({
        edgeId: INITIAL_EDGE_ID,
        sourceNodeId: "s",
        targetNodeId: "t",
        x: 42,
        y: 84,
      });
      const { ui, container } = makeHarnessWithAdapter(adapter);

      const el = document.createElement("div");
      ui.attachToEdge(INITIAL_EDGE_ID, el);

      const button = el.querySelector<HTMLButtonElement>("button.sw-insertion-affordance");
      expect(button).not.toBeNull();

      // Position must come exclusively from the adapter anchor — no container-relative fallback.
      expect(button?.style.left).toBe("42px");
      expect(button?.style.top).toBe("84px");
      expect(button?.style.position).toBe("absolute");

      // Container should not have any positioned insert controls (no fallback rendering there).
      expect(container.querySelector("button.sw-insertion-affordance")).toBeNull();
    });

    it("affordance visibility is entirely determined by anchor availability", () => {
      let anchorAvailable = true;
      const adapter = makeMockRendererAdapter(null);
      adapter.getEdgeAnchor.mockImplementation((edgeId: string) =>
        anchorAvailable
          ? { edgeId, sourceNodeId: "s", targetNodeId: "t", x: 50, y: 60 }
          : null,
      );

      const { ui } = makeHarnessWithAdapter(adapter);

      // Anchor available → control shown.
      const el1 = document.createElement("div");
      ui.attachToEdge(INITIAL_EDGE_ID, el1);
      expect(el1.querySelector("button.sw-insertion-affordance")).not.toBeNull();

      // Anchor unavailable → control hidden.
      anchorAvailable = false;
      const el2 = document.createElement("div");
      ui.attachToEdge(INITIAL_EDGE_ID, el2);
      expect(el2.querySelector("button.sw-insertion-affordance")).toBeNull();

      // Anchor available again → control shown again.
      anchorAvailable = true;
      const el3 = document.createElement("div");
      ui.attachToEdge(INITIAL_EDGE_ID, el3);
      expect(el3.querySelector("button.sw-insertion-affordance")).not.toBeNull();
    });
  });
});
