/**
 * End-to-end accessibility tests for insertion controls.
 *
 * Covers keyboard focusability, accessible naming, keyboard insertion timing,
 * tab-order consistency, and live-region announcements for both supported
 * renderers.
 *
 * @module
 */

import { expect, type Locator, type Page, test } from "@playwright/test";

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

/** ARIA live region used for screen-reader announcements. */
const LIVE_REGION_SELECTOR = "[aria-live]";

/**
 * Renderer configurations covered by the accessibility suite.
 */
const RENDERERS: Array<{ name: string; urlSuffix: string }> = [
  { name: "rete-lit (default)", urlSuffix: "/" },
  { name: "react-flow", urlSuffix: "/?renderer=react-flow" },
];

/**
 * Open the editor for the selected renderer.
 *
 * @param page - Playwright page.
 * @param urlSuffix - URL suffix selecting a renderer mode.
 */
async function openEditor(page: Page, urlSuffix: string): Promise<void> {
  await page.goto(urlSuffix);
  await page.waitForSelector(EDITOR_ELEMENT, { state: "attached" });
}

/**
 * Create a new workflow from the harness home state.
 *
 * @param page - Playwright page.
 */
async function createNewWorkflow(page: Page): Promise<void> {
  const createButton = page.locator(NEW_WORKFLOW_BUTTON_SELECTOR);
  await createButton.focus();
  await createButton.press("Enter");
}

/**
 * Open the insertion menu using keyboard activation from the first affordance.
 *
 * @param page - Playwright page.
 * @returns First insertion affordance and first menu item locators.
 */
async function openMenuWithKeyboard(
  page: Page,
): Promise<{ firstAffordance: Locator; firstMenuItem: Locator }> {
  const firstAffordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
  await firstAffordance.focus();
  await expect(firstAffordance).toBeFocused();
  await firstAffordance.press("Enter");
  await expect(page.locator(TASK_MENU_SELECTOR)).toBeVisible();

  const firstMenuItem = page.locator(TASK_MENU_ITEM_SELECTOR).first();
  await expect(firstMenuItem).toBeFocused();

  return { firstAffordance, firstMenuItem };
}

/**
 * Return insertion button indexes sorted by visual graph order (left-to-right).
 *
 * @param page - Playwright page.
 * @returns Button indexes ordered by x-coordinate.
 */
async function getInsertionButtonIndexesByGraphOrder(page: Page): Promise<number[]> {
  const sorted = await page.locator(INSERTION_BUTTON_SELECTOR).evaluateAll((elements) =>
    elements
      .map((element, index) => {
        const rect = element.getBoundingClientRect();
        return { index, x: rect.x };
      })
      .sort((a, b) => a.x - b.x)
      .map((entry) => entry.index),
  );

  return sorted;
}

/**
 * Get the index of the currently focused insertion button.
 *
 * @param page - Playwright page.
 * @returns Zero-based insertion button index, or -1 if focus is elsewhere.
 */
async function getFocusedInsertionButtonIndex(page: Page): Promise<number> {
  return page.evaluate((selector) => {
    const active = document.activeElement;
    if (!active) {
      return -1;
    }

    const buttons = Array.from(document.querySelectorAll(selector));
    return buttons.findIndex((button) => button === active);
  }, INSERTION_BUTTON_SELECTOR);
}

for (const renderer of RENDERERS) {
  test.describe(`Insertion controls accessibility [${renderer.name}]`, () => {
    test.beforeEach(async ({ page }) => {
      await openEditor(page, renderer.urlSuffix);
      await createNewWorkflow(page);
    });

    test("insert buttons are keyboard-focusable", async ({ page }) => {
      const insertButtons = page.locator(INSERTION_BUTTON_SELECTOR);
      const count = await insertButtons.count();
      expect(count, "Expected at least one insertion button").toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const button = insertButtons.nth(i);
        await button.focus();
        await expect(button).toBeFocused();
      }
    });

    test("insert buttons have accessible labels", async ({ page }) => {
      const insertButtons = page.locator(INSERTION_BUTTON_SELECTOR);
      const count = await insertButtons.count();
      expect(count, "Expected at least one insertion button").toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const button = insertButtons.nth(i);
        await expect(button).toHaveAttribute("aria-label", "Insert task");
        await expect(button).toHaveAccessibleName("Insert task");
      }
    });

    test("keyboard insertion completes within 500 ms (SC-006)", async ({ page }) => {
      const nodeCountBefore = await page.locator('[data-testid="graph-node"]').count();
      const { firstMenuItem } = await openMenuWithKeyboard(page);

      const startedAt = Date.now();
      await firstMenuItem.press("Enter");

      await expect(page.locator(TASK_MENU_SELECTOR)).not.toBeVisible();
      await expect
        .poll(async () => await page.locator('[data-testid="graph-node"]').count(), { timeout: 500 })
        .toBeGreaterThan(nodeCountBefore);

      const elapsed = Date.now() - startedAt;
      expect(elapsed, `Keyboard insertion focus handoff exceeded budget: ${elapsed}ms`).toBeLessThanOrEqual(
        500,
      );
    });

    test("tab order follows graph edge order", async ({ page }) => {
      // Create at least two insertion controls so keyboard traversal order can
      // be compared against the graph's visual edge order.
      const { firstMenuItem } = await openMenuWithKeyboard(page);
      await firstMenuItem.press("Enter");
      await expect(page.locator(TASK_MENU_SELECTOR)).not.toBeVisible();

      const insertButtons = page.locator(INSERTION_BUTTON_SELECTOR);
      await expect(insertButtons).toHaveCount(2);

      const graphOrder = await getInsertionButtonIndexesByGraphOrder(page);
      expect(graphOrder.length, "Expected insertion controls after insertion").toBeGreaterThanOrEqual(2);

      const firstByGraphOrder = insertButtons.nth(graphOrder[0]);
      await firstByGraphOrder.focus();
      await expect(firstByGraphOrder).toBeFocused();

      let focusedIndex = -1;
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press("Tab");
        focusedIndex = await getFocusedInsertionButtonIndex(page);
        if (focusedIndex !== -1 && focusedIndex !== graphOrder[0]) {
          break;
        }
      }

      expect(focusedIndex, "Tab navigation did not move focus to the next insertion control").toBe(
        graphOrder[1],
      );
    });

    test("screen reader announces insertion result", async ({ page }) => {
      const liveRegion = page.locator(LIVE_REGION_SELECTOR).first();
      await expect(liveRegion).toBeAttached();
      const ariaLive = await liveRegion.getAttribute("aria-live");
      expect(["polite", "assertive"]).toContain(ariaLive);

      const { firstMenuItem } = await openMenuWithKeyboard(page);
      await firstMenuItem.press("Enter");
      await expect(page.locator(TASK_MENU_SELECTOR)).not.toBeVisible();
      await expect(liveRegion).toBeAttached();
      await expect(liveRegion).toHaveAttribute("aria-live", ariaLive ?? "polite");
    });
  });
}
