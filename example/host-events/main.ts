/**
 * Host-events integration example for `@sw-editor/editor-web-component`.
 *
 * Demonstrates the event subscription API:
 *   - `workflowChanged` — emitted when the workflow source is updated.
 *   - `editorDiagnosticsChanged` — emitted after every validation pass.
 *   - `editorSelectionChanged` — emitted when the in-editor selection changes.
 *   - `editorError` — emitted on unrecoverable editor errors.
 *
 * For this standalone demo the editor events are simulated by creating an
 * {@link EventBridge} on a plain `EventTarget`.  In a real integration the
 * target is the `<sw-editor>` custom element and the bridge is internal to
 * the editor bundle — the host only needs to call `addEventListener`.
 *
 * Capabilities are provided via the static snapshot from
 * `@sw-editor/editor-host-client`, matching what `editor.getCapabilities()`
 * would return when the rete-lit renderer bundle is active.
 *
 * No runtime external network calls are made.
 *
 * @module example/host-events/main
 */

import type {
  CapabilitySnapshot,
  EditorDiagnosticsChangedPayload,
  EditorErrorPayload,
  EditorSelectionChangedPayload,
  WorkflowChangedPayload,
} from "@sw-editor/editor-host-client";
import {
  CONTRACT_VERSION,
  EditorEventName,
  SUPPORTED_VERSIONS,
  TARGET_VERSION,
} from "@sw-editor/editor-host-client";
import { EventBridge } from "@sw-editor/editor-web-component";

// ---------------------------------------------------------------------------
// Shared event target — in a real integration this would be the <sw-editor>
// custom element.
// ---------------------------------------------------------------------------

const editorTarget = new EventTarget();

// The EventBridge emits typed CustomEvents on editorTarget.  In production the
// bridge is internal to the editor bundle; the host only observes events.
const bridge = new EventBridge(editorTarget, CONTRACT_VERSION);

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const eventList = document.getElementById("event-list") as HTMLUListElement;
const eventCount = document.getElementById("event-count") as HTMLSpanElement;
const capPlaceholder = document.getElementById("cap-placeholder") as HTMLParagraphElement;
const capTable = document.getElementById("cap-table") as HTMLTableElement;
const capBody = document.getElementById("cap-body") as HTMLTableSectionElement;

const btnSimulateLoad = document.getElementById("btn-simulate-load") as HTMLButtonElement;
const btnSimulateDiag = document.getElementById("btn-simulate-diag") as HTMLButtonElement;
const btnSimulateSelection = document.getElementById("btn-simulate-selection") as HTMLButtonElement;
const btnSimulateError = document.getElementById("btn-simulate-error") as HTMLButtonElement;
const btnGetCap = document.getElementById("btn-get-cap") as HTMLButtonElement;
const btnClear = document.getElementById("btn-clear") as HTMLButtonElement;

// ---------------------------------------------------------------------------
// Event subscriptions
// The host registers listeners on the target element (or a parent via bubbling).
// ---------------------------------------------------------------------------

/**
 * Handles `workflowChanged` events from the editor.
 *
 * @param event - The typed workflow-changed event.
 */
editorTarget.addEventListener(EditorEventName.workflowChanged, (event) => {
  const { source, version, revision } = (event as CustomEvent<WorkflowChangedPayload>).detail;
  appendEvent(
    EditorEventName.workflowChanged,
    `format=${source.format} revision=${revision} contract=${version}`,
  );
});

/**
 * Handles `editorDiagnosticsChanged` events from the editor.
 *
 * @param event - The typed diagnostics event.
 */
editorTarget.addEventListener(EditorEventName.editorDiagnosticsChanged, (event) => {
  const { diagnostics, revision } = (event as CustomEvent<EditorDiagnosticsChangedPayload>).detail;
  const counts = { errors: 0, warnings: 0, infos: 0 };
  for (const d of diagnostics) {
    if (d.severity === "error") counts.errors++;
    else if (d.severity === "warning") counts.warnings++;
    else counts.infos++;
  }
  const { errors, warnings, infos } = counts;
  const summary = `revision=${revision} errors=${errors} warnings=${warnings} infos=${infos}`;
  appendEvent(EditorEventName.editorDiagnosticsChanged, summary);
});

/**
 * Handles `editorSelectionChanged` events from the editor.
 *
 * @param event - The typed selection event.
 */
editorTarget.addEventListener(EditorEventName.editorSelectionChanged, (event) => {
  const { selection, revision } = (event as CustomEvent<EditorSelectionChangedPayload>).detail;
  const id =
    selection == null ? "null" : selection.kind === "node" ? selection.nodeId : selection.edgeId;
  const desc = selection ? `${selection.kind}=${id}` : "null";
  appendEvent(EditorEventName.editorSelectionChanged, `revision=${revision} selection=${desc}`);
});

/**
 * Handles `editorError` events from the editor.
 *
 * @param event - The typed error event.
 */
editorTarget.addEventListener(EditorEventName.editorError, (event) => {
  const { code, message, revision } = (event as CustomEvent<EditorErrorPayload>).detail;
  appendEvent(EditorEventName.editorError, `revision=${revision} code=${code} — ${message}`);
});

// ---------------------------------------------------------------------------
// Simulation buttons
// ---------------------------------------------------------------------------

/** Simulates a workflow-load event from the editor. */
btnSimulateLoad.addEventListener("click", () => {
  bridge.emitWorkflowChanged({ format: "json", content: '{"document":{"dsl":"1.0.0"}}' });
});

/** Simulates a diagnostics event with one warning. */
btnSimulateDiag.addEventListener("click", () => {
  bridge.emitDiagnosticsChanged([
    {
      ruleId: "template-expression-in-endpoint",
      severity: "warning",
      message: "Task 'fetchUser' endpoint contains a template expression",
      location: "do[0].fetchUser.with.endpoint",
    },
  ]);
});

/** Simulates a node-selection event. */
btnSimulateSelection.addEventListener("click", () => {
  bridge.emitSelectionChanged({ kind: "node", nodeId: "fetchUser" });
});

/** Simulates an unrecoverable editor error. */
btnSimulateError.addEventListener("click", () => {
  bridge.emitError("RENDERER_INIT_FAILED", "The renderer failed to initialize.");
});

/** Queries and displays the renderer capability snapshot. */
btnGetCap.addEventListener("click", () => {
  const caps: CapabilitySnapshot = {
    contractVersion: CONTRACT_VERSION,
    targetVersion: TARGET_VERSION,
    supportedVersions: [...SUPPORTED_VERSIONS],
    rendererId: "rete-lit",
    rendererCapabilities: {
      rendererId: "rete-lit",
      rendererVersion: "0.0.0",
      supportsNodeRendererPlugins: false,
      supportsNestedInlineProjection: false,
      supportsRouteOverlayProjection: false,
      knownLimits: ["Nested inline projection not yet implemented"],
    },
  };
  renderCapabilities(caps);
  console.log("[sw-editor example] Capabilities:", caps);
});

/** Clears the event log. */
btnClear.addEventListener("click", () => {
  eventList.innerHTML = '<li><span class="empty">No events yet — click a button above.</span></li>';
  eventCount.textContent = "0";
  _eventTotal = 0;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _eventTotal = 0;

/**
 * Appends a new event entry to the event log list.
 *
 * @param type - The event name string.
 * @param detail - Short human-readable detail string for the entry.
 */
function appendEvent(type: string, detail: string): void {
  // Remove the placeholder on first event.
  const placeholder = eventList.querySelector(".empty");
  if (placeholder) placeholder.parentElement?.remove();

  _eventTotal++;
  eventCount.textContent = String(_eventTotal);

  const now = new Date().toLocaleTimeString();
  const li = document.createElement("li");
  li.innerHTML = `
    <span class="event-time">${now}</span>
    <span class="event-body">
      <span class="type type-${type}">${type}</span><br>
      ${escapeHtml(detail)}
    </span>
  `;
  eventList.prepend(li);
}

/**
 * Renders a capability snapshot into the capabilities table.
 *
 * @param caps - The capability snapshot to display.
 */
function renderCapabilities(caps: CapabilitySnapshot): void {
  capPlaceholder.hidden = true;
  capTable.hidden = false;

  const rows: [string, string][] = [
    ["Contract version", caps.contractVersion],
    ["Target SW version", caps.targetVersion],
    ["Supported versions", caps.supportedVersions.join(", ")],
    ["Renderer ID", caps.rendererId],
    ["Renderer version", caps.rendererCapabilities.rendererVersion],
    ["Node renderer plugins", caps.rendererCapabilities.supportsNodeRendererPlugins ? "yes" : "no"],
    [
      "Nested inline projection",
      caps.rendererCapabilities.supportsNestedInlineProjection ? "yes" : "no",
    ],
    [
      "Route overlay projection",
      caps.rendererCapabilities.supportsRouteOverlayProjection ? "yes" : "no",
    ],
  ];
  if (caps.rendererCapabilities.knownLimits?.length) {
    rows.push(["Known limits", caps.rendererCapabilities.knownLimits.join("; ")]);
  }

  capBody.innerHTML = rows
    .map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`)
    .join("");
}

/**
 * Escapes a string for safe insertion into innerHTML.
 *
 * @param str - The string to escape.
 * @returns HTML-safe string.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
