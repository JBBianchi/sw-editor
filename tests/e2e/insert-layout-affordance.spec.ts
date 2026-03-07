/**
 * End-to-end tests for the insertion layout affordance (US2).
 *
 * Verifies that the `+` insertion button is:
 *
 * - Visually positioned at the edge midpoint (within 6px tolerance).
 * - Correctly repositioned after pan/zoom viewport transformations.
 * - Keyboard-operable (Tab to focus, Enter/Space to activate).
 *
 * Constitutional gate: NFR-001 — Accessibility baseline is mandatory for all
 * core flows.
 *
 * @module
 */

import { expect, type Page, test } from "@playwright/test";

import {
  assertAffordanceWithinTolerance,
  assertAllAffordancesWithinTolerance,
  getInsertionEdgeIds,
  panAndZoom,
} from "./insert-geometry.helpers";

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
const TASK_MENU_SELECTOR = '[role="menu"][aria-label="Select task type to insert"]';

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
// 1. Midpoint positioning
// ---------------------------------------------------------------------------

test.describe("Insertion affordance — midpoint positioning (US2, SC-002)", () => {
    test.beforeEach(async ({ page }) => {
      await openEditor(page);
      await createNewWorkflow(page);
    });

    test("'+' button is positioned within 6px of the edge midpoint", async ({ page }) => {
      const edgeIds = await getInsertionEdgeIds(page);
      expect(edgeIds.length, "At least one insertion affordance edge should exist").toBeGreaterThan(0);

      await assertAffordanceWithinTolerance(page, edgeIds[0]);
    });

    test("all insertion affordances are within 6px of their edge midpoints", async ({ page }) => {
      await assertAllAffordancesWithinTolerance(page);
    });
  });

// ---------------------------------------------------------------------------
// 2. Position stability after pan/zoom
// ---------------------------------------------------------------------------

test.describe("Insertion affordance — position after pan/zoom (US2)", () => {
    test.beforeEach(async ({ page }) => {
      await openEditor(page);
      await createNewWorkflow(page);
    });

    test("affordance remains within 6px of edge midpoint after pan", async ({ page }) => {
      await panAndZoom(page, { dx: 100, dy: 50 }, 1);
      await assertAllAffordancesWithinTolerance(page);
    });

    test("affordance remains within 6px of edge midpoint after zoom", async ({ page }) => {
      await panAndZoom(page, { dx: 0, dy: 0 }, 2);
      await assertAllAffordancesWithinTolerance(page);
    });

    test("affordance remains within 6px of edge midpoint after pan and zoom combined", async ({
      page,
    }) => {
      await panAndZoom(page, { dx: -80, dy: 60 }, 1.5);
      await assertAllAffordancesWithinTolerance(page);
    });
  });

// ---------------------------------------------------------------------------
// 3. Keyboard operability
// ---------------------------------------------------------------------------

test.describe("Insertion affordance — keyboard operability (US2)", () => {
    test.beforeEach(async ({ page }) => {
      await openEditor(page);
      await createNewWorkflow(page);
    });

    test("insertion affordance is reachable via Tab navigation", async ({ page }) => {
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

    test("Enter key activates the insertion menu from focused affordance", async ({ page }) => {
      const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
      await affordance.focus();
      await expect(affordance).toBeFocused();

      await affordance.press("Enter");

      const menu = page.locator(TASK_MENU_SELECTOR);
      await expect(menu).toBeVisible();
    });

    test("Space key activates the insertion menu from focused affordance", async ({ page }) => {
      const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
      await affordance.focus();
      await expect(affordance).toBeFocused();

      await affordance.press(" ");

      const menu = page.locator(TASK_MENU_SELECTOR);
      await expect(menu).toBeVisible();
    });

    test("Escape closes the menu and returns focus to the affordance", async ({ page }) => {
      const affordance = page.locator(INSERTION_BUTTON_SELECTOR).first();
      await affordance.press("Enter");

      const menu = page.locator(TASK_MENU_SELECTOR);
      await expect(menu).toBeVisible();

      await page.keyboard.press("Escape");

      await expect(menu).not.toBeVisible();
      await expect(affordance).toBeFocused();
    });

    test("keyboard-activated insertion completes without mouse interaction", async ({ page }) => {
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
  });
