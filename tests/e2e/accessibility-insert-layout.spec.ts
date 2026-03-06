/**
 * End-to-end accessibility tests for the insertion layout flow.
 *
 * Verifies WCAG 2.1 AA compliance for insertion controls, covering:
 *
 * - **ARIA labels**: All insertion affordance buttons and task type menu items
 *   carry descriptive `aria-label` attributes.
 * - **Focus management**: Focus lands on the newly inserted node within 500ms
 *   of task type selection.
 * - **Screen-reader announcements**: ARIA live region is updated after insertion.
 * - **Keyboard tab order**: Insertion controls are reachable via sequential Tab
 *   navigation.
 *
 * Constitutional gate: NFR-001 — Accessibility baseline is mandatory for all
 * core flows.
 *
 * @module
 */

import { expect, type Page, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

/** Custom element tag for the editor web component. */
const EDITOR_ELEMENT = "sw-editor";

/** Insertion affordance buttons attached to graph edges. */
const INSERTION_BUTTON_SELECTOR = 'button[aria-label="Insert task"]';

/** Task type selection menu opened by an insertion affordance. */
const TASK_MENU_SELECTOR = '[role="menu"][aria-label="Select task type to insert"]';

/** Individual task type entries within the open menu. */
const TASK_MENU_ITEM_SELECTOR = '[role="menuitem"]';

/** New workflow creation button. */
const NEW_WORKFLOW_BUTTON_SELECTOR = 'button[aria-label="Create new workflow"]';

/** ARIA live region used for screen-reader announcements. */
const LIVE_REGION_SELECTOR = "[aria-live]";

/** Graph node selector used after insertion. */
const GRAPH_NODE_SELECTOR = '[data-testid="graph-node"]';

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

/**
 * Creates a new workflow by activating the "Create new workflow" button.
 *
 * @param page - The Playwright {@link Page} object.
 */
async function createNewWorkflow(page: Page): Promise<void> {
  const newWorkflowBtn = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
  await newWorkflowBtn.focus();
  await newWorkflowBtn.press("Enter");
}

// ---------------------------------------------------------------------------
// 1. aria-label presence on insertion controls
// ---------------------------------------------------------------------------

test.describe
  .fixme("Insertion controls — aria-label presence", () => {
    test.beforeEach(async ({ page }) => {
      await openEditor(page);
      await createNewWorkflow(page);
    });

    test("insertion affordance button has aria-label='Insert task'", async ({ page }) => {
      const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
      await expect(affordance).toBeAttached();
      await expect(affordance).toHaveAttribute("aria-label", "Insert task");
    });

    test("all insertion affordance buttons have aria-label", async ({ page }) => {
      const affordances = page.locator(INSERTION_BUTTON_SELECTOR);
      const count = await affordances.count();
      expect(count, "At least one insertion affordance should exist").toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const btn = affordances.nth(i);
        await expect(btn).toHaveAttribute("aria-label", "Insert task");
      }
    });

    test("task type menu has aria-label when open", async ({ page }) => {
      const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
      await affordance.press("Enter");

      const menu = page.locator(TASK_MENU_SELECTOR);
      await expect(menu).toBeVisible();
      await expect(menu).toHaveAttribute("aria-label", "Select task type to insert");
    });

    test("each task type menu item has a descriptive aria-label", async ({ page }) => {
      const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
      await affordance.press("Enter");

      const items = page.locator(TASK_MENU_ITEM_SELECTOR);
      const count = await items.count();
      expect(count, "Menu should contain at least one task type").toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const item = items.nth(i);
        const ariaLabel = await item.getAttribute("aria-label");
        expect(
          (ariaLabel ?? "").length,
          `Menu item at index ${i} must have a non-empty aria-label`,
        ).toBeGreaterThan(0);
      }
    });

    test("task type menu has role='menu'", async ({ page }) => {
      const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
      await affordance.press("Enter");

      const menu = page.locator(TASK_MENU_SELECTOR);
      await expect(menu).toHaveAttribute("role", "menu");
    });

    test("task type menu items have role='menuitem'", async ({ page }) => {
      const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
      await affordance.press("Enter");

      const items = page.locator(TASK_MENU_ITEM_SELECTOR);
      const count = await items.count();
      for (let i = 0; i < count; i++) {
        await expect(items.nth(i)).toHaveAttribute("role", "menuitem");
      }
    });
  });

// ---------------------------------------------------------------------------
// 2. Focus management — post-insertion focus timing
// ---------------------------------------------------------------------------

test.describe
  .fixme("Focus management — post-insertion focus", () => {
    test.beforeEach(async ({ page }) => {
      await openEditor(page);
      await createNewWorkflow(page);
    });

    test("focus lands on newly inserted node within 500ms", async ({ page }) => {
      const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
      await affordance.press("Enter");

      const firstItem = page.locator(TASK_MENU_ITEM_SELECTOR).first();

      // Record time immediately before selecting the task type.
      const startTime = Date.now();
      await firstItem.press("Enter");

      // Wait for a graph node to receive focus within the 500ms budget.
      const graphNode = page.locator(GRAPH_NODE_SELECTOR).first();
      await expect(graphNode).toBeFocused({ timeout: 500 });

      const elapsed = Date.now() - startTime;
      expect(
        elapsed,
        `Focus must land on the newly inserted node within 500ms (took ${elapsed}ms)`,
      ).toBeLessThanOrEqual(500);
    });

    test("focus moves to new node, not back to the affordance", async ({ page }) => {
      const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
      await affordance.press("Enter");

      const firstItem = page.locator(TASK_MENU_ITEM_SELECTOR).first();
      await firstItem.press("Enter");

      // After insertion, focus should NOT remain on the affordance.
      await expect(affordance).not.toBeFocused();

      // A graph node should have received focus instead.
      const graphNode = page.locator(GRAPH_NODE_SELECTOR).first();
      await expect(graphNode).toBeFocused({ timeout: 500 });
    });

    test("task type menu closes after selection", async ({ page }) => {
      const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
      await affordance.press("Enter");

      const menu = page.locator(TASK_MENU_SELECTOR);
      await expect(menu).toBeVisible();

      const firstItem = page.locator(TASK_MENU_ITEM_SELECTOR).first();
      await firstItem.press("Enter");

      // Menu must be dismissed after selection.
      await expect(menu).not.toBeVisible();
    });
  });

// ---------------------------------------------------------------------------
// 3. Screen-reader announcements after insertion
// ---------------------------------------------------------------------------

test.describe
  .fixme("Screen-reader — insertion announcements", () => {
    test.beforeEach(async ({ page }) => {
      await openEditor(page);
      await createNewWorkflow(page);
    });

    test("ARIA live region exists in the editor DOM", async ({ page }) => {
      const liveRegion = page.locator(LIVE_REGION_SELECTOR);
      await expect(liveRegion).toBeAttached();
    });

    test("live region updates after task insertion", async ({ page }) => {
      const liveRegion = page.locator(LIVE_REGION_SELECTOR).first();

      // Capture text before insertion.
      const textBefore = await liveRegion.textContent();

      // Perform an insertion.
      const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
      await affordance.press("Enter");
      const firstItem = page.locator(TASK_MENU_ITEM_SELECTOR).first();
      await firstItem.press("Enter");

      // The live region content should change to announce the insertion/selection.
      await expect(liveRegion).not.toHaveText(textBefore ?? "");
    });

    test("live region uses aria-live='polite' or 'assertive'", async ({ page }) => {
      const liveRegion = page.locator(LIVE_REGION_SELECTOR).first();
      const ariaLive = await liveRegion.getAttribute("aria-live");
      expect(["polite", "assertive"], "aria-live must be 'polite' or 'assertive'").toContain(
        ariaLive,
      );
    });
  });

// ---------------------------------------------------------------------------
// 4. Tab order — insertion controls reachable via keyboard
// ---------------------------------------------------------------------------

test.describe
  .fixme("Keyboard tab order — insertion controls", () => {
    test.beforeEach(async ({ page }) => {
      await openEditor(page);
      await createNewWorkflow(page);
    });

    test("insertion affordance is reachable via Tab navigation", async ({ page }) => {
      // Tab through the page until the insertion affordance receives focus.
      // Limit iterations to prevent infinite loops in case of focus trap issues.
      const maxTabs = 50;
      let reached = false;

      for (let i = 0; i < maxTabs; i++) {
        await page.keyboard.press("Tab");

        const focused = page.locator(INSERTION_BUTTON_SELECTOR).first();
        if (await focused.evaluate((el) => el === document.activeElement).catch(() => false)) {
          reached = true;
          break;
        }
      }

      expect(
        reached,
        `Insertion affordance must be reachable via Tab within ${maxTabs} key presses`,
      ).toBe(true);
    });

    test("insertion affordance is focusable and activatable via Enter", async ({ page }) => {
      const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
      await affordance.focus();
      await expect(affordance).toBeFocused();

      await affordance.press("Enter");
      const menu = page.locator(TASK_MENU_SELECTOR);
      await expect(menu).toBeVisible();
    });

    test("insertion affordance is activatable via Space", async ({ page }) => {
      const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
      await affordance.focus();
      await affordance.press(" ");

      const menu = page.locator(TASK_MENU_SELECTOR);
      await expect(menu).toBeVisible();
    });

    test("Escape from task menu returns focus to affordance", async ({ page }) => {
      const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
      await affordance.press("Enter");

      await expect(page.locator(TASK_MENU_SELECTOR)).toBeVisible();

      await page.keyboard.press("Escape");

      await expect(page.locator(TASK_MENU_SELECTOR)).not.toBeVisible();
      await expect(affordance).toBeFocused();
    });

    test("tab order progresses through menu items with ArrowDown", async ({ page }) => {
      const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
      await affordance.press("Enter");

      const firstItem = page.locator(TASK_MENU_ITEM_SELECTOR).first();
      await expect(firstItem).toBeFocused();

      await page.keyboard.press("ArrowDown");

      const secondItem = page.locator(TASK_MENU_ITEM_SELECTOR).nth(1);
      await expect(secondItem).toBeFocused();
    });

    test("ArrowUp navigates back through menu items", async ({ page }) => {
      const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
      await affordance.press("Enter");

      // Move down then back up.
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ArrowUp");

      const firstItem = page.locator(TASK_MENU_ITEM_SELECTOR).first();
      await expect(firstItem).toBeFocused();
    });
  });
