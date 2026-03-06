/**
 * Storybook stories for the {@link InsertionUI} web component class.
 *
 * Demonstrates the "+" affordance button and the task-type selection menu
 * using the `htmlStory` wrapper for vanilla DOM rendering within the
 * React-based Storybook instance.
 *
 * @module
 */

import type { Meta, StoryObj } from "@storybook/react";
import type { WorkflowGraph } from "@sw-editor/editor-core";
import { RevisionCounter } from "@sw-editor/editor-core";
import { htmlStory } from "../../../../.storybook/html-story.js";
import { EventBridge } from "../events/bridge.js";
import { InsertionUI } from "./insertion-ui.js";

/**
 * Minimal workflow graph with start → end connected by a single edge,
 * providing a realistic insertion target for the affordance.
 */
const STUB_GRAPH: WorkflowGraph = {
  nodes: [
    { id: "__start__", kind: "start" },
    { id: "__end__", kind: "end" },
  ],
  edges: [{ id: "edge-start-end", source: "__start__", target: "__end__" }],
};

/**
 * Inline styles applied to the story containers and affordance elements
 * so the UI is clearly visible without requiring external stylesheets.
 */
const STORY_STYLES = `
  .story-container {
    padding: 32px;
    font-family: system-ui, sans-serif;
  }
  .edge-anchor {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 16px;
    padding: 12px 16px;
    border: 1px dashed #94a3b8;
    border-radius: 8px;
    background: #f8fafc;
    color: #475569;
    font-size: 14px;
  }
  .sw-insertion-affordance {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid #3b82f6;
    background: #eff6ff;
    color: #3b82f6;
    font-size: 18px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
  }
  .sw-insertion-affordance:hover,
  .sw-insertion-affordance:focus-visible {
    background: #3b82f6;
    color: #fff;
    outline: 2px solid #93c5fd;
    outline-offset: 2px;
  }
  .sw-task-menu {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 8px;
    min-width: 180px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    padding: 4px 0;
    z-index: 100;
  }
  .sw-task-menu__item {
    display: block;
    width: 100%;
    padding: 8px 16px;
    border: none;
    background: none;
    text-align: left;
    font-size: 14px;
    color: #1e293b;
    cursor: pointer;
    font-family: inherit;
  }
  .sw-task-menu__item:hover,
  .sw-task-menu__item:focus-visible {
    background: #eff6ff;
    color: #1d4ed8;
    outline: none;
  }
`;

/**
 * Injects scoped styles into a container element.
 *
 * @param container - The DOM element to receive the style block.
 */
function injectStyles(container: HTMLElement): void {
  const style = document.createElement("style");
  style.textContent = STORY_STYLES;
  container.appendChild(style);
}

/**
 * Creates a stub {@link EventBridge} backed by a detached DOM element.
 *
 * @returns An EventBridge suitable for story use.
 */
function createStubBridge(): EventBridge {
  return new EventBridge(document.createElement("div"), "0.0.0-storybook");
}

/**
 * Storybook metadata for the `InsertionUI` component.
 *
 * Stories are grouped under the "Web Components/Graph" category to reflect
 * their package origin.
 */
const meta: Meta = {
  title: "Web Components/Graph/InsertionUI",
};

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Default story: renders a single "+" affordance button attached to a
 * simulated edge anchor. Clicking the button opens the task-type menu.
 */
export const Default: Story = htmlStory(() => {
  const container = document.createElement("div");
  container.className = "story-container";
  injectStyles(container);

  const anchor = document.createElement("div");
  anchor.className = "edge-anchor";
  anchor.textContent = "Edge: start → end";
  container.appendChild(anchor);

  const ui = new InsertionUI({
    container,
    bridge: createStubBridge(),
    graph: structuredClone(STUB_GRAPH),
    counter: new RevisionCounter(),
    serializeGraph: () => ({ format: "yaml", content: "# stub" }),
  });

  ui.attachToEdge("edge-start-end", anchor);

  return container;
});

/**
 * Story with the task-type selection menu pre-opened so it is immediately
 * visible for visual review and interaction testing.
 */
export const MenuOpen: Story = htmlStory(() => {
  const container = document.createElement("div");
  container.className = "story-container";
  injectStyles(container);

  const anchor = document.createElement("div");
  anchor.className = "edge-anchor";
  anchor.textContent = "Edge: start → end";
  container.appendChild(anchor);

  const ui = new InsertionUI({
    container,
    bridge: createStubBridge(),
    graph: structuredClone(STUB_GRAPH),
    counter: new RevisionCounter(),
    serializeGraph: () => ({ format: "yaml", content: "# stub" }),
  });

  ui.attachToEdge("edge-start-end", anchor);
  ui.activateInsertion("edge-start-end");

  return container;
});
