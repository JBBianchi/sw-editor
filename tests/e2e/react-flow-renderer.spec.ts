/**
 * Smoke test for the React Flow renderer backend.
 *
 * Navigates to `/?renderer=react-flow`, verifies the harness loads without
 * uncaught JavaScript errors or known runtime warnings, inserts a task, and
 * asserts that a `[data-testid="graph-node"]` marker is visible in the DOM.
 *
 * The test also guards against the three warning categories that were fixed
 * in the preceding tasks:
 * - Lit dev-mode warning (fired when the rete-lit adapter is eagerly imported)
 * - React Flow "styles not loaded" warning (fixed by importing the stylesheet)
 * - React Flow "Node type X not found" warnings (fixed by registering custom
 *   node components for `start`, `end`, and `task`)
 *
 * @module
 */

import { expect, type Page, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// Known warning patterns to assert absent
// ---------------------------------------------------------------------------

/**
 * Substring patterns for console warnings that must NOT appear when the React
 * Flow renderer is active.  Each entry describes the warning source so that
 * assertion failure messages are informative.
 */
const FORBIDDEN_WARNING_PATTERNS: Array<{ label: string; substring: string }> = [
  {
    label: "Lit dev-mode warning",
    substring: "Lit is in dev mode",
  },
  {
    label: "React Flow styles-not-loaded warning",
    substring: "It looks like you haven't loaded the styles",
  },
  {
    label: "React Flow 'Node type not found' warning for start",
    substring: 'Node type "start" not found',
  },
  {
    label: "React Flow 'Node type not found' warning for end",
    substring: 'Node type "end" not found',
  },
  {
    label: "React Flow 'Node type not found' warning for task",
    substring: 'Node type "task" not found',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Navigates to the editor host page with the react-flow renderer selected,
 * waits for the `sw-editor` custom element to mount, and returns a list of
 * console warning messages collected during navigation.
 *
 * @param page - The Playwright {@link Page} object.
 * @returns An object containing `errors` (uncaught JS errors) and `warnings`
 *   (browser console warning messages) collected during page load.
 */
async function openEditorWithReactFlow(
  page: Page,
): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  page.on("pageerror", (err) => {
    errors.push(err.message);
  });

  page.on("console", (msg) => {
    if (msg.type() === "warning" || msg.type() === "error") {
      warnings.push(msg.text());
    }
  });

  await page.goto("/?renderer=react-flow");
  await page.waitForSelector("sw-editor", { state: "attached" });

  return { errors, warnings };
}

/**
 * Asserts that none of the {@link FORBIDDEN_WARNING_PATTERNS} appear in the
 * collected console messages.
 *
 * @param warnings - Console warning/error strings collected during the test.
 */
function assertNoForbiddenWarnings(warnings: string[]): void {
  for (const { label, substring } of FORBIDDEN_WARNING_PATTERNS) {
    const matched = warnings.filter((w) => w.includes(substring));
    expect(
      matched,
      `${label} must not appear in console. Matched messages: ${matched.join("; ")}`,
    ).toHaveLength(0);
  }
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
   * `sw-editor` custom element and produces no uncaught JavaScript errors or
   * known runtime warnings (Lit dev-mode, React Flow styles, node type misses).
   */
  test("loads without uncaught JavaScript errors", async ({ page }) => {
    const { errors, warnings } = await openEditorWithReactFlow(page);

    expect(errors, `Unexpected uncaught JS errors on load: ${errors.join("; ")}`).toHaveLength(0);

    assertNoForbiddenWarnings(warnings);

    await expect(page.locator("sw-editor")).toBeAttached();
  });

  /**
   * Verifies that inserting a task via the affordance UI causes a
   * `[data-testid="graph-node"]` marker to become visible, confirming that
   * the React Flow renderer backend processes the graph update correctly and
   * that no runtime warnings appear after the update.
   */
  test("graph node is visible after task insert", async ({ page }) => {
    const { errors, warnings } = await openEditorWithReactFlow(page);

    await insertFirstTask(page);

    await expect(page.locator('[data-testid="graph-node"]').first()).toBeVisible();

    expect(
      errors,
      `Unexpected uncaught JS errors after task insert: ${errors.join("; ")}`,
    ).toHaveLength(0);

    assertNoForbiddenWarnings(warnings);
  });
});
