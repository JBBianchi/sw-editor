/**
 * Storybook stories for the {@link DiagnosticsRenderer} component.
 *
 * Each story demonstrates diagnostic rendering behaviour using the
 * `htmlStory` wrapper so that vanilla DOM elements work within the
 * React-based Storybook instance.
 *
 * @module
 */

import type { Meta, StoryObj } from "@storybook/react";
import type { DiagnosticsCollection, WorkflowGraph } from "@sw-editor/editor-core";
import { htmlStory } from "../../../../.storybook/html-story.js";
import { DiagnosticsRenderer } from "./rendering.js";

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

/** Minimal workflow graph with two task nodes for diagnostic targeting. */
const sampleGraph: WorkflowGraph = {
  nodes: [
    { id: "__start__", kind: "start" },
    { id: "task-1", kind: "task", taskReference: "validateInput" },
    { id: "task-2", kind: "task", taskReference: "processPayload" },
    { id: "__end__", kind: "end" },
  ],
  edges: [
    { id: "e-start-1", source: "__start__", target: "task-1" },
    { id: "e-1-2", source: "task-1", target: "task-2" },
    { id: "e-2-end", source: "task-2", target: "__end__" },
  ],
};

/** Diagnostics mapped to specific task nodes. */
const nodeDiagnostics: DiagnosticsCollection = [
  {
    ruleId: "input-required",
    severity: "error",
    message: "Missing required input parameter 'userId'",
    location: "/do/0/validateInput",
  },
  {
    ruleId: "deprecated-action",
    severity: "warning",
    message: "Action 'legacyTransform' is deprecated",
    location: "/do/1/processPayload",
  },
];

/** Diagnostics that cannot be mapped to any node (appear in summary panel). */
const unmappedDiagnostics: DiagnosticsCollection = [
  {
    ruleId: "schema-version",
    severity: "error",
    message: "Workflow schema version '0.7' is not supported",
    location: "/version",
  },
  {
    ruleId: "missing-timeout",
    severity: "warning",
    message: "No global timeout configured for workflow",
    location: "/timeouts",
  },
  {
    ruleId: "naming-convention",
    severity: "info",
    message: "Workflow name should use kebab-case",
    location: "/name",
  },
];

/** Combined set of node-mapped and unmapped diagnostics. */
const mixedDiagnostics: DiagnosticsCollection = [...nodeDiagnostics, ...unmappedDiagnostics];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Inline styles for the story container. */
const CONTAINER_STYLE = "font-family: sans-serif; padding: 24px; max-width: 640px;";

/** Inline styles for simulated task nodes. */
const NODE_STYLE =
  "position: relative; display: inline-flex; align-items: center; gap: 8px; border: 1px solid #ccc; border-radius: 6px; padding: 8px 16px; margin: 8px; background: #fafafa;";

/** Inline styles for diagnostic indicator badges. */
const INDICATOR_STYLE = `
  .sw-diagnostic-indicator {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-left: 4px;
    vertical-align: middle;
  }
  .sw-diagnostic--error {
    background-color: #e53e3e;
  }
  .sw-diagnostic--warning {
    background-color: #dd6b20;
  }
  .sw-diagnostic--info {
    background-color: #3182ce;
  }
  .sw-diagnostic-summary {
    margin-top: 16px;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    background: #f7fafc;
  }
  .sw-diagnostic-summary__item {
    margin: 4px 0;
    font-size: 0.875rem;
  }
  .sw-diagnostic-summary__item.sw-diagnostic--error {
    color: #e53e3e;
    background: transparent;
  }
  .sw-diagnostic-summary__item.sw-diagnostic--warning {
    color: #dd6b20;
    background: transparent;
  }
  .sw-diagnostic-summary__item.sw-diagnostic--info {
    color: #3182ce;
    background: transparent;
  }
`;

/**
 * Builds a story container with simulated task node elements, injects
 * diagnostic styles, and returns the container plus a node-element lookup.
 *
 * @param label - Descriptive heading shown above the nodes.
 * @returns An object with the container element and `findNodeElement` callback.
 */
function buildStoryContainer(label: string): {
  container: HTMLElement;
  findNodeElement: (id: string) => HTMLElement | null;
} {
  const nodeElements = new Map<string, HTMLElement>();

  const container = document.createElement("div");
  container.setAttribute("style", CONTAINER_STYLE);

  // Inject styles
  const style = document.createElement("style");
  style.textContent = INDICATOR_STYLE;
  container.appendChild(style);

  // Heading
  const heading = document.createElement("h3");
  heading.textContent = label;
  heading.setAttribute("style", "margin: 0 0 12px;");
  container.appendChild(heading);

  // Simulated node strip
  const strip = document.createElement("div");
  strip.setAttribute("style", "display: flex; flex-wrap: wrap; align-items: center;");

  for (const node of sampleGraph.nodes) {
    if (node.kind === "start" || node.kind === "end") continue;
    const el = document.createElement("div");
    el.setAttribute("style", NODE_STYLE);
    el.setAttribute("data-node-id", node.id);
    el.textContent = node.taskReference ?? node.id;
    strip.appendChild(el);
    nodeElements.set(node.id, el);
  }

  container.appendChild(strip);

  return {
    container,
    findNodeElement: (id: string) => nodeElements.get(id) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Meta
// ---------------------------------------------------------------------------

const meta = {
  title: "Web Components/DiagnosticsRenderer",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/** Node indicators showing error and warning badges on task nodes. */
export const NodeIndicators: Story = htmlStory(() => {
  const { container, findNodeElement } = buildStoryContainer("Node Diagnostic Indicators");
  const renderer = new DiagnosticsRenderer({ container, findNodeElement });
  renderer.apply(nodeDiagnostics, sampleGraph);
  return container;
});

/** Summary panel displaying diagnostics that cannot be mapped to nodes. */
export const SummaryPanel: Story = htmlStory(() => {
  const { container, findNodeElement } = buildStoryContainer("Diagnostics Summary Panel");
  const renderer = new DiagnosticsRenderer({ container, findNodeElement });
  renderer.apply(unmappedDiagnostics, sampleGraph);
  return container;
});

/** Combined view with both node indicators and the summary panel. */
export const Mixed: Story = htmlStory(() => {
  const { container, findNodeElement } = buildStoryContainer("Node Indicators + Summary Panel");
  const renderer = new DiagnosticsRenderer({ container, findNodeElement });
  renderer.apply(mixedDiagnostics, sampleGraph);
  return container;
});

/** Empty diagnostics collection — no indicators or summary panel rendered. */
export const Empty: Story = htmlStory(() => {
  const { container, findNodeElement } = buildStoryContainer("No Diagnostics");
  const renderer = new DiagnosticsRenderer({ container, findNodeElement });
  renderer.apply([], sampleGraph);
  return container;
});
