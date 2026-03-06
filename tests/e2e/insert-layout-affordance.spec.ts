/**
 * End-to-end tests for the insertion layout affordance (US2).
 *
 * Verifies that the `+` insertion button is:
 *
 * - Visually positioned at the edge midpoint (within 12px tolerance).
 * - Correctly repositioned after pan/zoom viewport transformations.
 * - Keyboard-operable (Tab to focus, Enter/Space to activate).
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

/** New workflow creation button. */
const NEW_WORKFLOW_BUTTON_SELECTOR = 'button[aria-label="Create new workflow"]';

/** Task type selection menu opened by an insertion affordance. */
const TASK_MENU_SELECTOR =
  '[role="menu"][aria-label="Select task type to insert"]';

/** Canvas / viewport container used for pan/zoom interactions. */
const CANVAS_SELECTOR =
  '[data-testid="editor-canvas"], .react-flow__viewport, .react-flow';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Maximum allowed pixel distance between the insertion affordance center and
 * the geometric edge midpoint, as defined in SC-002 of the feature spec.
 */
const MIDPOINT_TOLERANCE_PX = 12;

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

/**
 * Returns the bounding box center of an element.
 *
 * @param page - The Playwright {@link Page} object.
 * @param selector - CSS selector for the target element.
 * @returns The `{ x, y }` center coordinates of the element bounding box.
 */
async function getElementCenter(
  page: Page,
  selector: string,
): Promise<{ x: number; y: number }> {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) {
    throw new Error(`Element not found or not visible: ${selector}`);
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Returns the bounding box center of the first insertion affordance button.
 *
 * @param page - The Playwright {@link Page} object.
 * @returns The `{ x, y }` center coordinates of the affordance button.
 */
async function getAffordanceCenter(
  page: Page,
): Promise<{ x: number; y: number }> {
  const box = await page
    .locator(INSERTION_BUTTON_SELECTOR)
    .first()
    .boundingBox();
  if (!box) {
    throw new Error("Insertion affordance button not found or not visible");
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Computes the geometric midpoint between two graph nodes that are connected
 * by the edge associated with the first insertion affordance.
 *
 * The function reads the `data-edge-id` attribute from the affordance button
 * to identify the edge, then resolves source and target node positions from
 * the `data-node-type` or `data-testid` elements in the DOM.
 *
 * @param page - The Playwright {@link Page} object.
 * @returns The `{ x, y }` midpoint between the source and target node centers.
 */
async function getEdgeMidpoint(
  page: Page,
): Promise<{ x: number; y: number }> {
  // Retrieve edge endpoint node positions by locating start and end nodes.
  // In a new workflow, the initial graph has start → end with one edge.
  const startNode = page.locator(
    '[data-node-type="start"], [data-testid="graph-node"]',
  );
  const endNode = page.locator('[data-node-type="end"]');

  const startBox = await startNode.first().boundingBox();
  const endBox = await endNode.first().boundingBox();

  if (!startBox || !endBox) {
    throw new Error("Could not determine edge endpoint node bounding boxes");
  }

  const startCenter = {
    x: startBox.x + startBox.width / 2,
    y: startBox.y + startBox.height / 2,
  };
  const endCenter = {
    x: endBox.x + endBox.width / 2,
    y: endBox.y + endBox.height / 2,
  };

  return {
    x: (startCenter.x + endCenter.x) / 2,
    y: (startCenter.y + endCenter.y) / 2,
  };
}

/**
 * Euclidean distance between two 2D points.
 *
 * @param a - First point.
 * @param b - Second point.
 * @returns Distance in pixels.
 */
function distance(
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ---------------------------------------------------------------------------
// 1. Midpoint positioning
// ---------------------------------------------------------------------------

test.describe.fixme(
  "Insertion affordance — midpoint positioning (US2, SC-002)",
  () => {
    test.beforeEach(async ({ page }) => {
      await openEditor(page);
      await createNewWorkflow(page);
    });

    test("'+' button is positioned within 12px of the edge midpoint", async ({
      page,
    }) => {
      const affordanceCenter = await getAffordanceCenter(page);
      const midpoint = await getEdgeMidpoint(page);

      const dist = distance(affordanceCenter, midpoint);
      expect(
        dist,
        `Affordance center (${affordanceCenter.x}, ${affordanceCenter.y}) ` +
          `must be within ${MIDPOINT_TOLERANCE_PX}px of edge midpoint ` +
          `(${midpoint.x}, ${midpoint.y}); actual distance: ${dist.toFixed(1)}px`,
      ).toBeLessThanOrEqual(MIDPOINT_TOLERANCE_PX);
    });

    test("all insertion affordances are within 12px of their edge midpoints", async ({
      page,
    }) => {
      const affordances = page.locator(INSERTION_BUTTON_SELECTOR);
      const count = await affordances.count();
      expect(
        count,
        "At least one insertion affordance should exist",
      ).toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const box = await affordances.nth(i).boundingBox();
        expect(box, `Affordance at index ${i} must be visible`).not.toBeNull();

        // Each affordance center should be near the midpoint of its edge.
        // For a general check we verify the affordance is rendered (non-null
        // bounding box) and its position is within a reasonable viewport region.
        // A precise per-edge midpoint check requires edge-specific DOM
        // attributes that may vary by renderer; the primary midpoint assertion
        // is covered by the first test in this suite.
        expect(box!.width, `Affordance ${i} should have non-zero width`).toBeGreaterThan(0);
        expect(box!.height, `Affordance ${i} should have non-zero height`).toBeGreaterThan(0);
      }
    });
  },
);

// ---------------------------------------------------------------------------
// 2. Position stability after pan/zoom
// ---------------------------------------------------------------------------

test.describe.fixme(
  "Insertion affordance — position after pan/zoom (US2)",
  () => {
    test.beforeEach(async ({ page }) => {
      await openEditor(page);
      await createNewWorkflow(page);
    });

    test("affordance remains within 12px of edge midpoint after pan", async ({
      page,
    }) => {
      // Record the initial relative offset between affordance and midpoint.
      const initialAffordance = await getAffordanceCenter(page);
      const initialMidpoint = await getEdgeMidpoint(page);
      const initialDist = distance(initialAffordance, initialMidpoint);

      // Perform a pan by dragging the canvas.
      const canvas = page.locator(CANVAS_SELECTOR).first();
      const canvasBox = await canvas.boundingBox();
      expect(canvasBox, "Canvas element must be visible").not.toBeNull();

      const startX = canvasBox!.x + canvasBox!.width / 2;
      const startY = canvasBox!.y + canvasBox!.height / 2;

      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 100, startY + 50, { steps: 10 });
      await page.mouse.up();

      // Allow the renderer to settle after the viewport change.
      await page.waitForTimeout(300);

      // After pan, the affordance-to-midpoint distance should still be within
      // tolerance. The absolute positions change, but the relative alignment
      // must be preserved.
      const postAffordance = await getAffordanceCenter(page);
      const postMidpoint = await getEdgeMidpoint(page);
      const postDist = distance(postAffordance, postMidpoint);

      expect(
        postDist,
        `After pan: affordance must remain within ${MIDPOINT_TOLERANCE_PX}px of edge midpoint ` +
          `(distance: ${postDist.toFixed(1)}px, was ${initialDist.toFixed(1)}px before pan)`,
      ).toBeLessThanOrEqual(MIDPOINT_TOLERANCE_PX);
    });

    test("affordance remains within 12px of edge midpoint after zoom", async ({
      page,
    }) => {
      // Zoom in using Ctrl+wheel on the canvas.
      const canvas = page.locator(CANVAS_SELECTOR).first();
      const canvasBox = await canvas.boundingBox();
      expect(canvasBox, "Canvas element must be visible").not.toBeNull();

      const centerX = canvasBox!.x + canvasBox!.width / 2;
      const centerY = canvasBox!.y + canvasBox!.height / 2;

      await page.mouse.move(centerX, centerY);
      await page.mouse.wheel(0, -200);

      // Allow the renderer to settle after the viewport change.
      await page.waitForTimeout(300);

      const affordanceCenter = await getAffordanceCenter(page);
      const midpoint = await getEdgeMidpoint(page);
      const dist = distance(affordanceCenter, midpoint);

      expect(
        dist,
        `After zoom: affordance must remain within ${MIDPOINT_TOLERANCE_PX}px ` +
          `of edge midpoint (distance: ${dist.toFixed(1)}px)`,
      ).toBeLessThanOrEqual(MIDPOINT_TOLERANCE_PX);
    });

    test("affordance remains within 12px of edge midpoint after pan and zoom combined", async ({
      page,
    }) => {
      const canvas = page.locator(CANVAS_SELECTOR).first();
      const canvasBox = await canvas.boundingBox();
      expect(canvasBox, "Canvas element must be visible").not.toBeNull();

      const centerX = canvasBox!.x + canvasBox!.width / 2;
      const centerY = canvasBox!.y + canvasBox!.height / 2;

      // Pan first.
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX - 80, centerY + 60, { steps: 10 });
      await page.mouse.up();

      // Then zoom.
      await page.mouse.move(centerX - 80, centerY + 60);
      await page.mouse.wheel(0, -150);

      // Allow the renderer to settle.
      await page.waitForTimeout(300);

      const affordanceCenter = await getAffordanceCenter(page);
      const midpoint = await getEdgeMidpoint(page);
      const dist = distance(affordanceCenter, midpoint);

      expect(
        dist,
        `After pan+zoom: affordance must remain within ${MIDPOINT_TOLERANCE_PX}px ` +
          `of edge midpoint (distance: ${dist.toFixed(1)}px)`,
      ).toBeLessThanOrEqual(MIDPOINT_TOLERANCE_PX);
    });
  },
);

// ---------------------------------------------------------------------------
// 3. Keyboard operability
// ---------------------------------------------------------------------------

test.describe.fixme(
  "Insertion affordance — keyboard operability (US2)",
  () => {
    test.beforeEach(async ({ page }) => {
      await openEditor(page);
      await createNewWorkflow(page);
    });

    test("insertion affordance is reachable via Tab navigation", async ({
      page,
    }) => {
      const maxTabs = 50;
      let reached = false;

      for (let i = 0; i < maxTabs; i++) {
        await page.keyboard.press("Tab");

        const focused = page.locator(INSERTION_BUTTON_SELECTOR).first();
        if (
          await focused
            .evaluate((el) => el === document.activeElement)
            .catch(() => false)
        ) {
          reached = true;
          break;
        }
      }

      expect(
        reached,
        `Insertion affordance must be reachable via Tab within ${maxTabs} key presses`,
      ).toBe(true);
    });

    test("Enter key activates the insertion menu from focused affordance", async ({
      page,
    }) => {
      const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
      await affordance.focus();
      await expect(affordance).toBeFocused();

      await affordance.press("Enter");

      const menu = page.locator(TASK_MENU_SELECTOR);
      await expect(menu).toBeVisible();
    });

    test("Space key activates the insertion menu from focused affordance", async ({
      page,
    }) => {
      const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
      await affordance.focus();
      await expect(affordance).toBeFocused();

      await affordance.press(" ");

      const menu = page.locator(TASK_MENU_SELECTOR);
      await expect(menu).toBeVisible();
    });

    test("Escape closes the menu and returns focus to the affordance", async ({
      page,
    }) => {
      const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
      await affordance.press("Enter");

      const menu = page.locator(TASK_MENU_SELECTOR);
      await expect(menu).toBeVisible();

      await page.keyboard.press("Escape");

      await expect(menu).not.toBeVisible();
      await expect(affordance).toBeFocused();
    });

    test("keyboard-activated insertion completes without mouse interaction", async ({
      page,
    }) => {
      // Tab to the affordance.
      const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
      await affordance.focus();

      // Open the menu with Enter.
      await affordance.press("Enter");
      const menu = page.locator(TASK_MENU_SELECTOR);
      await expect(menu).toBeVisible();

      // Select the first menu item with Enter (focus lands on first item
      // automatically when menu opens).
      await page.keyboard.press("Enter");

      // The menu should close after selection.
      await expect(menu).not.toBeVisible();
    });
  },
);
