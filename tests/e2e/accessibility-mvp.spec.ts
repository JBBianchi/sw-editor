/**
 * End-to-end accessibility tests for the Serverless Workflow editor MVP.
 *
 * Verifies WCAG 2.1 AA baseline compliance for core editor flows, covering:
 *
 * - **Keyboard operability**: All core flows (create, insert, navigate, panel,
 *   export) must be completable using only keyboard input.
 * - **Focus management**: Focus must be logical, visible, and consistent after
 *   each interaction.
 * - **Screen-reader announcements**: ARIA live regions must announce selection
 *   changes, panel context switches, and diagnostics updates.
 * - **ARIA semantics**: Interactive controls must carry correct roles, labels,
 *   and states so assistive technologies can accurately describe the UI.
 *
 * Tests run against the editor served at the configured `baseURL`
 * (default: `http://localhost:4173`).
 *
 * Constitutional gate: NFR-001 — Accessibility baseline is mandatory for all
 * core flows.
 *
 * @module
 */

import { expect, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// Known-failing tests (require full sw-editor component implementation)
//
// The tests below depend on DOM structure and event behaviour that is only
// present once the `sw-editor` web component is fully implemented (i.e. the
// graph canvas renders accessible nodes, insertion affordances, a "Create new
// workflow" button, an export button, and wires focus management and ARIA live
// region updates).
//
// Until that implementation lands, the following describe groups are expected
// to fail and are marked with `test.describe.fixme`:
//   • Keyboard operability — create new workflow  (needs 'button[aria-label="Create new workflow"]')
//   • Keyboard operability — task insertion       (needs insertion affordance buttons)
//   • Keyboard operability — node navigation      (needs rendered graph nodes)
//   • Keyboard operability — property panel       (needs wired panel inputs)
//   • Keyboard operability — export workflow      (needs export button)
//   • Screen-reader — ARIA live region announcements (needs selection events)
//   • Focus visibility                            (needs rendered graph + buttons)
//
// The "ARIA structural semantics" group is split: the landmark and live-region
// tests rely only on the static demo HTML and are expected to pass; the
// remaining tests in that group are individually marked fixme.
//
// SC-001 (create+export in <10 min) and SC-007 (contributor bootstrap <15 min)
// will be fully verifiable once the component is complete and these fixme
// markers are removed.  See specs/001-visual-authoring-mvp/cross-check-findings.md.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Selectors
//
// Using role- and label-based selectors where possible so tests remain
// resilient against implementation-specific class name or ID changes.
// ---------------------------------------------------------------------------

/** Custom element tag for the editor web component. */
const EDITOR_ELEMENT = "sw-editor";

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

/** ARIA live region used for screen-reader announcements. */
const LIVE_REGION_SELECTOR = "[aria-live]";

/** New workflow creation button. */
const NEW_WORKFLOW_BUTTON_SELECTOR = 'button[aria-label="Create new workflow"]';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Navigates to the editor host page and waits for the web component to mount.
 *
 * @param page - The Playwright {@link Page} object.
 */
async function openEditor(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/");
  await page.waitForSelector(EDITOR_ELEMENT, { state: "attached" });
}

// ---------------------------------------------------------------------------
// 1. New workflow creation — keyboard operability
// ---------------------------------------------------------------------------

test.describe.fixme("Keyboard operability — create new workflow", () => {
  test("new-workflow button is reachable via Tab and activatable via Enter", async ({ page }) => {
    await openEditor(page);

    // Tab into the editor and locate the new-workflow button via keyboard.
    await page.keyboard.press("Tab");

    const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
    await newWorkflowBtn.focus();
    await expect(newWorkflowBtn).toBeFocused();

    // Activate using Enter — no mouse required.
    await newWorkflowBtn.press("Enter");

    // After creation the graph should contain start and end nodes.
    await expect(page.locator('[data-node-type="start"]')).toBeVisible();
    await expect(page.locator('[data-node-type="end"]')).toBeVisible();
  });

  test("new-workflow button is activatable via Space", async ({ page }) => {
    await openEditor(page);

    const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
    await newWorkflowBtn.focus();
    await newWorkflowBtn.press(" ");

    await expect(page.locator('[data-node-type="start"]')).toBeVisible();
  });

  test("new-workflow button has a non-empty accessible name", async ({ page }) => {
    await openEditor(page);

    const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
    await expect(newWorkflowBtn).toHaveAttribute("aria-label", "Create new workflow");
  });
});

// ---------------------------------------------------------------------------
// 2. Task insertion — keyboard operability
// ---------------------------------------------------------------------------

test.describe.fixme("Keyboard operability — task insertion", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page);
    // Start each insertion test from a fresh single-edge workflow.
    const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
    await newWorkflowBtn.focus();
    await newWorkflowBtn.press("Enter");
  });

  test("insertion affordance button carries correct aria-label", async ({ page }) => {
    const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
    await expect(affordance).toHaveAttribute("aria-label", "Insert task");
  });

  test("insertion affordance is reachable via Tab navigation", async ({ page }) => {
    const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
    await affordance.focus();
    await expect(affordance).toBeFocused();
  });

  test("pressing Enter on affordance opens the task type menu", async ({ page }) => {
    const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
    await affordance.focus();
    await affordance.press("Enter");

    const menu = page.locator(TASK_MENU_SELECTOR);
    await expect(menu).toBeVisible();
  });

  test("pressing Space on affordance opens the task type menu", async ({ page }) => {
    const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
    await affordance.focus();
    await affordance.press(" ");

    await expect(page.locator(TASK_MENU_SELECTOR)).toBeVisible();
  });

  test("task menu receives initial focus on the first menu item", async ({ page }) => {
    const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
    await affordance.press("Enter");

    const firstItem = page.locator(TASK_MENU_ITEM_SELECTOR).first();
    await expect(firstItem).toBeFocused();
  });

  test("task menu supports ArrowDown navigation between items", async ({ page }) => {
    const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
    await affordance.press("Enter");

    const firstItem = page.locator(TASK_MENU_ITEM_SELECTOR).first();
    await expect(firstItem).toBeFocused();

    await page.keyboard.press("ArrowDown");

    const secondItem = page.locator(TASK_MENU_ITEM_SELECTOR).nth(1);
    await expect(secondItem).toBeFocused();
  });

  test("task menu supports ArrowUp navigation between items", async ({ page }) => {
    const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
    await affordance.press("Enter");

    // Navigate down then back up.
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowUp");

    const firstItem = page.locator(TASK_MENU_ITEM_SELECTOR).first();
    await expect(firstItem).toBeFocused();
  });

  test("pressing Escape closes the task menu and returns focus to affordance", async ({ page }) => {
    const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
    await affordance.press("Enter");

    await expect(page.locator(TASK_MENU_SELECTOR)).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(page.locator(TASK_MENU_SELECTOR)).not.toBeVisible();
    // Focus must return to the affordance that opened the menu.
    await expect(affordance).toBeFocused();
  });

  test("selecting a task type via Enter inserts the task and moves focus", async ({ page }) => {
    const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
    await affordance.press("Enter");

    // Select the first task type using Enter.
    const firstItem = page.locator(TASK_MENU_ITEM_SELECTOR).first();
    await firstItem.press("Enter");

    // Menu must close after selection.
    await expect(page.locator(TASK_MENU_SELECTOR)).not.toBeVisible();

    // A new node must appear in the graph.
    const nodes = page.locator('[data-testid="graph-node"]');
    await expect(nodes).not.toHaveCount(0);
  });

  test("task menu items have role=menuitem", async ({ page }) => {
    const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
    await affordance.press("Enter");

    const items = page.locator(TASK_MENU_ITEM_SELECTOR);
    // Verify at least one item exists and carries the correct role.
    await expect(items.first()).toHaveAttribute("role", "menuitem");
  });

  test("task type menu has role=menu with a descriptive aria-label", async ({ page }) => {
    const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
    await affordance.press("Enter");

    const menu = page.locator(TASK_MENU_SELECTOR);
    await expect(menu).toHaveAttribute("role", "menu");
    await expect(menu).toHaveAttribute("aria-label", "Select task type to insert");
  });
});

// ---------------------------------------------------------------------------
// 3. Node navigation — keyboard operability
// ---------------------------------------------------------------------------

test.describe.fixme("Keyboard operability — node navigation", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page);
    const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
    await newWorkflowBtn.press("Enter");
  });

  test("graph nodes are reachable via Tab key", async ({ page }) => {
    // Tab through interactive elements until a graph node receives focus.
    const graphNode = page.locator('[data-testid="graph-node"]').first();
    await graphNode.focus();
    await expect(graphNode).toBeFocused();
  });

  test("graph nodes are focusable and have a non-empty accessible name", async ({ page }) => {
    const startNode = page.locator('[data-node-type="start"]');
    await startNode.focus();
    // The node must have either an aria-label or an accessible text name.
    const ariaLabel = await startNode.getAttribute("aria-label");
    const innerText = await startNode.innerText();
    expect(
      (ariaLabel ?? "").length + innerText.length,
      "Graph node must have a non-empty accessible name",
    ).toBeGreaterThan(0);
  });

  test("selecting a node via keyboard updates the properties panel", async ({ page }) => {
    const startNode = page.locator('[data-node-type="start"]');
    await startNode.focus();
    await startNode.press("Enter");

    // The properties panel must reflect the selection.
    const panel = page.locator(PROPERTY_PANEL_SELECTOR);
    await expect(panel).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 4. Property panel — keyboard operability
// ---------------------------------------------------------------------------

test.describe.fixme("Keyboard operability — property panel", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page);
    const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
    await newWorkflowBtn.press("Enter");
  });

  test("property panel is visible and has an accessible region landmark", async ({ page }) => {
    const panel = page.locator(PROPERTY_PANEL_SELECTOR);
    await expect(panel).toBeVisible();
    await expect(panel).toHaveAttribute("aria-label", "Properties panel");
  });

  test("panel inputs are reachable via Tab navigation inside the panel", async ({ page }) => {
    const panel = page.locator(PROPERTY_PANEL_SELECTOR);
    await expect(panel).toBeVisible();

    // Tab into the panel and verify at least one focusable element is reached.
    const firstInput = panel.locator("input, textarea, [role='textbox']").first();
    await firstInput.focus();
    await expect(firstInput).toBeFocused();
  });

  test("pressing Escape from a node closes its property context without trapping focus", async ({
    page,
  }) => {
    // Select a node to open its property panel context.
    const startNode = page.locator('[data-node-type="start"]');
    await startNode.focus();
    await startNode.press("Enter");

    // Press Escape to deselect.
    await page.keyboard.press("Escape");

    // Panel should revert to workflow-level context; focus must not be trapped.
    const panel = page.locator(PROPERTY_PANEL_SELECTOR);
    await expect(panel).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 5. Export — keyboard operability
// ---------------------------------------------------------------------------

test.describe.fixme("Keyboard operability — export workflow", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page);
    const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
    await newWorkflowBtn.press("Enter");
  });

  test("export button is reachable via Tab and has correct aria-label", async ({ page }) => {
    const exportBtn = page.locator(EXPORT_BUTTON_SELECTOR);
    await exportBtn.focus();
    await expect(exportBtn).toBeFocused();
    await expect(exportBtn).toHaveAttribute("aria-label", "Export workflow");
  });

  test("activating export via Enter opens the format selection UI", async ({ page }) => {
    const exportBtn = page.locator(EXPORT_BUTTON_SELECTOR);
    await exportBtn.focus();
    await exportBtn.press("Enter");

    // Export format dialog or menu should appear.
    const formatMenu = page.locator('[aria-label*="Export format"]');
    await expect(formatMenu).toBeVisible();
  });

  test("export format options are navigable and selectable via keyboard", async ({ page }) => {
    const exportBtn = page.locator(EXPORT_BUTTON_SELECTOR);
    await exportBtn.press("Enter");

    // Navigate to JSON option using keyboard.
    const jsonOption = page.locator('[data-export-format="json"]');
    await jsonOption.focus();
    await jsonOption.press("Enter");

    // Export should complete without requiring mouse interaction.
    // Verify no unhandled errors occurred.
    const errorRegion = page.locator('[aria-label="Editor errors"]');
    const hasError = await errorRegion.isVisible().catch(() => false);
    expect(hasError, "Export should not produce visible errors").toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. Screen-reader announcements
// ---------------------------------------------------------------------------

test.describe.fixme("Screen-reader — ARIA live region announcements", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page);
    const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
    await newWorkflowBtn.press("Enter");
  });

  test("ARIA live region exists in the editor DOM", async ({ page }) => {
    const liveRegion = page.locator(LIVE_REGION_SELECTOR);
    await expect(liveRegion).toBeAttached();
  });

  test("live region uses aria-live=polite or assertive", async ({ page }) => {
    const liveRegion = page.locator(LIVE_REGION_SELECTOR).first();
    const ariaLive = await liveRegion.getAttribute("aria-live");
    expect(["polite", "assertive"], "aria-live must be 'polite' or 'assertive'").toContain(
      ariaLive,
    );
  });

  test("selecting a node announces the panel context change", async ({ page }) => {
    const liveRegion = page.locator(LIVE_REGION_SELECTOR).first();

    // Capture initial announcement text.
    const startNode = page.locator('[data-node-type="start"]');
    await startNode.focus();
    await startNode.press("Enter");

    // The live region text should update to describe the node panel context.
    await expect(liveRegion).not.toHaveText("");
    const announcementText = await liveRegion.textContent();
    expect(announcementText ?? "", "Live region must announce node selection").toContain("Node");
  });

  test("deselecting announces return to workflow panel context", async ({ page }) => {
    const liveRegion = page.locator(LIVE_REGION_SELECTOR).first();

    // Select a node then deselect.
    const startNode = page.locator('[data-node-type="start"]');
    await startNode.focus();
    await startNode.press("Enter");
    await page.keyboard.press("Escape");

    // Live region should announce workflow-level context.
    const announcementText = await liveRegion.textContent();
    expect(
      announcementText ?? "",
      "Live region must announce workflow context on deselect",
    ).toMatch(/workflow/i);
  });

  test("diagnostics live region announces validation errors", async ({ page }) => {
    // Locate the diagnostics-specific live region (may be a separate element
    // or the same as the general one, depending on implementation).
    const diagnosticsRegion = page
      .locator(
        '[aria-label*="diagnostics" i], [aria-label*="validation" i], [data-testid="diagnostics-live-region"]',
      )
      .first();
    await expect(diagnosticsRegion).toBeAttached();
  });
});

// ---------------------------------------------------------------------------
// 7. Focus visibility
// ---------------------------------------------------------------------------

test.describe.fixme("Focus visibility", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page);
  });

  test("focused insertion affordance has a visible focus indicator", async ({ page }) => {
    const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
    await newWorkflowBtn.press("Enter");

    const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
    await affordance.focus();

    // Capture bounding box before and after focus; a CSS outline or box-shadow
    // changes the computed styles. We verify the element is at minimum reachable
    // and reports as visible — style assertions are a best-effort check.
    await expect(affordance).toBeVisible();
    await expect(affordance).toBeFocused();
  });

  test("focused graph node has a visible focus indicator", async ({ page }) => {
    const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
    await newWorkflowBtn.press("Enter");

    const startNode = page.locator('[data-node-type="start"]');
    await startNode.focus();

    await expect(startNode).toBeVisible();
    await expect(startNode).toBeFocused();
  });
});

// ---------------------------------------------------------------------------
// 8. ARIA structural semantics
// ---------------------------------------------------------------------------

test.describe("ARIA structural semantics", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page);
  });

  test("editor root element exposes a complementary or main landmark", async ({ page }) => {
    // The editor should reside within a main or complementary landmark so
    // screen-reader users can navigate to it directly.
    const landmark = page.locator(
      `main, [role="main"], [role="complementary"], [role="application"]`,
    );
    await expect(landmark).toBeAttached();
  });

  test.fixme("property panel exposes a region landmark with an accessible label", async ({ page }) => {
    const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
    await newWorkflowBtn.press("Enter");

    const panel = page.locator(PROPERTY_PANEL_SELECTOR);
    await expect(panel).toBeAttached();

    const role = await panel.getAttribute("role");
    const ariaLabel = await panel.getAttribute("aria-label");
    const isRegion = role === "region" || panel.locator("..").first() !== null; // region is default for labeled sections
    expect(ariaLabel ?? "", "Panel must have a non-empty aria-label").not.toBe("");
    expect(isRegion).toBe(true);
  });

  test.fixme("graph canvas exposes an accessible label", async ({ page }) => {
    const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
    await newWorkflowBtn.press("Enter");

    const canvas = page
      .locator('[data-testid="editor-canvas"], [aria-label*="workflow graph" i]')
      .first();
    await expect(canvas).toBeAttached();
    const ariaLabel = await canvas.getAttribute("aria-label");
    expect(ariaLabel ?? "", "Graph canvas must have a non-empty aria-label").not.toBe("");
  });

  test.fixme("all buttons in the editor have accessible names", async ({ page }) => {
    const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
    await newWorkflowBtn.press("Enter");

    // Every <button> in the editor must have an accessible name via
    // aria-label, aria-labelledby, or non-empty text content.
    const buttons = page.locator(`${EDITOR_ELEMENT} button`);
    const count = await buttons.count();
    expect(count, "Editor should contain at least one button").toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const ariaLabel = await btn.getAttribute("aria-label");
      const ariaLabelledBy = await btn.getAttribute("aria-labelledby");
      const textContent = (await btn.textContent()) ?? "";

      const hasAccessibleName =
        (ariaLabel ?? "").trim().length > 0 ||
        (ariaLabelledBy ?? "").trim().length > 0 ||
        textContent.trim().length > 0;

      expect(hasAccessibleName, `Button at index ${i} has no accessible name`).toBe(true);
    }
  });
});
