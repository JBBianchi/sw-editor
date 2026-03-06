/**
 * End-to-end tests for insertion layout ordering (US1).
 *
 * Verifies that inserting a node via the `+` affordance on a graph edge places
 * the new task node visually and structurally between its predecessor and
 * successor. Covers:
 *
 * - **Basic insertion ordering**: A single insertion via the edge affordance
 *   results in the new task node appearing in the graph between the original
 *   start and end nodes.
 * - **DOM order**: The `[data-testid="graph-node"]` markers reflect the
 *   expected layout sequence after insertion.
 * - **Sequential insertions**: Multiple insertions produce nodes in the
 *   expected order.
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
const TASK_MENU_SELECTOR =
  '[role="menu"][aria-label="Select task type to insert"]';

/** Individual task type entries within the open menu. */
const TASK_MENU_ITEM_SELECTOR = '[role="menuitem"]';

/** Graph node marker elements created after insertion. */
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
  await newWorkflowBtn.press("Enter");
}

/**
 * Inserts a task by clicking the nth insertion affordance and selecting a menu
 * item at the given index.
 *
 * @param page - The Playwright {@link Page} object.
 * @param affordanceIndex - Zero-based index of the insertion affordance to activate.
 * @param menuItemIndex - Zero-based index of the task type menu item to select.
 */
async function insertTaskViaAffordance(
  page: Page,
  affordanceIndex: number,
  menuItemIndex: number,
): Promise<void> {
  const affordance = page
    .locator(INSERTION_BUTTON_SELECTOR)
    .nth(affordanceIndex);
  await affordance.press("Enter");

  await expect(page.locator(TASK_MENU_SELECTOR)).toBeVisible();

  const item = page.locator(TASK_MENU_ITEM_SELECTOR).nth(menuItemIndex);
  await item.press("Enter");

  // Wait for the menu to close, indicating insertion completed.
  await expect(page.locator(TASK_MENU_SELECTOR)).not.toBeVisible();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Insertion layout ordering (US1)", () => {
  test.beforeEach(async ({ page }) => {
    await openEditor(page);
    await createNewWorkflow(page);
  });

  test("inserted node appears in the graph between predecessor and successor", async ({
    page,
  }) => {
    // Before insertion: the bootstrapped graph has start → end with one edge
    // and one insertion affordance. No task nodes exist yet.
    await expect(page.locator(GRAPH_NODE_SELECTOR)).toHaveCount(0);

    // Insert a task via the first (and only) affordance.
    await insertTaskViaAffordance(page, 0, 0);

    // After insertion: exactly one task node marker should be present.
    const taskNodes = page.locator(GRAPH_NODE_SELECTOR);
    await expect(taskNodes).toHaveCount(1);

    // The inserted node should carry a data-node-id attribute, confirming it
    // was placed into the graph structure.
    const nodeId = await taskNodes.first().getAttribute("data-node-id");
    expect(nodeId, "Inserted node must have a data-node-id").toBeTruthy();
  });

  test("two insertion affordances exist after inserting one task (before and after)", async ({
    page,
  }) => {
    // Insert the first task.
    await insertTaskViaAffordance(page, 0, 0);

    // After splitting the single start→end edge, the graph now has two edges:
    // start→task and task→end, each with its own affordance.
    const affordances = page.locator(INSERTION_BUTTON_SELECTOR);
    await expect(affordances).toHaveCount(2);
  });

  test("DOM order of graph-node markers matches insertion sequence", async ({
    page,
  }) => {
    // Insert first task (Call Task — index 0 in menu) on the start→end edge.
    await insertTaskViaAffordance(page, 0, 0);

    // Now two affordances exist. Insert a second task on the second affordance
    // (the edge between the first inserted task and end), choosing a different
    // task type (Do Task — index 1 in menu).
    await insertTaskViaAffordance(page, 1, 1);

    // After two insertions the graph should have two task node markers.
    const taskNodes = page.locator(GRAPH_NODE_SELECTOR);
    await expect(taskNodes).toHaveCount(2);

    // The first marker in DOM order should be the first inserted task (call),
    // and the second should be the second inserted task (do).
    const firstNodeText = await taskNodes.nth(0).textContent();
    const secondNodeText = await taskNodes.nth(1).textContent();

    expect(firstNodeText).toBe("call");
    expect(secondNodeText).toBe("do");
  });

  test("inserting before an existing task places new node earlier in DOM order", async ({
    page,
  }) => {
    // Insert a task on the start→end edge (becomes the only task node).
    await insertTaskViaAffordance(page, 0, 1); // Do Task

    // Now insert on the first affordance (start→doTask edge), placing a new
    // node before the existing task.
    await insertTaskViaAffordance(page, 0, 0); // Call Task

    const taskNodes = page.locator(GRAPH_NODE_SELECTOR);
    await expect(taskNodes).toHaveCount(2);

    // The call task (inserted second, but on the earlier edge) should appear
    // first in DOM order, followed by the do task.
    const firstNodeText = await taskNodes.nth(0).textContent();
    const secondNodeText = await taskNodes.nth(1).textContent();

    expect(firstNodeText).toBe("call");
    expect(secondNodeText).toBe("do");
  });
});
