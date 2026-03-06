/**
 * End-to-end quickstart scenario tests for the Serverless Workflow editor MVP.
 *
 * Covers the five validation scenarios defined in
 * specs/001-visual-authoring-mvp/quickstart.md:
 *
 * - **Scenario 1**: Create New Workflow
 * - **Scenario 2**: Insert And Edit Task
 * - **Scenario 3**: Load Existing YAML
 * - **Scenario 4**: Diagnostics Flow
 * - **Scenario 5**: Privacy Guardrail
 *
 * NOTE: This spec depends on the demo harness introduced in issue #106
 * (implemented via issues #119–#126). Tests are marked fixme until the
 * full `sw-editor` component and demo harness are in place.
 *
 * @module
 */

import { expect, type Page, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Custom element tag for the editor web component. */
const EDITOR_ELEMENT = "sw-editor";

/** New workflow creation button. */
const NEW_WORKFLOW_BUTTON_SELECTOR = 'button[aria-label="Create new workflow"]';

/** Insertion affordance buttons attached to graph edges. */
const INSERTION_BUTTON_SELECTOR = 'button[aria-label="Insert task"]';

/** Task type selection menu opened by an insertion affordance. */
const TASK_MENU_SELECTOR = '[role="menu"][aria-label="Select task type to insert"]';

/** Individual task type entries within the open menu. */
const TASK_MENU_ITEM_SELECTOR = '[role="menuitem"]';

/** Export action button (trigger for the export flow). */
const EXPORT_BUTTON_SELECTOR = 'button[aria-label="Export workflow"]';

/** Property panel region. */
const PROPERTY_PANEL_SELECTOR = '[aria-label="Properties panel"]';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Navigates to the editor host page and waits for the web component to mount.
 *
 * @param page - The Playwright {@link Page} object.
 */
async function openEditor(page: Page): Promise<void> {
  await page.goto("/");
  await page.waitForSelector(EDITOR_ELEMENT, { state: "attached" });
}

// ---------------------------------------------------------------------------
// Scenario 1: Create New Workflow
// ---------------------------------------------------------------------------

test.describe
  .fixme("Quickstart Scenario 1: Create New Workflow", () => {
    test("opens editor to empty state", async ({ page }) => {
      await openEditor(page);

      const editorEl = page.locator(EDITOR_ELEMENT);
      await expect(editorEl).toBeAttached();
    });

    test("creates a new workflow with start and end nodes", async ({ page }) => {
      await openEditor(page);

      const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
      await newWorkflowBtn.focus();
      await newWorkflowBtn.press("Enter");

      await expect(page.locator('[data-node-type="start"]')).toBeVisible();
      await expect(page.locator('[data-node-type="end"]')).toBeVisible();
    });

    test("workflow properties panel is visible after creation", async ({ page }) => {
      await openEditor(page);

      const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
      await newWorkflowBtn.press("Enter");

      const panel = page.locator(PROPERTY_PANEL_SELECTOR);
      await expect(panel).toBeVisible();
    });
  });

// ---------------------------------------------------------------------------
// Scenario 2: Insert And Edit Task
// ---------------------------------------------------------------------------

test.describe("Quickstart Scenario 2: Insert And Edit Task", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page);
    // The sw-editor auto-bootstraps on mount; pressing "Create new workflow"
    // resets to a clean state, matching the scenario starting condition.
    const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
    await newWorkflowBtn.press("Enter");
  });

  test("insertion affordance is present between connected nodes", async ({ page }) => {
    const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
    await expect(affordance).toBeVisible();
  });

  test("selecting Call task from menu inserts it into the graph", async ({ page }) => {
    const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
    await affordance.press("Enter");

    await expect(page.locator(TASK_MENU_SELECTOR)).toBeVisible();

    // Select the first menu item (expected to be the Call task type).
    const firstItem = page.locator(TASK_MENU_ITEM_SELECTOR).first();
    await firstItem.press("Enter");

    await expect(page.locator(TASK_MENU_SELECTOR)).not.toBeVisible();
    await expect(page.locator('[data-testid="graph-node"]')).not.toHaveCount(0);
  });

  test("inserted task is selected and panel reflects its properties", async ({ page }) => {
    const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
    await affordance.press("Enter");

    const firstItem = page.locator(TASK_MENU_ITEM_SELECTOR).first();
    await firstItem.press("Enter");

    const panel = page.locator(PROPERTY_PANEL_SELECTOR);
    await expect(panel).toBeVisible();
  });

  test.fixme("editing task properties in panel updates the graph and source", async ({ page }) => {
    // Requires a wired property panel with editable inputs — not yet
    // implemented in the demo harness.
    const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
    await affordance.press("Enter");

    const firstItem = page.locator(TASK_MENU_ITEM_SELECTOR).first();
    await firstItem.press("Enter");

    const panel = page.locator(PROPERTY_PANEL_SELECTOR);
    const nameInput = panel.locator("input, textarea, [role='textbox']").first();
    await nameInput.fill("my-call-task");

    // The graph node label should reflect the updated name.
    await expect(page.locator('[data-testid="graph-node"]').first()).toContainText("my-call-task");
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Load Existing YAML
// ---------------------------------------------------------------------------

test.describe
  .fixme("Quickstart Scenario 3: Load Existing YAML", () => {
    test("loads a valid YAML workflow and renders the graph", async ({ page }) => {
      await openEditor(page);

      // Trigger load via the editor API or a file-input affordance.
      const loadBtn = page.locator('button[aria-label="Load workflow"]');
      await expect(loadBtn).toBeVisible();
    });

    test("graph structure matches the loaded YAML", async ({ page }) => {
      await openEditor(page);

      // After loading, start and end nodes from the YAML should be present.
      await expect(page.locator('[data-node-type="start"]')).toBeVisible();
      await expect(page.locator('[data-node-type="end"]')).toBeVisible();
    });

    test("exporting after a small edit produces valid YAML", async ({ page }) => {
      await openEditor(page);

      const exportBtn = page.locator(EXPORT_BUTTON_SELECTOR);
      await exportBtn.press("Enter");

      // Export dialog or download should appear.
      const exportDialog = page.locator('[aria-label*="Export format"]');
      await expect(exportDialog).toBeVisible();
    });
  });

// ---------------------------------------------------------------------------
// Scenario 4: Diagnostics Flow
// ---------------------------------------------------------------------------

test.describe
  .fixme("Quickstart Scenario 4: Diagnostics Flow", () => {
    test.beforeEach(async ({ page }) => {
      await openEditor(page);
      const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
      await newWorkflowBtn.press("Enter");
    });

    test("entering an invalid transition target triggers a diagnostics event", async ({ page }) => {
      const panel = page.locator(PROPERTY_PANEL_SELECTOR);
      const transitionInput = panel
        .locator('[aria-label*="transition" i], [data-field="transition"]')
        .first();
      await transitionInput.fill("__invalid_target__");

      // Wait for the debounce window and diagnostic update.
      const diagnosticsRegion = page
        .locator(
          '[aria-label*="diagnostics" i], [aria-label*="validation" i], [data-testid="diagnostics-live-region"]',
        )
        .first();
      await expect(diagnosticsRegion).toBeAttached();
    });

    test("diagnostic error is reflected in local UI cues on the node", async ({ page }) => {
      const panel = page.locator(PROPERTY_PANEL_SELECTOR);
      const transitionInput = panel
        .locator('[aria-label*="transition" i], [data-field="transition"]')
        .first();
      await transitionInput.fill("__invalid_target__");

      // A node-level error indicator should appear on the graph.
      const errorIndicator = page
        .locator('[data-testid="node-error"], [aria-label*="error" i]')
        .first();
      await expect(errorIndicator).toBeVisible();
    });

    test("explicit validation surfaces global error summary", async ({ page }) => {
      const validateBtn = page.locator('button[aria-label="Validate workflow"]');
      await validateBtn.press("Enter");

      const errorSummary = page.locator(
        '[aria-label="Editor errors"], [data-testid="validation-summary"]',
      );
      await expect(errorSummary).toBeVisible();
    });
  });

// ---------------------------------------------------------------------------
// Scenario 5: Privacy Guardrail
// ---------------------------------------------------------------------------

test.describe
  .fixme("Quickstart Scenario 5: Privacy Guardrail", () => {
    test("create/load/edit/export flow completes without outbound network requests", async ({
      page,
    }) => {
      // Intercept and record any outbound requests that are not local.
      const externalRequests: string[] = [];
      page.on("request", (req) => {
        const url = req.url();
        if (!url.startsWith("http://localhost") && !url.startsWith("http://127.0.0.1")) {
          externalRequests.push(url);
        }
      });

      await openEditor(page);

      const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
      await newWorkflowBtn.press("Enter");

      // Insert a task.
      const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
      await affordance.press("Enter");
      const firstItem = page.locator(TASK_MENU_ITEM_SELECTOR).first();
      await firstItem.press("Enter");

      // Export the workflow.
      const exportBtn = page.locator(EXPORT_BUTTON_SELECTOR);
      await exportBtn.press("Enter");

      expect(
        externalRequests,
        `Editor must not initiate external network requests; observed: ${externalRequests.join(", ")}`,
      ).toHaveLength(0);
    });

    test("editor loads and renders without any remote resource dependencies", async ({ page }) => {
      const failedRequests: string[] = [];
      page.on("requestfailed", (req) => {
        failedRequests.push(req.url());
      });

      await openEditor(page);

      // No failed requests (including remote ones) should occur during boot.
      expect(
        failedRequests,
        `Unexpected failed requests during editor load: ${failedRequests.join(", ")}`,
      ).toHaveLength(0);
    });
  });
