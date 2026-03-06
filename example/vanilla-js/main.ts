/**
 * Vanilla-JS host integration example for `@sw-editor/editor-host-client`.
 *
 * Demonstrates the load → export workflow:
 *   1. Import a workflow fixture (JSON) bundled by Vite.
 *   2. Pass it to `setCurrentSource` to register it as the active source.
 *   3. Export it via `exportWorkflowSource` as JSON or YAML.
 *
 * In a complete integration the host application calls these operations
 * through the `<sw-editor>` custom element, which owns parsing, graph
 * projection, and visual rendering.  This example exercises the same
 * host-client surface directly so it runs without requiring a built
 * renderer bundle.
 *
 * No runtime external network calls are made — the fixture is bundled
 * at build time by Vite.
 *
 * @module example/vanilla-js/main
 */

import type { WorkflowSource } from "@sw-editor/editor-host-client";
import { exportWorkflowSource, setCurrentSource } from "@sw-editor/editor-host-client";

// The fixture is bundled at build time — no runtime network call needed.
import simpleWorkflow from "../../tests/fixtures/valid/simple.json";

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const btnLoad = document.getElementById("btn-load") as HTMLButtonElement;
const btnExport = document.getElementById("btn-export") as HTMLButtonElement;
const btnExportYaml = document.getElementById("btn-export-yaml") as HTMLButtonElement;
const loadStatus = document.getElementById("load-status") as HTMLParagraphElement;
const exportStatus = document.getElementById("export-status") as HTMLParagraphElement;
const outputPre = document.getElementById("output") as HTMLPreElement;

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

/**
 * Stores the fixture as the current workflow source and enables the export
 * buttons.
 */
btnLoad.addEventListener("click", () => {
  try {
    const content = JSON.stringify(simpleWorkflow, null, 2);
    const source: WorkflowSource = { format: "json", content };

    // Register the loaded source with the host-client so exportWorkflowSource
    // can re-serialize it in the requested format.
    setCurrentSource(source);

    setStatus(loadStatus, "Workflow loaded successfully.", "ok");
    btnExport.disabled = false;
    btnExportYaml.disabled = false;
    console.log("[sw-editor example] Loaded workflow source:", source);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setStatus(loadStatus, `Error: ${message}`, "error");
    console.error("[sw-editor example] Load failed:", err);
  }
});

/**
 * Exports the current workflow as JSON and renders it in the output pre-block.
 */
btnExport.addEventListener("click", async () => {
  await runExport("json");
});

/**
 * Exports the current workflow as YAML and renders it in the output pre-block.
 */
btnExportYaml.addEventListener("click", async () => {
  await runExport("yaml");
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Runs an export in the specified format and updates the output area.
 *
 * @param format - Desired output format: `"json"` or `"yaml"`.
 */
async function runExport(format: "json" | "yaml"): Promise<void> {
  setStatus(exportStatus, `Exporting as ${format.toUpperCase()}…`, "");

  try {
    const result = await exportWorkflowSource({ format });
    outputPre.textContent = result.source.content;
    setStatus(exportStatus, `Exported as ${format.toUpperCase()}.`, "ok");
    console.log(`[sw-editor example] Exported (${format}):`, result.source.content);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setStatus(exportStatus, `Export error: ${message}`, "error");
    console.error("[sw-editor example] Export failed:", err);
  }
}

/**
 * Updates the text content and CSS class of a status paragraph.
 *
 * @param el - The status element to update.
 * @param text - New text content.
 * @param cssClass - CSS class to apply: `"ok"`, `"error"`, or `""` for neutral.
 */
function setStatus(el: HTMLParagraphElement, text: string, cssClass: "ok" | "error" | ""): void {
  el.textContent = text;
  el.className = `status${cssClass ? ` ${cssClass}` : ""}`;
}
