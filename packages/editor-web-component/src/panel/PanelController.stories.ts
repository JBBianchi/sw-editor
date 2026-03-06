/**
 * Storybook stories for the {@link PanelController} web component.
 *
 * Demonstrates selection-driven property panel switching using the
 * `htmlStory` wrapper for vanilla DOM elements within the React-based
 * Storybook instance.
 *
 * @module
 */

import type { Meta, StoryObj } from "@storybook/react";
import type { EditorSelectionChangedPayload } from "@sw-editor/editor-host-client";
import { EditorEventName } from "@sw-editor/editor-host-client";
import { htmlStory } from "../../../../.storybook/html-story.js";
import { PanelController } from "./panel-controller.js";

/**
 * Storybook metadata for the `PanelController` component.
 */
const meta: Meta = {
  title: "Web Components/PanelController",
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Dispatches an `editorSelectionChanged` custom event on the given target.
 *
 * @param target - The event target to dispatch on.
 * @param selection - The selection payload, or `null` for workflow-level.
 */
function emitSelection(
  target: EventTarget,
  selection: EditorSelectionChangedPayload["selection"],
): void {
  const detail: EditorSelectionChangedPayload = {
    version: "0.0.0",
    revision: 1,
    selection,
  };
  target.dispatchEvent(
    new CustomEvent(EditorEventName.editorSelectionChanged, {
      detail,
      bubbles: true,
      composed: true,
    }),
  );
}

/**
 * Creates a styled button element.
 *
 * @param label - Button text.
 * @param onClick - Click handler.
 * @returns The button element.
 */
function createButton(label: string, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.style.cssText =
    "padding:6px 14px;margin:0 4px;cursor:pointer;border:1px solid #ccc;border-radius:4px;background:#f8f8f8;";
  btn.addEventListener("click", onClick);
  return btn;
}

/**
 * Builds the complete demo DOM tree with interactive selection controls
 * and a live panel display area.
 *
 * @returns The root container element.
 */
function buildDemo(): HTMLElement {
  const root = document.createElement("div");
  root.style.cssText = "font-family:system-ui,sans-serif;max-width:480px;";

  // ARIA live region for accessibility announcements
  const liveRegion = document.createElement("div");
  liveRegion.setAttribute("aria-live", "polite");
  liveRegion.setAttribute("role", "status");
  liveRegion.style.cssText = "font-size:12px;color:#666;margin-bottom:12px;min-height:20px;";
  liveRegion.textContent = "Workflow properties panel";

  // Event target for the PanelController
  const eventTarget = new EventTarget();
  const controller = new PanelController(eventTarget, liveRegion);

  // Panel display area
  const panelDisplay = document.createElement("div");
  panelDisplay.style.cssText =
    "border:1px solid #ddd;border-radius:6px;padding:16px;min-height:80px;background:#fafafa;";
  panelDisplay.innerHTML =
    "<strong>Workflow Properties</strong><p>Editing workflow-level settings.</p>";

  // Subscribe to context changes
  controller.subscribe((ctx) => {
    switch (ctx.kind) {
      case "workflow":
        panelDisplay.innerHTML =
          "<strong>Workflow Properties</strong><p>Editing workflow-level settings.</p>";
        break;
      case "node":
        panelDisplay.innerHTML = `<strong>Node Properties</strong><p>Selected node: <code>${ctx.nodeId}</code></p>`;
        break;
      case "edge":
        panelDisplay.innerHTML = `<strong>Edge Properties</strong><p>Selected edge: <code>${ctx.edgeId}</code></p>`;
        break;
    }
  });

  // Toolbar with selection buttons
  const toolbar = document.createElement("div");
  toolbar.style.cssText = "margin-bottom:12px;display:flex;flex-wrap:wrap;gap:4px;";

  toolbar.appendChild(
    createButton("Select Node A", () =>
      emitSelection(eventTarget, { kind: "node", nodeId: "node-a" }),
    ),
  );
  toolbar.appendChild(
    createButton("Select Node B", () =>
      emitSelection(eventTarget, { kind: "node", nodeId: "node-b" }),
    ),
  );
  toolbar.appendChild(
    createButton("Select Edge", () =>
      emitSelection(eventTarget, { kind: "edge", edgeId: "edge-1" }),
    ),
  );
  toolbar.appendChild(createButton("Clear Selection", () => emitSelection(eventTarget, null)));

  root.appendChild(toolbar);
  root.appendChild(liveRegion);
  root.appendChild(panelDisplay);

  return root;
}

/** Interactive demo showing panel context switching driven by simulated selection events. */
export const Default: Story = htmlStory(buildDemo);
