/**
 * Smoke test for the React Flow renderer backend.
 *
 * Navigates to `/?renderer=react-flow`, verifies the harness loads without
 * uncaught JavaScript errors, inserts a task, and asserts that a
 * `[data-testid="graph-node"]` marker is visible in the DOM.
 *
 * @module
 */

import { expect, type Page, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Navigates to the editor host page with the react-flow renderer selected and
 * waits for the `sw-editor` custom element to mount.
 *
 * @param page - The Playwright {@link Page} object.
 */
async function openEditorWithReactFlow(page: Page): Promise<void> {
  await page.goto("/?renderer=react-flow");
  await page.waitForSelector("sw-editor", { state: "attached" });
}

/**
 * Inserts the first task type available in the insertion menu by clicking the
 * first affordance button and selecting the first menu item.
 *
 * @param page - The Playwright {@link Page} object.
 */
async function insertFirstTask(page: Page): Promise<void> {
  const affordance = page.locator('button[aria-label="Insert task"]').first();
  await affordance.click();

  const menu = page.locator('[role="menu"][aria-label="Select task type to insert"]');
  await expect(menu).toBeVisible();

  const firstItem = menu.locator('[role="menuitem"]').first();
  await firstItem.click();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("React Flow renderer smoke test", () => {
  /**
   * Verifies that navigating to `/?renderer=react-flow` attaches the
   * `sw-editor` custom element and produces no uncaught JavaScript errors.
   */
  test("loads without uncaught JavaScript errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => {
      errors.push(err.message);
    });

    await openEditorWithReactFlow(page);

    expect(
      errors,
      `Unexpected uncaught JS errors on load: ${errors.join("; ")}`,
    ).toHaveLength(0);

    await expect(page.locator("sw-editor")).toBeAttached();
  });

  /**
   * Verifies that inserting a task via the affordance UI causes a
   * `[data-testid="graph-node"]` marker to become visible, confirming that
   * the React Flow renderer backend processes the graph update correctly.
   */
  test("graph node is visible after task insert", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => {
      errors.push(err.message);
    });

    await openEditorWithReactFlow(page);
    await insertFirstTask(page);

    await expect(page.locator('[data-testid="graph-node"]').first()).toBeVisible();

    expect(
      errors,
      `Unexpected uncaught JS errors after task insert: ${errors.join("; ")}`,
    ).toHaveLength(0);
  });
});
